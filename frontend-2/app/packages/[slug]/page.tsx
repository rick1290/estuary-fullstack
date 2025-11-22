"use client"
import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Check, Heart, Share2, Package, TrendingDown, AlertCircle, Sparkles, Calendar } from "lucide-react"
import PackageBookingPanel from "@/components/packages/package-booking-panel"
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

export default function PackageDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [isSaveLoading, setIsSaveLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoriteServiceIds, refetch: refetchFavorites } = useUserFavoriteServices()

  // Fetch package data from API using slug
  const { data: serviceData, isLoading, error } = useQuery({
    ...publicServicesBySlugRetrieveOptions({ path: { slug } }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Use real API data
  const packageData = serviceData

  // Check if this service is favorited
  const isFavorited = serviceData && favoriteServiceIds.has(serviceData.id?.toString() || serviceData.public_uuid)

  // Handle save for later
  const handleSaveForLater = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        title: "Sign in to Save Packages",
        description: "Create an account to save packages for later"
      })
      return
    }

    if (!serviceData) return

    setIsSaveLoading(true)
    try {
      if (!isFavorited) {
        await userAddFavoriteService({
          body: {
            service_id: serviceData.id
          }
        })
        toast.success("Package saved for later")
      } else {
        await userRemoveFavoriteService({
          path: {
            service_id: serviceData.id
          }
        })
        toast.success("Package removed from saved")
      }

      await refetchFavorites()
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error("Failed to update saved status")
    } finally {
      setIsSaveLoading(false)
    }
  }, [serviceData, isFavorited, isAuthenticated, openAuthModal, refetchFavorites])

  // Handle purchase
  const handlePurchase = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${serviceData?.id}&type=package`,
        serviceType: "package",
        title: "Sign in to Purchase Package",
        description: "Please sign in to purchase this wellness package"
      })
      return
    }

    if (!serviceData) return

    // Navigate to checkout page with package details
    router.push(`/checkout?serviceId=${serviceData.id}&type=package`)
  }, [serviceData, isAuthenticated, openAuthModal, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <section className="relative min-h-[70vh] bg-gradient-to-b from-blush-50 via-sage-50 to-cream-50">
          <div className="relative container max-w-7xl py-12">
            <Skeleton className="h-6 w-96 mb-12" />
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-12 w-32" />
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
            Failed to load package details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!packageData) {
    return null
  }

  const childServices = packageData.child_relationships || []
  const totalServices = childServices.reduce((sum, rel) => sum + rel.quantity, 0)
  const originalPrice = packageData.original_price || packageData.price
  const savingsAmount = packageData.savings_amount || (parseFloat(originalPrice) - parseFloat(packageData.price)).toFixed(2)
  const savingsPercentage = packageData.savings_percentage || ((parseFloat(savingsAmount) / parseFloat(originalPrice)) * 100).toFixed(0)

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[70vh] bg-gradient-to-b from-blush-50 via-sage-50 to-cream-50 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 texture-grain opacity-30" />

        {/* Decorative blob shapes */}
        <div className="absolute top-20 -right-40 w-96 h-96 bg-blush-200/20 rounded-full blur-3xl" />
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
                  <Link href="/marketplace/packages">Packages</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-900 font-medium">{packageData.name || 'Package'}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-slide-up">
              {/* Package Badge & Modalities */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3 bg-blush-100 px-5 py-3 rounded-full">
                  <Sparkles className="h-5 w-5 text-blush-600 animate-pulse" strokeWidth="1.5" />
                  <span className="text-blush-800 font-semibold">
                    Complete Package • {totalServices} Services
                  </span>
                </div>
                {packageData.modalities && packageData.modalities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {packageData.modalities.map((modality: { id: number; name: string; slug: string }) => (
                      <Badge key={modality.id} variant="sage" className="px-3 py-1">
                        {modality.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-5xl lg:text-6xl font-medium text-olive-900 mb-6 leading-tight">
                  {packageData.name || 'Wellness Package'}
                </h1>
                <p className="text-xl text-olive-700 leading-relaxed">
                  {packageData.short_description || packageData.description || 'A complete wellness package designed for your transformation'}
                </p>
              </div>

              {/* Package Stats */}
              <div className="flex flex-wrap items-center gap-8">
                <div>
                  <p className="text-4xl font-bold text-olive-900">{totalServices}</p>
                  <p className="text-olive-600">Services Included</p>
                </div>
                {parseFloat(savingsAmount) > 0 && (
                  <>
                    <div className="w-px h-12 bg-sage-300" />
                    <div>
                      <p className="text-4xl font-bold text-terracotta-600">{savingsPercentage}%</p>
                      <p className="text-olive-600">Savings</p>
                    </div>
                  </>
                )}
              </div>

              {/* Savings Highlight */}
              {parseFloat(savingsAmount) > 0 && (
                <Card className="bg-gradient-to-r from-blush-50 to-terracotta-50 border-2 border-terracotta-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown className="h-6 w-6 text-terracotta-600" />
                      <p className="text-2xl font-bold text-olive-900">
                        Save ${savingsAmount}
                      </p>
                    </div>
                    <p className="text-olive-700">
                      compared to booking services individually
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="shadow-lg" onClick={handlePurchase}>
                  Purchase Package - ${packageData.price}
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
              <div className="relative h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-blush-100 to-sage-100 shadow-2xl">
                {packageData.image_url ? (
                  <img
                    src={packageData.image_url}
                    alt={packageData.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-32 w-32 text-sage-300" strokeWidth="1" />
                  </div>
                )}

                {/* Floating price card */}
                <div className="absolute top-6 right-6 bg-cream-50/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <p className="text-sm text-olive-700 mb-1">Package Price</p>
                  <p className="text-3xl font-medium text-olive-900 mb-2">${packageData.price}</p>
                  {parseFloat(savingsAmount) > 0 && (
                    <p className="text-sm text-sage-600 line-through">${originalPrice}</p>
                  )}
                </div>

                {/* Floating services count */}
                <div className="absolute bottom-6 left-6 right-6 bg-cream-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-6 w-6 text-terracotta-600" />
                    <p className="font-semibold text-olive-900">Includes {totalServices} Services</p>
                  </div>
                  <div className="space-y-1">
                    {childServices.slice(0, 2).map((rel) => (
                      <p key={rel.id} className="text-sm text-olive-700">
                        ✓ {rel.quantity > 1 && `${rel.quantity}x `}{rel.child_service.name}
                      </p>
                    ))}
                    {childServices.length > 2 && (
                      <p className="text-sm text-olive-600">+ {childServices.length - 2} more...</p>
                    )}
                  </div>
                </div>
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
            {/* Included Services */}
            {childServices.length > 0 && (
              <section className="animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">Services Included in This Package</h2>
                <div className="space-y-4">
                  {childServices.map((relationship) => (
                    <Card key={relationship.id} className="border-2 border-sage-200 hover:border-sage-300 transition-all">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-sage-100 to-blush-100 flex items-center justify-center">
                              <Check className="h-8 w-8 text-sage-600" strokeWidth={2} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-xl font-semibold text-olive-900 mb-1">
                                  {relationship.quantity > 1 && `${relationship.quantity}x `}
                                  {relationship.child_service.name}
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                  {relationship.child_service.service_type_display}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-sage-700">
                                  ${relationship.child_service.price}
                                </p>
                                {relationship.quantity > 1 && (
                                  <p className="text-xs text-olive-600">per service</p>
                                )}
                              </div>
                            </div>
                            {relationship.description_override && (
                              <p className="text-olive-600 mt-2">{relationship.description_override}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* About Package */}
            {packageData.description && (
              <section className="animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">About This Package</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {packageData.description}
                  </p>
                </div>
              </section>
            )}

            {/* What You'll Learn */}
            {packageData.what_youll_learn && (
              <section className="animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">What You'll Experience</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {packageData.what_youll_learn}
                  </p>
                </div>
              </section>
            )}

            {/* Benefits */}
            {packageData.benefits && packageData.benefits.length > 0 && (
              <section className="animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-10">Package Benefits</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {packageData.benefits.map((benefit: any) => (
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
            {packageData.includes && packageData.includes.length > 0 && (
              <section className="animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">What's Included</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {packageData.includes.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                      <span className="text-olive-700 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Prerequisites */}
            {packageData.prerequisites && (
              <section className="animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">Prerequisites</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {packageData.prerequisites}
                  </p>
                </div>
              </section>
            )}

            {/* How It Works */}
            <section className="bg-gradient-to-br from-blush-50 to-sage-50 rounded-3xl p-10 -mx-4 animate-fade-in">
              <h2 className="text-3xl font-medium text-olive-900 mb-10">How This Package Works</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-terracotta-700">1</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-olive-900 mb-2">Purchase the Package</h3>
                    <p className="text-olive-700">
                      Secure your spot and unlock all {totalServices} services at a discounted rate
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-terracotta-700">2</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-olive-900 mb-2">Schedule Your Services</h3>
                    <p className="text-olive-700">
                      Book each service when it works best for you within the validity period
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-terracotta-700">3</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-olive-900 mb-2">Experience Your Journey</h3>
                    <p className="text-olive-700">
                      Complete all services and enjoy your comprehensive wellness transformation
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Practitioner Spotlight */}
            {packageData.primary_practitioner && (
              <section className="bg-gradient-to-br from-sage-50 to-cream-100 rounded-3xl p-10 -mx-4 animate-fade-in">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">Meet Your Guide</h2>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-shrink-0">
                    {packageData.primary_practitioner.profile_image_url ? (
                      <img
                        src={packageData.primary_practitioner.profile_image_url}
                        alt={packageData.primary_practitioner.display_name}
                        className="w-32 h-32 rounded-full object-cover shadow-xl"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center shadow-xl">
                        <span className="text-4xl font-medium text-olive-800">
                          {packageData.primary_practitioner.display_name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-medium text-olive-900 mb-2">{packageData.primary_practitioner.display_name}</h3>
                    <Link
                      href={`/practitioners/${packageData.primary_practitioner.slug}`}
                      className="text-sage-600 hover:text-sage-700 underline text-sm"
                    >
                      View Full Profile
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sticky Booking Panel */}
          <div className="space-y-8">
            <div className="lg:sticky lg:top-24">
              {packageData && (
                <PackageBookingPanel packageData={{
                  id: packageData.id,
                  public_uuid: packageData.public_uuid,
                  name: packageData.name,
                  price: packageData.price,
                  original_price: packageData.original_price,
                  savings_amount: packageData.savings_amount,
                  savings_percentage: packageData.savings_percentage,
                  validity_days: packageData.validity_days,
                  child_relationships: packageData.child_relationships,
                  primary_practitioner: packageData.primary_practitioner
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
