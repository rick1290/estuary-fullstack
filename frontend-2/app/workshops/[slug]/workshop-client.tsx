"use client"
import React, { useState, useRef } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Clock, MapPin, Users, Heart, Calendar, Check, AlertCircle } from "lucide-react"
import WorkshopBookingPanel from "@/components/workshops/workshop-booking-panel"
import PractitionerSpotlight from "@/components/services/practitioner-spotlight"
import { Button } from "@/components/ui/button"
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

export default function WorkshopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const bookingPanelRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoriteServiceIds, refetch: refetchFavorites } = useUserFavoriteServices()
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false)

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <div className="container max-w-7xl pt-8 lg:pt-12 pb-16">
          <Skeleton className="h-5 w-72 mb-6" />
          <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-3/4" />
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
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
    <div className="min-h-screen bg-cream-50 pb-20 lg:pb-0">
      <div className="container max-w-7xl pt-8 lg:pt-12 pb-16">
        {/* Breadcrumb + Save */}
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-sm font-light text-olive-500 hover:text-olive-700">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-sm font-light text-olive-500 hover:text-olive-700">
                  <Link href="/marketplace">Explore Wellness</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-sm font-light text-olive-500 hover:text-olive-700">
                  <Link href="/marketplace/workshops">Workshops</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-sm text-olive-900">{workshop.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            variant="ghost"
            size="sm"
            className="group text-olive-500 hover:text-olive-700 flex-shrink-0"
            onClick={handleSaveToggle}
            disabled={isProcessing}
          >
            <Heart
              className={`h-4 w-4 mr-1.5 transition-colors ${
                isSaved ? 'fill-rose-500 text-rose-500' : 'group-hover:text-rose-500'
              }`}
              strokeWidth="1.5"
            />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>

        {/* Two-column grid */}
        <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column - Hero content + main content */}
          <div>
            {/* Modalities */}
            {workshop.modalities && workshop.modalities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {workshop.modalities.map((modality: { id: number; name: string; slug: string }) => (
                  <span key={modality.id} className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
                    {modality.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-olive-900 mb-3 leading-[1.15]">
              {workshop.title}
            </h1>

            {/* Practitioner line */}
            {workshop.practitioners && workshop.practitioners.length > 0 && (
              <Link
                href={workshop.practitioners[0].slug ? `/practitioners/${workshop.practitioners[0].slug}` : `/practitioners/${workshop.practitioners[0].id}`}
                className="inline-flex items-center gap-2.5 mb-4 group"
              >
                {workshop.practitioners[0].image ? (
                  <img src={workshop.practitioners[0].image} alt={workshop.practitioners[0].name} className="w-8 h-8 rounded-full object-cover border border-sage-200/60" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-100 flex items-center justify-center">
                    <span className="text-[10px] font-serif font-light text-olive-700/50">
                      {workshop.practitioners[0].name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
                <span className="text-sm font-light text-olive-600 group-hover:text-sage-700 transition-colors">
                  with {workshop.practitioners[0].name}
                </span>
              </Link>
            )}

            {/* Description */}
            <p className="text-base text-olive-600 leading-relaxed font-light mb-5">
              {workshop.description}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-light text-olive-500 mb-6">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                <span>{transformedWorkshop.totalHours} hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                <span>{workshop.spotsRemaining} of {workshop.capacity} spots left</span>
              </div>
              {workshop.nextSessionDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span>
                    {new Date(workshop.nextSessionDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {workshop.nextSessionDate && upcomingSessions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span>
                    {new Date(upcomingSessions[0].start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(upcomingSessions[0].end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                <span>{workshop.location}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-sage-200/40 mb-10 lg:mb-12" />

            {/* Content sections */}
            <div className="space-y-10 lg:space-y-12">
              {/* Workshop Overview */}
              <section>
                <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Overview</p>
                <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Your Transformation Awaits</h2>
                <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line">
                  {transformedWorkshop.longDescription}
                </p>
              </section>

              {/* Benefits */}
              {workshop.benefits && workshop.benefits.length > 0 && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Benefits</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What You'll Gain</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {workshop.benefits.map((benefit: any, index: number) => (
                      <div key={benefit.id || index} className="bg-white rounded-2xl border border-sage-200/60 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center mb-3">
                          <span className="text-xs font-medium text-sage-700">{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <h3 className="text-[15px] font-medium text-olive-900 mb-1.5">{benefit.title}</h3>
                        <p className="text-[13px] font-light text-olive-500 leading-relaxed">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Workshop Agenda */}
              {workshop.agendaItems && workshop.agendaItems.length > 0 && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Schedule</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Workshop Agenda</h2>
                  <div className="border border-sage-200 rounded-xl overflow-hidden">
                    <div className="p-6 bg-cream-50">
                      <div className="space-y-4">
                        {workshop.agendaItems.map((item: any, index: number) => (
                          <div key={item.id || index} className="flex gap-4 items-start group">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-sage-700">{index + 1}</span>
                            </div>
                            <div className="flex-1 pb-4 border-b border-sage-100 last:border-0 last:pb-0">
                              <h4 className="text-olive-800 font-medium mb-1">{item.title}</h4>
                              {item.description && (
                                <p className="text-[15px] font-light text-olive-600">{item.description}</p>
                              )}
                              {item.duration_minutes && (
                                <span className="inline-block mt-2 text-xs px-2.5 py-0.5 border border-sage-200 rounded-full text-olive-500 font-light">
                                  {item.duration_minutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* What's Included */}
              {workshop.includes && workshop.includes.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What's Included</h2>
                  <div className="bg-white rounded-2xl border border-sage-200/60 p-5">
                    <div className="grid md:grid-cols-2 gap-3">
                      {workshop.includes.map((item: string, index: number) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-sage-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-sage-600" strokeWidth="2.5" />
                          </div>
                          <span className="text-sm font-light text-olive-600 leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Workshop Facilitators */}
              {workshop.practitioners && workshop.practitioners.length > 0 && (
                <section className="pt-12 border-t border-sage-200/40">
                  <PractitionerSpotlight
                    practitioners={workshop.practitioners}
                    role="facilitator"
                  />
                </section>
              )}

              {/* Closing CTA */}
              <section className="pt-12 border-t border-sage-200/40">
                <div className="bg-gradient-to-br from-terracotta-100/40 via-sage-100/30 to-sage-200/40 rounded-2xl px-6 py-8 sm:px-8 sm:py-10 text-center">
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3">Ready to Begin?</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-3">
                    Start your <em className="italic text-terracotta-600">transformation</em> today
                  </h2>
                  <p className="text-sm font-light text-olive-600 mb-6 max-w-md mx-auto">
                    Reserve your spot and join a small group committed to meaningful change.
                  </p>
                  <Button className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-8" onClick={() => setMobileBookingOpen(true)}>
                    Reserve Your Spot
                  </Button>
                </div>
              </section>
            </div>
          </div>

          {/* Right Column - Sticky Booking Panel */}
          <div className="space-y-6" ref={bookingPanelRef}>
            <div className="lg:sticky lg:top-24">
              <WorkshopBookingPanel workshop={transformedWorkshop} serviceData={serviceData} />

              {/* Trust Indicators */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500 rounded-full" strokeWidth="1.5" />
                  <span className="text-xs font-light">Small group size (max {workshop.capacity})</span>
                </div>
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500 rounded-full" strokeWidth="1.5" />
                  <span className="text-xs font-light">All materials & resources included</span>
                </div>
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500 rounded-full" strokeWidth="1.5" />
                  <span className="text-xs font-light">100% satisfaction guarantee</span>
                </div>
              </div>

              {/* Urgency Card */}
              {workshop.spotsRemaining > 0 && (
                <div className="mt-6 border border-terracotta-200 bg-terracotta-50 rounded-xl p-4 text-center">
                  <h3 className="text-xs font-medium text-olive-900 mb-1">Limited Availability</h3>
                  <p className="text-xs font-light text-olive-700">
                    Only <span className="font-medium text-terracotta-600">{workshop.spotsRemaining} {workshop.spotsRemaining === 1 ? 'spot' : 'spots'} left</span> for the next session
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky booking bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-sage-200/60 px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-[11px] font-light text-olive-500">From</p>
            <p className="text-lg font-semibold text-olive-900">${workshop?.price || '—'}</p>
          </div>
          <Button className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-6 text-sm font-medium" onClick={() => setMobileBookingOpen(true)}>
            Reserve Spot
          </Button>
        </div>
      </div>

      {/* Mobile booking drawer */}
      <Drawer open={mobileBookingOpen} onOpenChange={setMobileBookingOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="font-serif text-lg font-light text-olive-900">Reserve Your Spot</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <WorkshopBookingPanel workshop={transformedWorkshop} serviceData={serviceData} compact />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
