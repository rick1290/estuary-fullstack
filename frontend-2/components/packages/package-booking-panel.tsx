"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Check, Package, TrendingDown, Calendar, Clock } from "lucide-react"
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
    <Card className="border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden">
      {/* Pricing Header - Course Style */}
      <div className="bg-gradient-to-br from-terracotta-100 to-sage-100 p-8 text-center">
        <p className="text-sm text-olive-700 mb-2">Complete Wellness Package</p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-bold text-olive-900">${packageData.price}</span>
          {parseFloat(savingsAmount) > 0 && (
            <span className="text-sage-600 line-through text-lg">${originalPrice}</span>
          )}
        </div>
        {parseFloat(savingsAmount) > 0 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <TrendingDown className="h-4 w-4 text-terracotta-600" />
            <span className="text-terracotta-600 font-semibold text-sm">
              Save ${savingsAmount} ({savingsPercentage}% off)
            </span>
          </div>
        )}
        <p className="text-sm text-olive-600 mt-2">{totalServices} services included</p>
      </div>

      <CardContent className="p-8">
        {/* Package Quick Info */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
              <span className="text-olive-700">Services</span>
            </div>
            <span className="font-semibold text-olive-900">{totalServices}</span>
          </div>
          {packageData.validity_days && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Valid For</span>
              </div>
              <span className="font-semibold text-olive-900">{packageData.validity_days} days</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
              <span className="text-olive-700">Scheduling</span>
            </div>
            <span className="font-semibold text-olive-900">Flexible</span>
          </div>
        </div>

        {/* Included Services */}
        {childServices.length > 0 && (
          <>
            <Separator className="bg-sage-200 mb-6" />
            <div className="mb-6">
              <p className="font-semibold text-olive-900 text-sm mb-3">Package Includes:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {childServices.map((relationship) => (
                  <div key={relationship.id} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span className="text-sm text-olive-800">
                      {relationship.quantity > 1 && `${relationship.quantity}x `}
                      {relationship.child_service.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator className="bg-sage-200 mb-6" />

        <Button
          className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          onClick={handleBookNow}
          size="lg"
        >
          Start Your Journey
        </Button>

        <p className="text-sm text-center text-olive-600 mt-4">
          Instant access - 30-day guarantee
        </p>
      </CardContent>
    </Card>
  )
}
