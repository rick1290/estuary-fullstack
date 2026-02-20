"use client"

import { useQuery } from "@tanstack/react-query"
import {
  practitionersMyProfileRetrieveOptions,
  schedulesListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { useStripeConnectStatus } from "@/hooks/use-stripe-connect-status"

export interface ChecklistItem {
  id: string
  title: string
  description: string
  ctaLabel: string
  href: string
  isComplete: boolean
}

export function useSetupChecklist() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    ...practitionersMyProfileRetrieveOptions(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    ...schedulesListOptions(),
    staleTime: 5 * 60 * 1000,
  })

  const { isFullyConnected, isLoading: stripeLoading } = useStripeConnectStatus()

  const isLoading = profileLoading || schedulesLoading || stripeLoading

  // Derive completion state
  const profileComplete = Boolean(
    profile?.profile_image_url &&
    profile?.bio &&
    profile?.professional_title
  )

  const hasServices = Number(profile?.total_services || 0) > 0

  const schedules = schedulesData?.results || []
  const hasAvailability = schedules.some(
    (s: any) => s.is_active && s.time_slots && s.time_slots.length > 0
  )

  const stripeConnected = isFullyConnected

  const items: ChecklistItem[] = [
    {
      id: "profile",
      title: "Complete your profile",
      description: "Add a photo, bio, and professional title so clients can find you.",
      ctaLabel: "Edit Profile",
      href: "/dashboard/practitioner/profile",
      isComplete: profileComplete,
    },
    {
      id: "availability",
      title: "Set your availability",
      description: "Define your working hours so clients can book time with you.",
      ctaLabel: "Set Hours",
      href: "/dashboard/practitioner/availability",
      isComplete: hasAvailability,
    },
    {
      id: "services",
      title: "Create your first service",
      description: "Offer a session, workshop, or course for clients to book.",
      ctaLabel: "Create Service",
      href: "/dashboard/practitioner/services/create",
      isComplete: hasServices,
    },
    {
      id: "stripe",
      title: "Connect payment",
      description: "Link your Stripe account to receive payments from clients.",
      ctaLabel: "Connect Stripe",
      href: "/dashboard/practitioner/settings?tab=payment",
      isComplete: stripeConnected,
    },
  ]

  const completedCount = items.filter((i) => i.isComplete).length
  const totalCount = items.length
  const isAllComplete = completedCount === totalCount

  return {
    items,
    completedCount,
    totalCount,
    isAllComplete,
    isLoading,
  }
}
