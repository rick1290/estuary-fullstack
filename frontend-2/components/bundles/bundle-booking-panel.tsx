"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, Calendar, TrendingDown } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface BundleBookingPanelProps {
  bundle: {
    id: string | number
    public_uuid?: string
    name: string
    price: string
    sessions_included?: number
    price_per_session?: string
    original_price?: string
    savings_amount?: string
    savings_percentage?: number
    validity_days?: number
    is_transferable?: boolean
    is_shareable?: boolean
    primary_practitioner?: {
      id: string | number
      display_name: string
      slug: string
    }
  }
}

export default function BundleBookingPanel({ bundle }: BundleBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  const handleBookNow = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${bundle.id}&type=bundle`,
        serviceType: "bundle",
        title: "Sign in to Purchase Bundle",
        description: "Please sign in to purchase this session bundle"
      })
      return
    }

    // Navigate to checkout page with bundle details
    router.push(`/checkout?serviceId=${bundle.id}&type=bundle`)
  }

  const sessionsIncluded = bundle.sessions_included || 1
  const pricePerSession = bundle.price_per_session || bundle.price
  const originalPrice = bundle.original_price || (parseFloat(pricePerSession) * sessionsIncluded).toFixed(2)
  const savingsAmount = bundle.savings_amount || (parseFloat(originalPrice) - parseFloat(bundle.price)).toFixed(2)
  const savingsPercentage = bundle.savings_percentage || ((parseFloat(savingsAmount) / parseFloat(originalPrice)) * 100).toFixed(0)

  return (
    <Card className="border-2 border-sage-200 shadow-lg sticky top-24">
      <CardContent className="p-6 space-y-6">
        {/* Pricing Header */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-olive-900">${bundle.price}</span>
            <span className="text-sage-600 line-through text-lg">${originalPrice}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-terracotta-600" />
            <span className="text-terracotta-600 font-semibold">
              Save ${savingsAmount} ({savingsPercentage}% off)
            </span>
          </div>
          <p className="text-sm text-olive-600 mt-2">
            ${pricePerSession} per session
          </p>
        </div>

        {/* Bundle Details */}
        <div className="space-y-3 py-4 border-y border-sage-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-olive-700">
              <Check className="h-5 w-5 text-sage-600" strokeWidth={2} />
              <span className="font-medium">{sessionsIncluded} Sessions Included</span>
            </div>
          </div>

          {bundle.validity_days && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-olive-700">
                <Calendar className="h-5 w-5 text-sage-600" />
                <span>Valid for {bundle.validity_days} days</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-olive-700">
              <Clock className="h-5 w-5 text-sage-600" />
              <span>Book sessions at your convenience</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <span className="text-sm text-olive-700">Flexible scheduling - book when it works for you</span>
          </div>
          {bundle.is_transferable && (
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span className="text-sm text-olive-700">Transferable to family or friends</span>
            </div>
          )}
          {bundle.is_shareable && (
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span className="text-sm text-olive-700">Can be shared with others</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <span className="text-sm text-olive-700">Free cancellation up to 24 hours before</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleBookNow}
          className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
          size="lg"
        >
          Purchase Bundle
        </Button>

        {/* Trust Badge */}
        <div className="pt-4 border-t border-sage-200">
          <p className="text-xs text-center text-olive-600">
            🔒 Secure checkout • 100% satisfaction guaranteed
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
