"use client"
import React, { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { practitionersBySlugRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import PractitionerBookingPanel from "@/components/practitioners/practitioner-booking-panel"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ClientPractitionerProfile from "@/components/practitioners/client-practitioner-profile"

export default function PractitionerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  
  // Fetch practitioner data from API using slug  
  const { data: practitioner, isLoading, error } = useQuery({
    ...practitionersBySlugRetrieveOptions({ path: { slug } }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <div className="bg-gradient-to-b from-sage-50/50 to-cream-50 pb-8">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
            <Skeleton className="h-6 w-96 mb-6" />
          </div>
        </div>
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid lg:grid-cols-[1fr,340px] gap-6 lg:gap-8">
            <div className="w-full min-w-0">
              <ProfileSkeleton />
            </div>
            <div className="w-full">
              <Skeleton className="h-96 rounded-2xl" />
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
            Failed to load practitioner details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!practitioner) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Simple gradient header background */}
      <div className="bg-gradient-to-b from-sage-50/50 to-cream-50 pb-8">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-600 hover:text-olive-800 text-sm">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-600 hover:text-olive-800 text-sm">
                  <Link href="/marketplace/practitioners">Practitioners</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-800 font-medium text-sm">{practitioner.display_name || `${practitioner.user.first_name} ${practitioner.user.last_name}`.trim() || 'Practitioner'}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-[1fr,340px] gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="w-full min-w-0">
            <Suspense fallback={<ProfileSkeleton />}>
              <ClientPractitionerProfile practitioner={practitioner} />
            </Suspense>
          </div>

          {/* Right Column - Booking Panel (Sticky) */}
          <div className="w-full lg:sticky lg:top-24 lg:self-start">
            <PractitionerBookingPanel practitioner={practitioner} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
            <div className="flex gap-4 mt-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6">
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}