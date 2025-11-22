"use client"

import { useQuery } from "@tanstack/react-query"
import { practitionerApplicationsStripeConnectStatusRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"

export interface StripeConnectStatus {
  has_stripe_account: boolean
  stripe_account_id: string | null
  is_connected: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements: {
    currently_due?: string[]
    eventually_due?: string[]
    past_due?: string[]
  } | null
}

export function useStripeConnectStatus(enabled: boolean = true) {
  const query = useQuery({
    ...practitionerApplicationsStripeConnectStatusRetrieveOptions(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const data = query.data as StripeConnectStatus | undefined

  // Stripe is fully connected only when charges AND payouts are enabled
  const isFullyConnected = Boolean(
    data?.has_stripe_account &&
    data?.charges_enabled &&
    data?.payouts_enabled
  )

  // Has account but not fully set up
  const needsSetup = Boolean(
    data?.has_stripe_account &&
    (!data?.charges_enabled || !data?.payouts_enabled)
  )

  // No account at all
  const noAccount = data ? !data.has_stripe_account : false

  // Has requirements that need to be completed
  const hasRequirements = Boolean(
    data?.requirements?.currently_due &&
    data.requirements.currently_due.length > 0
  )

  return {
    ...query,
    data,
    isFullyConnected,
    needsSetup,
    noAccount,
    hasRequirements,
    // Show warning if no account OR needs setup
    showWarning: noAccount || needsSetup,
  }
}
