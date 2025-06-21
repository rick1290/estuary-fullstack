/**
 * Subscription tier constants
 * These should match the backend SubscriptionTierCode enum
 */

export const SUBSCRIPTION_TIER_CODES = {
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  PREMIUM: 'premium',
} as const

export type SubscriptionTierCode = typeof SUBSCRIPTION_TIER_CODES[keyof typeof SUBSCRIPTION_TIER_CODES]

export const TIER_FEATURES = {
  [SUBSCRIPTION_TIER_CODES.BASIC]: [
    'Up to 20 bookings per month',
    'Basic scheduling tools',
    'Client messaging',
    'Standard support',
    'Basic analytics',
  ],
  [SUBSCRIPTION_TIER_CODES.PROFESSIONAL]: [
    'Unlimited bookings',
    'Advanced scheduling & calendar sync',
    'Priority client messaging',
    'Automated reminders',
    'Advanced analytics',
    'Custom branding',
    'Priority support',
    'Group session management',
  ],
  [SUBSCRIPTION_TIER_CODES.PREMIUM]: [
    'Everything in Professional',
    'Multi-practitioner support',
    'API access',
    'White-label options',
    'Dedicated account manager',
    'Custom integrations',
    'Advanced reporting',
    'Bulk import/export',
    'Priority feature requests',
  ],
}

export const COMMISSION_DISCOUNTS = {
  [SUBSCRIPTION_TIER_CODES.BASIC]: 0,
  [SUBSCRIPTION_TIER_CODES.PROFESSIONAL]: 2, // 2% discount
  [SUBSCRIPTION_TIER_CODES.PREMIUM]: 5, // 5% discount
}