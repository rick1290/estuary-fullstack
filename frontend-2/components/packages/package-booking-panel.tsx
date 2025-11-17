"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Package, TrendingDown, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface PackageBookingPanelProps {
  packageData: {
    id: string | number
    public_uuid?: string
    name: string
    price: string
    original_price?: string
    savings_amount?: string
    savings_percentage?: number
    validity_days?: number
    image_url?: string
    child_relationships?: Array<{
      id: number
      quantity: number
      child_service: {
        id: number
        name: string
        price: string
        service_type_display: string
      }
    }>
    primary_practitioner?: {
      id: string | number
      display_name: string
      slug: string
    }
  }
}

export default function PackageBookingPanel({ packageData }: PackageBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  const handleBookNow = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${packageData.id}&type=package`,
        serviceType: "package",
        title: "Sign in to Purchase Package",
        description: "Please sign in to purchase this wellness package"
      })
      return
    }

    // Navigate to checkout page with package details
    router.push(`/checkout?serviceId=${packageData.id}&type=package`)
  }

  const childServices = packageData.child_relationships || []
  const totalServices = childServices.reduce((sum, rel) => sum + rel.quantity, 0)
  const originalPrice = packageData.original_price || packageData.price
  const savingsAmount = packageData.savings_amount || (parseFloat(originalPrice) - parseFloat(packageData.price)).toFixed(2)
  const savingsPercentage = packageData.savings_percentage || ((parseFloat(savingsAmount) / parseFloat(originalPrice)) * 100).toFixed(0)

  return (
    <Card className="border-2 border-sage-200 shadow-lg sticky top-24 overflow-hidden">
      {/* Package Image - Udemy Style */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-blush-100 to-sage-100 overflow-hidden">
        {packageData.image_url ? (
          <img
            src={packageData.image_url}
            alt={packageData.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-sage-400 text-center">
              <Package className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-70">Package Preview</p>
            </div>
          </div>
        )}
        {/* Package Badge Overlay */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-2 bg-terracotta-500 text-white rounded-lg py-1.5 px-3 shadow-md">
            <Package className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Package</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Pricing Header */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-olive-900">${packageData.price}</span>
            {parseFloat(savingsAmount) > 0 && (
              <span className="text-sage-600 line-through text-lg">${originalPrice}</span>
            )}
          </div>
          {parseFloat(savingsAmount) > 0 && (
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-terracotta-600" />
              <span className="text-terracotta-600 font-semibold">
                Save ${savingsAmount} ({savingsPercentage}% off)
              </span>
            </div>
          )}
          <p className="text-sm text-olive-600 mt-2">
            {totalServices} services included
          </p>
        </div>

        {/* Included Services */}
        {childServices.length > 0 && (
          <div className="space-y-3 py-4 border-y border-sage-200">
            <p className="font-semibold text-olive-900 text-sm mb-3">Package Includes:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {childServices.map((relationship) => (
                <div key={relationship.id} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <div className="flex-1 text-sm">
                    <span className="text-olive-800 font-medium">
                      {relationship.quantity > 1 && `${relationship.quantity}x `}
                      {relationship.child_service.name}
                    </span>
                    <span className="text-olive-600 text-xs block">
                      {relationship.child_service.service_type_display}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-olive-700">Complete wellness experience</span>
          </div>
          {packageData.validity_days && (
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span className="text-sm text-olive-700">Valid for {packageData.validity_days} days</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <span className="text-sm text-olive-700">Schedule services at your convenience</span>
          </div>
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
          Purchase Package
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
