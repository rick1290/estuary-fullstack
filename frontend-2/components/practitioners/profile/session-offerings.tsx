"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, User, Package, ShoppingBag } from "lucide-react"
import { getServiceDetailUrl, getServiceCtaText } from "@/lib/service-utils"

// Format price to remove unnecessary decimals (e.g., "5.00" -> "5", "5.50" -> "5.50")
function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numPrice)) return '0'
  // If it's a whole number, don't show decimals
  return numPrice % 1 === 0 ? numPrice.toFixed(0) : numPrice.toFixed(2)
}

// Get fallback icon based on service type
function getServiceIcon(serviceType: string) {
  const type = serviceType?.toLowerCase()
  if (type === "bundle") return Package
  if (type === "package") return ShoppingBag
  return User // Default for sessions
}

interface Session {
  id: string | number
  slug?: string
  public_uuid?: string
  name: string
  description?: string
  price: string
  duration?: number // Legacy field
  duration_minutes?: number // Actual API field
  location_type: string
  image_url?: string
  service_type: {
    id: string
    name: string
    code?: string
  }
  service_type_code?: string
  service_type_display?: string
  category?: {
    id: string
    name: string
  }
  practitioner_category?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
}

interface SessionOfferingsProps {
  sessions: Session[]
  categories: Category[]
  selectedServiceType: string | null
  handleServiceTypeChange: (categoryId: string | null) => void
}

export default function SessionOfferings({
  sessions,
  categories,
  selectedServiceType,
  handleServiceTypeChange,
}: SessionOfferingsProps) {
  if (sessions.length === 0) {
    return null
  }

  return (
    <div className="mt-10 mb-10">
      <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Offerings</p>
      <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Sessions, Bundles & Packages</h2>

      {/* Category Filters */}
      {categories && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            className={`text-xs px-2.5 py-1 rounded-full font-light cursor-pointer transition-all ${
              selectedServiceType === null
                ? "bg-olive-800 text-white"
                : "bg-sage-50 text-olive-600 border border-sage-200/60"
            }`}
            onClick={() => handleServiceTypeChange(null)}
          >
            All Categories
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              className={`text-xs px-2.5 py-1 rounded-full font-light cursor-pointer transition-all ${
                selectedServiceType === category.id
                  ? "bg-olive-800 text-white"
                  : "bg-sage-50 text-olive-600 border border-sage-200/60"
              }`}
              onClick={() => handleServiceTypeChange(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-4">
        {sessions
          .filter(
            (session) => !selectedServiceType || (session.practitioner_category && session.practitioner_category.id === selectedServiceType),
          )
          .map((session) => {
            const serviceType = session.service_type_code || session.service_type?.name || "session"
            const ServiceIcon = getServiceIcon(serviceType)

            return (
              <Card key={session.id} className="overflow-hidden transition-all border border-sage-200/60">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-5">
                    {/* Service Image/Icon */}
                    <div className="flex-shrink-0">
                      {session.image_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-sage-100">
                          <img
                            src={session.image_url}
                            alt={session.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-sage-50 flex items-center justify-center">
                          <ServiceIcon className="h-7 w-7 text-sage-600" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>

                    {/* Service Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-olive-900 mb-1 truncate">{session.name}</h3>

                      <span className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light capitalize inline-block mb-2">
                        {session.service_type_display || serviceType}
                      </span>

                      <div className="flex flex-wrap gap-4 text-xs font-light text-olive-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-sage-500" />
                          <span>{session.duration_minutes || session.duration} minutes</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-sage-500" />
                          <span>{session.location_type.charAt(0).toUpperCase() + session.location_type.slice(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-base font-semibold text-olive-900">{session.price ? `$${formatPrice(session.price)}` : "Free"}</p>

                      <Button asChild size="sm" className="bg-olive-800 hover:bg-olive-700 text-white rounded-full text-sm">
                        <Link href={getServiceDetailUrl(session)}>
                          {getServiceCtaText(serviceType)}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>
    </div>
  )
}
