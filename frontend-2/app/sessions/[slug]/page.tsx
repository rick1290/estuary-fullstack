"use client"
import React, { useState, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Clock, MapPin, User, Star, Heart, Share2, Calendar, Check, AlertCircle } from "lucide-react"
import SessionBookingPanel from "@/components/sessions/session-booking-panel"
import PractitionerSpotlight from "@/components/services/practitioner-spotlight"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
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

export default function SessionDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const [isSaveLoading, setIsSaveLoading] = useState(false)
  const bookingPanelRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoriteServiceIds, refetch: refetchFavorites } = useUserFavoriteServices()
  
  // Fetch session data from API using slug
  const { data: serviceData, isLoading, error } = useQuery({
    ...publicServicesBySlugRetrieveOptions({ path: { slug } }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Use real API data
  const service = serviceData

  // Check if this service is favorited
  const isFavorited = serviceData && favoriteServiceIds.has(serviceData.id?.toString() || serviceData.public_uuid)

  // Handle save for later
  const handleSaveForLater = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        title: "Sign in to Save Services",
        description: "Create an account to save services for later"
      })
      return
    }

    if (!serviceData) return

    setIsSaveLoading(true)
    try {
      if (!isFavorited) {
        // Add to favorites
        await userAddFavoriteService({
          body: {
            service_id: serviceData.id
          }
        })
        toast.success("Service saved for later")
      } else {
        // Remove from favorites
        await userRemoveFavoriteService({
          path: {
            service_id: serviceData.id
          }
        })
        toast.success("Service removed from saved")
      }
      
      // Refetch favorites to update the UI
      await refetchFavorites()
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error("Failed to update saved status")
    } finally {
      setIsSaveLoading(false)
    }
  }, [serviceData, isFavorited, isAuthenticated, openAuthModal, refetchFavorites])

  // Scroll to booking panel
  const scrollToBooking = useCallback(() => {
    bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <section className="relative min-h-[70vh] bg-gradient-to-b from-sage-50 via-cream-100 to-cream-50">
          <div className="relative container max-w-7xl py-12">
            <Skeleton className="h-6 w-96 mb-12" />
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="flex gap-6">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-6 w-40" />
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-36" />
                </div>
              </div>
              <Skeleton className="h-[500px] rounded-3xl" />
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
            Failed to load session details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[70vh] bg-gradient-to-b from-sage-50 via-cream-100 to-cream-50 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 texture-grain opacity-5" />
        
        {/* Decorative blob shapes */}
        <div className="absolute top-20 -right-40 w-96 h-96 bg-terracotta-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-sage-200/20 rounded-full blur-3xl" />
        
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
                  <Link href="/marketplace">Find Your Guide</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace/sessions">Sessions</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-900 font-medium">{service?.name || 'Session'}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-slide-up">
              {/* Categories & Modalities */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {service?.category && (
                    <Badge variant="terracotta" className="text-sm">
                      {service.category.name}
                    </Badge>
                  )}
                  {service?.practitioner_category && (
                    <Badge variant="sage" className="text-sm">
                      {service.practitioner_category.name}
                    </Badge>
                  )}
                  {service?.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {service?.modalities && service.modalities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {service.modalities.map((modality: { id: number; name: string; slug: string }) => (
                      <Badge key={modality.id} variant="sage" className="px-3 py-1">
                        {modality.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-5xl lg:text-6xl font-medium text-olive-900 mb-6 leading-tight">
                  {service?.name || 'Session'}
                </h1>
                <p className="text-xl text-olive-700 leading-relaxed">
                  {service?.short_description || service?.description || ''}
                </p>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-6 text-olive-700">
                {service?.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                    <span className="font-medium">{service.duration_display}</span>
                  </div>
                )}
                {service?.location_type && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                    <span className="font-medium">
                      {service.location_type === 'virtual'
                        ? 'Virtual'
                        : service.practitioner_location?.city_name && service.practitioner_location?.country_name
                          ? `${service.practitioner_location.city_name}, ${service.practitioner_location.country_name}`
                          : service.location_type === 'hybrid' ? 'Hybrid' : 'In Person'}
                    </span>
                  </div>
                )}
                {service?.max_participants === 1 && (
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                    <span className="font-medium">1-on-1 Session</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              {service && service.total_reviews > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-6 w-6 text-terracotta-500 fill-terracotta-500" />
                    <span className="text-2xl font-medium text-olive-900">{service.average_rating?.toFixed(1)}</span>
                  </div>
                  <span className="text-olive-600">({service.total_reviews} {service.total_reviews === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="shadow-lg" onClick={scrollToBooking}>
                  Book Your Session
                </Button>
                <Button 
                  size="lg" 
                  variant="ghost" 
                  className="group"
                  onClick={handleSaveForLater}
                  disabled={isSaveLoading}
                >
                  <Heart 
                    className={`h-5 w-5 mr-2 transition-colors ${
                      isFavorited ? 'fill-rose-500 text-rose-500' : 'group-hover:text-rose-500'
                    }`} 
                    strokeWidth="1.5" 
                  />
                  {isFavorited ? 'Saved' : 'Save for Later'}
                </Button>
              </div>
            </div>
            
            {/* Right: Visual Element */}
            <div className="relative animate-scale-in">
              <div className="relative h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-sage-100 to-terracotta-100 shadow-2xl">
                {service?.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="h-32 w-32 text-sage-300" strokeWidth="1" />
                  </div>
                )}

                {/* Floating elements */}
                {service?.price && (
                  <div className="absolute top-6 right-6 bg-cream-50/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                    <p className="text-sm text-olive-700 mb-1">Starting from</p>
                    <p className="text-3xl font-medium text-olive-900">${service.price}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-7xl py-20">
        {/* Quick Share Actions - Floating */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 opacity-0 lg:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-cream-50/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
          >
            <Share2 className="h-4 w-4" strokeWidth="1.5" />
          </Button>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          {/* Main Content - Left Side */}
          <div className="space-y-20">
            {/* Immersive Overview Section */}
            {service?.description && (
              <section className="animate-fade-in">
                <div className="relative">
                  <h2 className="text-3xl font-medium text-olive-900 mb-8">About This Session</h2>
                  <div className="prose prose-lg prose-olive max-w-none">
                    <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                      {service.description}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* What You'll Learn */}
            {service?.what_youll_learn && (
              <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
                <h2 className="text-3xl font-medium text-olive-900 mb-10">What You'll Learn</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {service.what_youll_learn}
                  </p>
                </div>
              </section>
            )}

            {/* Key Benefits */}
            {service?.benefits && service.benefits.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.3s'}}>
                <h2 className="text-3xl font-medium text-olive-900 mb-10">Key Benefits</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {service.benefits.map((benefit) => (
                    <Card key={benefit.id} className="border-2 border-sage-200 bg-cream-100/30 hover:bg-cream-100/50 transition-colors">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-medium text-olive-900 mb-2">{benefit.title}</h3>
                        <p className="text-olive-700 leading-relaxed">{benefit.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* What's Included */}
            {service?.includes && service.includes.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.35s'}}>
                <h2 className="text-3xl font-medium text-olive-900 mb-8">What's Included</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {service.includes.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth="2" />
                      <span className="text-olive-700 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Prerequisites */}
            {service?.prerequisites && (
              <section className="animate-fade-in" style={{animationDelay: '0.4s'}}>
                <h2 className="text-3xl font-medium text-olive-900 mb-8">Prerequisites</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {service.prerequisites}
                  </p>
                </div>
              </section>
            )}

            {/* Requirements */}
            {service?.requirements && (
              <section className="animate-fade-in" style={{animationDelay: '0.45s'}}>
                <h2 className="text-3xl font-medium text-olive-900 mb-8">Requirements</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {service.requirements}
                  </p>
                </div>
              </section>
            )}

            {/* Practitioner Spotlight */}
            {service?.primary_practitioner && (
              <PractitionerSpotlight
                practitioners={[service.primary_practitioner]}
                role="guide"
                animationDelay="0.6s"
              />
            )}

            {/* Session Details Card */}
            <section className="animate-fade-in" style={{animationDelay: '0.8s'}}>
              <Card className="border-2 border-sage-200 bg-cream-100/50 overflow-hidden">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-medium text-olive-900 mb-6">Session Details</h2>
                  <div className="grid gap-5">
                    {service?.duration_minutes && (
                      <div className="flex justify-between items-center py-4 border-b border-sage-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                          <span className="text-olive-700">Duration</span>
                        </div>
                        <span className="font-medium text-olive-900">{service.duration_display}</span>
                      </div>
                    )}
                    {service?.max_participants === 1 && (
                      <div className="flex justify-between items-center py-4 border-b border-sage-200">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                          <span className="text-olive-700">Format</span>
                        </div>
                        <span className="font-medium text-olive-900">One-on-one</span>
                      </div>
                    )}
                    {service?.location_type && (
                      <div className="flex justify-between items-center py-4 border-b border-sage-200">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                          <span className="text-olive-700">Location</span>
                        </div>
                        <span className="font-medium text-olive-900">
                          {service.location_type === 'virtual'
                            ? 'Virtual'
                            : service.practitioner_location?.city_name && service.practitioner_location?.country_name
                              ? `${service.practitioner_location.city_name}, ${service.practitioner_location.country_name}`
                              : service.location_type === 'hybrid' ? 'Hybrid' : 'In Person'}
                        </span>
                      </div>
                    )}
                    {service?.experience_level && (
                      <div className="flex justify-between items-center py-4">
                        <div className="flex items-center gap-3">
                          <Star className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                          <span className="text-olive-700">Experience Level</span>
                        </div>
                        <span className="font-medium text-olive-900 capitalize">{service.experience_level.replace('_', ' ')}</span>
                      </div>
                    )}
                    {service?.age_min && service?.age_max && (
                      <div className="flex justify-between items-center py-4 border-t border-sage-200">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                          <span className="text-olive-700">Age Range</span>
                        </div>
                        <span className="font-medium text-olive-900">{service.age_min} - {service.age_max} years</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Column - Sticky Booking Panel */}
          <div className="space-y-8" ref={bookingPanelRef}>
            <div className="lg:sticky lg:top-24">
              {service && (
                <SessionBookingPanel session={{
                  id: service.id,
                  public_uuid: service.public_uuid,
                  name: service.name,
                  price: service.price,
                  duration_display: service.duration_display,
                  primary_practitioner: service.primary_practitioner
                }} />
              )}
              
              {/* Trust Indicators */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Free cancellation up to 24 hours before</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">100% secure checkout</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Satisfaction guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}