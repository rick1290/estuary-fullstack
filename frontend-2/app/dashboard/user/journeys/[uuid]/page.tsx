"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  journeysRetrieveOptions,
} from "@/src/client/@tanstack/react-query.gen"
import type { JourneyDetail } from "@/src/client/types.gen"
import SessionDelivery from "@/components/dashboard/user/journeys/session-delivery"
import CourseDelivery from "@/components/dashboard/user/journeys/course-delivery"
import WorkshopDelivery from "@/components/dashboard/user/journeys/workshop-delivery"
import PackageDelivery from "@/components/dashboard/user/journeys/package-delivery"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function JourneyDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = React.use(params)

  // Fetch from the typed journeys API
  const {
    data: journey,
    isLoading,
    error,
  } = useQuery({
    ...journeysRetrieveOptions({ path: { booking_uuid: uuid } }),
    enabled: !!uuid,
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-2xl overflow-hidden">
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="grid grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  // Route based on journey_type from the typed journeys API
  if (journey?.journey_type) {
    const journeyData = journey as JourneyDetail

    if (journeyData.journey_type === "course") {
      return <CourseDelivery bookingUuid={uuid} journeyData={journeyData} />
    }

    if (journeyData.journey_type === "package" || journeyData.journey_type === "bundle") {
      return <PackageDelivery bookingUuid={uuid} journeyData={journeyData} />
    }

    if (journeyData.journey_type === "workshop") {
      return <WorkshopDelivery bookingUuid={uuid} journeyData={journeyData} />
    }

    // Session type
    return <SessionDelivery journeyData={journeyData} refetch={() => {}} />
  }

  // Error state
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Alert variant="destructive" className="rounded-xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load journey details. Please try again later.
        </AlertDescription>
      </Alert>
      <Button variant="outline" className="mt-4 rounded-full" asChild>
        <Link href="/dashboard/user/journeys">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Journey
        </Link>
      </Button>
    </div>
  )
}
