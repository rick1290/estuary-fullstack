"use client"
import React, { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { ChevronRight, Clock, MapPin, User, Star, Heart, Check, AlertCircle, DollarSign } from "lucide-react"
import SessionBookingPanel from "@/components/sessions/session-booking-panel"
import PractitionerSpotlight from "@/components/services/practitioner-spotlight"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
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
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false)
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
        <div className="container max-w-7xl pt-8 lg:pt-12 pb-16">
          <Skeleton className="h-5 w-64 mb-6" />
          <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0">
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-10 w-3/4 mb-3" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-5 w-full mb-5" />
              <div className="flex gap-4 mb-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-40 rounded-full" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <div className="hidden lg:block">
              <Skeleton className="h-[600px] rounded-2xl" />
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
            Failed to load session details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
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
                  <Link href="/marketplace/sessions">Sessions</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-sm text-olive-900">{service?.name || 'Session'}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            variant="ghost"
            size="sm"
            className="group text-olive-500 hover:text-olive-700 flex-shrink-0"
            onClick={handleSaveForLater}
            disabled={isSaveLoading}
          >
            <Heart
              className={`h-4 w-4 mr-1.5 transition-colors ${
                isFavorited ? 'fill-rose-500 text-rose-500' : 'group-hover:text-rose-500'
              }`}
              strokeWidth="1.5"
            />
            {isFavorited ? 'Saved' : 'Save'}
          </Button>
        </div>

        {/* Two-column layout — content left, booking right */}
        <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column */}
          <div className="min-w-0">
            {/* Hero Zone */}
            <div className="mb-8 lg:mb-10">
              {/* Pills */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {service?.category && (
                  <span className="text-xs px-2.5 py-1 bg-terracotta-50 text-terracotta-600 rounded-full font-light">
                    {service.category.name}
                  </span>
                )}
                {service?.practitioner_category && (
                  <span className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
                    {service.practitioner_category.name}
                  </span>
                )}
                {service?.tags?.map((tag: string) => (
                  <span key={tag} className="text-xs px-2.5 py-1 bg-cream-100 text-olive-500 rounded-full font-light">
                    {tag}
                  </span>
                ))}
                {service?.modalities && service.modalities.length > 0 && (
                  <>
                    {service.modalities.map((modality: { id: number; name: string; slug: string }) => (
                      <span key={modality.id} className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
                        {modality.name}
                      </span>
                    ))}
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-olive-900 mb-3 leading-[1.15]">
                {service?.name || 'Session'}
              </h1>

              {/* Practitioner line */}
              {service?.primary_practitioner && (
                <Link
                  href={service.primary_practitioner.slug ? `/practitioners/${service.primary_practitioner.slug}` : `/practitioners/${service.primary_practitioner.id}`}
                  className="inline-flex items-center gap-2.5 mb-4 group"
                >
                  {service.primary_practitioner.profile_image_url ? (
                    <img
                      src={service.primary_practitioner.profile_image_url}
                      alt={service.primary_practitioner.display_name || service.primary_practitioner.name}
                      className="w-8 h-8 rounded-full object-cover border border-sage-200/60"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-100 flex items-center justify-center">
                      <span className="text-[10px] font-serif font-light text-olive-700/50">
                        {(service.primary_practitioner.display_name || service.primary_practitioner.name || 'P').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-light text-olive-600 group-hover:text-sage-700 transition-colors">
                    with {service.primary_practitioner.display_name || service.primary_practitioner.name}
                  </span>
                </Link>
              )}

              {/* Description lede */}
              {(service?.short_description || service?.description) && (
                <p className="text-base sm:text-lg font-light text-olive-700 leading-[1.8] mb-6 pl-5 border-l-[3px] border-terracotta-400">
                  {service?.short_description || service?.description || ''}
                </p>
              )}

              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-2.5 mb-6">
                {service?.duration_minutes && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                    {service.duration_display}
                  </span>
                )}
                {service?.location_type && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                    {service.location_type === 'virtual'
                      ? 'Virtual'
                      : service.practitioner_location
                        ? [
                            service.practitioner_location.city_name,
                            service.practitioner_location.state_code || service.practitioner_location.state_name,
                            service.practitioner_location.country_code !== 'US' && service.practitioner_location.country_name
                          ].filter(Boolean).join(', ')
                        : service.location_type === 'hybrid' ? 'Hybrid' : 'In Person'}
                  </span>
                )}
                {service?.max_participants === 1 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                    <User className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                    1-on-1
                  </span>
                )}
                {service && service.total_reviews > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                    <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" strokeWidth="1.5" />
                    <span className="font-medium text-olive-800">{service.average_rating?.toFixed(1)}</span>
                    <span className="text-olive-400">({service.total_reviews})</span>
                  </span>
                )}
              </div>

            </div>

            {/* Divider */}
            <div className="border-t border-sage-200/40 mb-10 lg:mb-12" />

            {/* Content Sections */}
            <div className="space-y-10 lg:space-y-12">
              {/* Overview */}
              {service?.description && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Overview</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">About This <em className="italic text-terracotta-600">Session</em></h2>
                  <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line">
                    {service.description}
                  </p>
                </section>
              )}

              {/* Session Details */}
              <section className="pb-12 border-b border-sage-200/40">
                <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Logistics</p>
                <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Session <em className="italic text-terracotta-600">Details</em></h2>
                <div className="bg-white rounded-2xl border border-sage-200/60 divide-y divide-sage-200/60">
                  {service?.price != null && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="h-4 w-4 text-sage-500" strokeWidth="1.5" />
                        <span className="text-sm font-light text-olive-500">Price</span>
                      </div>
                      <span className="text-sm font-medium text-olive-900">${service.price} per session</span>
                    </div>
                  )}
                  {service?.duration_minutes && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-sage-500" strokeWidth="1.5" />
                        <span className="text-sm font-light text-olive-500">Duration</span>
                      </div>
                      <span className="text-sm font-medium text-olive-900">{service.duration_display}</span>
                    </div>
                  )}
                  {service?.max_participants === 1 && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-sage-500" strokeWidth="1.5" />
                        <span className="text-sm font-light text-olive-500">Format</span>
                      </div>
                      <span className="text-sm font-medium text-olive-900">One-on-one</span>
                    </div>
                  )}
                  {service?.location_type && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-sage-500" strokeWidth="1.5" />
                        <span className="text-sm font-light text-olive-500">Location</span>
                      </div>
                      <span className="text-sm font-medium text-olive-900">
                        {service.location_type === 'virtual'
                          ? 'Virtual'
                          : service.practitioner_location
                            ? [
                                service.practitioner_location.city_name,
                                service.practitioner_location.state_code || service.practitioner_location.state_name,
                                service.practitioner_location.country_code !== 'US' && service.practitioner_location.country_name
                              ].filter(Boolean).join(', ')
                            : service.location_type === 'hybrid' ? 'Hybrid' : 'In Person'}
                      </span>
                    </div>
                  )}
                  {service?.experience_level && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Star className="h-4 w-4 text-sage-500" strokeWidth="1.5" />
                        <span className="text-sm font-light text-olive-500">Experience Level</span>
                      </div>
                      <span className="text-sm font-medium text-olive-900 capitalize">{service.experience_level.replace('_', ' ')}</span>
                    </div>
                  )}
                  {service?.age_min && service?.age_max && (
                    <div className="flex justify-between items-center px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-sage-500" strokeWidth="1.5" />
                        <span className="text-sm font-light text-olive-500">Age Range</span>
                      </div>
                      <span className="text-sm font-medium text-olive-900">{service.age_min} - {service.age_max} years</span>
                    </div>
                  )}
                </div>
              </section>

              {/* What You'll Learn */}
              {service?.what_youll_learn && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Discover</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What You'll <em className="italic text-terracotta-600">Learn</em></h2>
                  <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line">
                    {service.what_youll_learn}
                  </p>
                </section>
              )}

              {/* Key Benefits */}
              {service?.benefits && service.benefits.length > 0 && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Benefits</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What You'll <em className="italic text-terracotta-600">Gain</em></h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {service.benefits.map((benefit, index) => (
                      <div key={benefit.id} className="bg-white rounded-2xl border border-sage-200/60 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
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

              {/* What's Included */}
              {service?.includes && service.includes.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What's <em className="italic text-terracotta-600">Included</em></h2>
                  <div className="bg-white rounded-2xl border border-sage-200/60 p-5">
                    <div className="grid md:grid-cols-2 gap-3">
                      {service.includes.map((item, index) => (
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

              {/* Prerequisites */}
              {service?.prerequisites && (
                <section>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5"><em className="italic text-terracotta-600">Prerequisites</em></h2>
                  <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line">
                    {service.prerequisites}
                  </p>
                </section>
              )}

              {/* Requirements */}
              {service?.requirements && (
                <section>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5"><em className="italic text-terracotta-600">Requirements</em></h2>
                  <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line">
                    {service.requirements}
                  </p>
                </section>
              )}

              {/* Practitioner Spotlight */}
              {service?.primary_practitioner && (
                <section className="pt-12 border-t border-sage-200/40">
                  <PractitionerSpotlight
                    practitioners={[service.primary_practitioner]}
                    role="guide"
                    animationDelay="0s"
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
                    Book your session and take the first step toward the change you've been seeking.
                  </p>
                  <Button className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-8" onClick={scrollToBooking}>
                    Book Your Session
                  </Button>
                </div>
              </section>
            </div>
          </div>

          {/* Right Column — Booking panel (desktop only) */}
          <div ref={bookingPanelRef} className="hidden lg:block">
            {/* Booking panel — sticks on scroll */}
            <div className="lg:sticky lg:top-24 space-y-5">
              {service && (
                <SessionBookingPanel session={{
                  id: service.id,
                  public_uuid: service.public_uuid,
                  name: service.name,
                  price: service.price,
                  duration_display: service.duration_display,
                  primary_practitioner: service.primary_practitioner,
                  image_url: service.image_url
                }} />
              )}

              {/* Trust Indicators */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500" strokeWidth="2" />
                  <span className="text-xs font-light">Free cancellation up to 24 hours before</span>
                </div>
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500" strokeWidth="2" />
                  <span className="text-xs font-light">100% secure checkout</span>
                </div>
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500" strokeWidth="2" />
                  <span className="text-xs font-light">Satisfaction guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky booking bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-sage-200/60 px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-[11px] font-light text-olive-500">From</p>
            <p className="text-lg font-semibold text-olive-900">${service?.price || '—'}</p>
          </div>
          <Button
            className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-6 text-sm font-medium"
            onClick={() => setMobileBookingOpen(true)}
          >
            Book Session
          </Button>
        </div>
      </div>

      {/* Mobile booking drawer */}
      <Drawer open={mobileBookingOpen} onOpenChange={setMobileBookingOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="font-serif text-lg font-light text-olive-900">Book Your Session</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            {service && (
              <SessionBookingPanel session={{
                id: service.id,
                public_uuid: service.public_uuid,
                name: service.name,
                price: service.price,
                duration_display: service.duration_display,
                primary_practitioner: service.primary_practitioner,
                image_url: service.image_url
              }} compact />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}