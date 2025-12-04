"use client"
import React, { useState, useCallback, useRef } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Clock, MapPin, Users, Star, Heart, Share2, Calendar, Check, Sparkles, AlertCircle } from "lucide-react"
import WorkshopBookingPanel from "@/components/workshops/workshop-booking-panel"
import ServicePractitioner from "@/components/shared/service-practitioner"
import PractitionerSpotlight from "@/components/services/practitioner-spotlight"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery, useMutation } from "@tanstack/react-query"
import { publicServicesBySlugRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { userAddFavoriteService, userRemoveFavoriteService } from "@/src/client/sdk.gen"
import { toast } from "sonner"
import { useUserFavoriteServices } from "@/hooks/use-user-favorite-services"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function WorkshopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const bookingPanelRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoriteServiceIds, refetch: refetchFavorites } = useUserFavoriteServices()
  
  // Fetch workshop data from API using slug
  const { data: serviceData, isLoading, error } = useQuery({
    ...publicServicesBySlugRetrieveOptions({ path: { slug } }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Get upcoming sessions and calculate spots remaining
  const upcomingSessions = (serviceData?.sessions || [])
    .filter((session: any) => new Date(session.start_time) > new Date() && session.is_published !== false)
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Use the first upcoming session's spots or the minimum across all sessions
  const spotsRemaining = upcomingSessions.length > 0
    ? upcomingSessions[0].spots_available ?? 0
    : 0

  // Transform API data to component format
  const workshop = serviceData ? {
    id: serviceData.id,
    title: serviceData.name || 'Workshop',
    description: serviceData.short_description || serviceData.description || 'A transformative workshop experience.',
    image: serviceData.image_url || serviceData.featured_image || '/workshop-image-1.jpg',
    startTime: serviceData.start_time || "9:00 AM",
    endTime: serviceData.end_time || "5:00 PM",
    duration: serviceData.duration_minutes || 480,
    location: serviceData.location_type === 'virtual' ? 'Virtual' : serviceData.location_type === 'hybrid' ? 'Hybrid (In-person & Online)' : 'In-person',
    venue: serviceData.venue_name || 'Workshop Center',
    address: serviceData.venue_address || serviceData.location || 'Location TBD',
    capacity: serviceData.max_participants || serviceData.capacity || 20,
    spotsRemaining: spotsRemaining,
    experienceLevel: serviceData.experience_level || 'all-levels',
    price: serviceData.price_cents ? Math.floor(serviceData.price_cents / 100) : 0,
    nextSessionDate: serviceData.next_session_date,
    firstSessionDate: serviceData.first_session_date,
    lastSessionDate: serviceData.last_session_date,
    categories: serviceData.categories?.map(c => c.name) || serviceData.category ? [serviceData.category.name] : ['Workshop'],
    modalities: Array.isArray(serviceData.modalities) ? serviceData.modalities : [],
    practitioners: serviceData.instructors || (serviceData.practitioner || serviceData.primary_practitioner) ? [{
      id: (serviceData.practitioner?.public_uuid || serviceData.practitioner?.id || serviceData.primary_practitioner?.public_uuid || serviceData.primary_practitioner?.id),
      slug: (serviceData.practitioner?.slug || serviceData.primary_practitioner?.slug),
      name: (serviceData.practitioner?.display_name || serviceData.primary_practitioner?.display_name || 'Workshop Leader'),
      image: (serviceData.practitioner?.profile_image_url || serviceData.primary_practitioner?.profile_image_url || '/practitioner-1.jpg'),
      title: (serviceData.practitioner?.title || serviceData.primary_practitioner?.title || 'Workshop Facilitator'),
      bio: (serviceData.practitioner?.bio || serviceData.primary_practitioner?.bio || 'An experienced facilitator dedicated to your transformation.'),
    }] : [],
    agendaItems: Array.isArray(serviceData.agenda_items) ? serviceData.agenda_items : [],
    benefits: Array.isArray(serviceData.benefits) ? serviceData.benefits : [],
    includes: Array.isArray(serviceData.includes) ? serviceData.includes : [],
    dates: upcomingSessions.map((session: any) => ({
      id: session.id,
      date: new Date(session.start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      startTime: new Date(session.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      endTime: new Date(session.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      spotsRemaining: session.spots_available ?? 0,
    })),
  } : null

  // Get the service ID for API calls
  const serviceId = serviceData?.id
  const isSaved = serviceId ? favoriteServiceIds.has(serviceId.toString()) : false
  
  // Mutations for save/unsave
  const { mutate: addFavorite, isPending: isAddingFavorite } = useMutation({
    mutationFn: () => userAddFavoriteService({ body: { service_id: serviceId } }),
    onSuccess: () => {
      toast.success("Workshop saved to favorites")
      refetchFavorites()
    },
    onError: () => {
      toast.error("Failed to save workshop")
    },
  })

  const { mutate: removeFavorite, isPending: isRemovingFavorite } = useMutation({
    mutationFn: () => userRemoveFavoriteService({ path: { service_id: serviceId } }),
    onSuccess: () => {
      toast.success("Workshop removed from favorites")
      refetchFavorites()
    },
    onError: () => {
      toast.error("Failed to remove workshop")
    },
  })

  const handleSaveToggle = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/workshops/${slug}`,
        title: "Sign in Required",
        description: "Please sign in to save this workshop to your favorites"
      })
      return
    }

    if (isSaved) {
      removeFavorite()
    } else {
      addFavorite()
    }
  }

  const isProcessing = isAddingFavorite || isRemovingFavorite

  // Scroll to booking panel
  const scrollToBooking = useCallback(() => {
    bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <section className="relative min-h-[85vh] bg-gradient-to-b from-sage-50 via-terracotta-50 to-cream-50">
          <div className="relative container max-w-7xl py-12">
            <Skeleton className="h-6 w-96 mb-12" />
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-8">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-12 w-32" />
                </div>
              </div>
              <Skeleton className="aspect-[4/5] rounded-3xl" />
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Alert className="border-red-200 bg-red-50 max-w-md">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load workshop details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!workshop) {
    notFound()
  }

  // Transform the data to match our immersive design needs
  const transformedWorkshop = {
    ...workshop,
    longDescription: workshop.description,
    totalHours: Math.floor(workshop.duration / 60),
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[85vh] bg-gradient-to-b from-sage-50 via-terracotta-50 to-cream-50 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 texture-grain opacity-25" />
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-blush-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-60 w-[700px] h-[700px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-terracotta-100/20 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative container max-w-7xl py-12">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-12 animate-fade-in">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace">Explore Wellness</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace/workshops">Workshops</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-900 font-medium">{workshop.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-slide-up">
              {/* Workshop Label & Modalities */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3 bg-sage-100 px-5 py-3 rounded-full">
                  <Sparkles className="h-5 w-5 text-sage-600 animate-pulse" strokeWidth="1.5" />
                  <span className="text-sage-800 font-medium">
                    {workshop.location === 'In-person' ? 'In-Person Experience' : workshop.location} • Limited Spots
                  </span>
                </div>
                {workshop.modalities && workshop.modalities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {workshop.modalities.map((modality: { id: number; name: string; slug: string }) => (
                      <Badge key={modality.id} variant="sage" className="px-3 py-1">
                        {modality.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-olive-900 mb-6 leading-[1.1]">
                  {workshop.title}
                </h1>
                <p className="text-xl lg:text-2xl text-olive-700 leading-relaxed font-light">
                  {workshop.description}
                </p>
              </div>
              
              {/* Workshop Stats */}
              <div className="flex flex-wrap items-center gap-6 lg:gap-10">
                <div className="text-center lg:text-left">
                  <p className="text-4xl font-bold text-olive-900">{transformedWorkshop.totalHours}</p>
                  <p className="text-olive-600">Hours of Learning</p>
                </div>
                <div className="w-px h-12 bg-sage-300 hidden lg:block" />
                <div className="text-center lg:text-left">
                  <p className="text-4xl font-bold text-terracotta-600">{workshop.spotsRemaining}</p>
                  <p className="text-olive-600">Spots Remaining</p>
                </div>
                <div className="w-px h-12 bg-sage-300 hidden lg:block" />
                <div className="text-center lg:text-left">
                  <p className="text-4xl font-bold text-olive-900">{workshop.capacity}</p>
                  <p className="text-olive-600">Max Participants</p>
                </div>
              </div>
              
              {/* Key Details */}
              <div className="bg-cream-100 rounded-2xl p-6 space-y-3">
                {workshop.nextSessionDate && (
                  <div className="flex items-center gap-3 text-olive-700">
                    <Calendar className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                    <span className="font-medium">
                      Next Date: {new Date(workshop.nextSessionDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-olive-700">
                  <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                  <span className="font-medium">
                    {workshop.nextSessionDate && upcomingSessions.length > 0
                      ? `${new Date(upcomingSessions[0].start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(upcomingSessions[0].end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      : `${workshop.startTime} - ${workshop.endTime}`
                    }
                  </span>
                </div>
              </div>
              
              {/* CTA Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="shadow-xl hover:shadow-2xl px-8" onClick={scrollToBooking}>
                    Reserve Your Spot - ${workshop.price}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="group"
                    onClick={handleSaveToggle}
                    disabled={isProcessing}
                  >
                    <Heart 
                      className={`h-5 w-5 mr-2 transition-colors ${
                        isSaved 
                          ? 'text-rose-500 fill-rose-500' 
                          : 'group-hover:text-rose-500'
                      }`} 
                      strokeWidth="1.5" 
                    />
                    {isSaved ? 'Saved' : 'Save Workshop'}
                  </Button>
                </div>
                <p className="text-sm text-olive-600">
                  ✓ Small group size • ✓ All materials included • ✓ 100% satisfaction guarantee
                </p>
              </div>
            </div>
            
            {/* Right: Visual Element */}
            <div className="relative animate-scale-in">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-sage-100 to-blush-100 shadow-2xl">
                {workshop.image ? (
                  <img
                    src={workshop.image}
                    alt={workshop.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sage-300 to-terracotta-300 mx-auto flex items-center justify-center">
                        <Sparkles className="h-16 w-16 text-white" strokeWidth="1" />
                      </div>
                      <p className="text-xl text-sage-700 font-medium">Transform Your Journey</p>
                    </div>
                  </div>
                )}
                
                {/* Floating elements */}
                <div className="absolute top-6 right-6 bg-terracotta-500 text-white px-4 py-2 rounded-full font-medium shadow-lg">
                  Only {workshop.spotsRemaining} spots left!
                </div>
                
                {/* Floating facilitator preview */}
                <div className="absolute bottom-6 left-6 right-6 bg-cream-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <p className="text-sm text-olive-600 mb-3">Your Lead Facilitator</p>
                  <div className="flex items-center gap-4">
                    {workshop.practitioners[0].image ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                        <img
                          src={workshop.practitioners[0].image}
                          alt={workshop.practitioners[0].name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-terracotta-300 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {workshop.practitioners[0].name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-olive-900">{workshop.practitioners[0].name}</p>
                      <p className="text-sm text-olive-600">{workshop.practitioners[0].title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-7xl py-20">
        {/* Quick Actions - Floating */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 opacity-0 lg:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-cream-50/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
          >
            <Share2 className="h-4 w-4" strokeWidth="1.5" />
          </Button>
        </div>

        <div className="grid gap-16 lg:grid-cols-3">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-20">
            {/* Workshop Overview - Immersive */}
            <section className="animate-fade-in">
              <h2 className="text-3xl font-bold text-olive-900 mb-8">Your Transformation Awaits</h2>
              <div className="prose prose-lg prose-olive max-w-none">
                <p className="text-lg text-olive-700 leading-relaxed whitespace-pre-line">
                  {transformedWorkshop.longDescription}
                </p>
              </div>
            </section>

            {/* Benefits */}
            {workshop.benefits && workshop.benefits.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">What You'll Gain</h2>
                <div className="grid gap-4">
                  {workshop.benefits.map((benefit: any, index: number) => (
                    <div key={benefit.id || index} className="bg-gradient-to-r from-sage-50 to-terracotta-50 rounded-2xl p-6 card-hover">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                            <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-olive-900 mb-1">{benefit.title}</h3>
                          <p className="text-olive-700 leading-relaxed text-sm">{benefit.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Workshop Agenda */}
            {workshop.agendaItems && workshop.agendaItems.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.4s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">Workshop Agenda</h2>
                <Card className="border-2 border-sage-200 overflow-hidden">
                  <CardContent className="p-6 bg-cream-50">
                    <div className="space-y-4">
                      {workshop.agendaItems.map((item: any, index: number) => (
                        <div key={item.id || index} className="flex gap-4 items-start group">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-sage-700">{index + 1}</span>
                          </div>
                          <div className="flex-1 pb-4 border-b border-sage-100 last:border-0 last:pb-0">
                            <h4 className="text-olive-800 font-medium mb-1">{item.title}</h4>
                            {item.description && (
                              <p className="text-olive-600 text-sm">{item.description}</p>
                            )}
                            {item.duration_minutes && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {item.duration_minutes} min
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* What's Included */}
            {workshop.includes && workshop.includes.length > 0 && (
              <section className="bg-gradient-to-br from-blush-50 to-sage-50 rounded-3xl p-10 -mx-4 animate-fade-in" style={{animationDelay: '0.6s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">What's Included</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {workshop.includes.map((item: string, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-sage-400 to-terracotta-400" />
                        </div>
                      </div>
                      <p className="text-olive-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Workshop Facilitators */}
            {workshop.practitioners && workshop.practitioners.length > 0 && (
              <PractitionerSpotlight
                practitioners={workshop.practitioners}
                role="facilitator"
                animationDelay="0.8s"
              />
            )}

            {/* Success Stories */}
            <section className="animate-fade-in" style={{animationDelay: '1s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Transformative Experiences</h2>
              <div className="grid gap-6">
                <Card className="border-2 border-sage-100 bg-cream-100">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-6 w-6 text-terracotta-500 fill-terracotta-500" />
                      ))}
                    </div>
                    <blockquote className="text-xl text-olive-700 italic mb-6">
                      "This workshop completely shifted my perspective. The combination of expert guidance and supportive community created the perfect environment for growth."
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sage-300 to-blush-300 flex items-center justify-center">
                        <span className="text-white font-bold">MR</span>
                      </div>
                      <div>
                        <p className="font-semibold text-olive-900">Maria Rodriguez</p>
                        <p className="text-sm text-olive-600">Workshop Participant • Verified Review</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>

          {/* Right Column - Sticky Booking Panel */}
          <div className="space-y-8" ref={bookingPanelRef}>
            <div className="lg:sticky lg:top-24">
              <WorkshopBookingPanel workshop={transformedWorkshop} serviceData={serviceData} />
              
              {/* Trust Indicators */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Small group size (max {workshop.capacity})</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">All materials & resources included</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">100% satisfaction guarantee</span>
                </div>
              </div>
              
              {/* Urgency Card */}
              {workshop.spotsRemaining > 0 && (
                <Card className="mt-6 border-2 border-terracotta-200 bg-terracotta-50">
                  <CardContent className="p-6 text-center">
                    <Sparkles className="h-8 w-8 text-terracotta-600 mx-auto mb-3" strokeWidth="1.5" />
                    <h3 className="font-semibold text-olive-900 mb-2">Limited Availability</h3>
                    <p className="text-sm text-olive-700">
                      Only <span className="font-bold text-terracotta-600">{workshop.spotsRemaining} {workshop.spotsRemaining === 1 ? 'spot' : 'spots'} left</span> for the next session
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
