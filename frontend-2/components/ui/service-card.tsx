"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Calendar, Star, Sparkles, Users, Globe } from "lucide-react"

interface ServiceCardProps {
  id: number | string
  title: string
  type: "one-on-one" | "packages" | "workshops" | "courses"
  description: string
  price: number | string
  duration?: number | string
  sessionCount?: number
  location: string
  date?: string
  capacity?: number
  rating?: number
  reviewCount?: number
  categories: string[]
  practitioner: {
    id: number | string
    name: string
    image?: string
  }
  href: string
  index?: number
}

export default function ServiceCard({
  id,
  title,
  type,
  description,
  price,
  duration,
  sessionCount,
  location,
  date,
  capacity,
  rating,
  reviewCount,
  categories,
  practitioner,
  href,
  index = 0
}: ServiceCardProps) {
  // Get service type label
  const getServiceTypeLabel = () => {
    switch (type) {
      case "one-on-one":
        return "Personal Session"
      case "packages":
        return "Transformation Package"
      case "workshops":
        return "Group Workshop"
      case "courses":
        return "Learning Journey"
      default:
        return type
    }
  }

  // Get CTA text based on service type
  const getCtaText = () => {
    switch (type) {
      case "courses":
        return "Start Journey"
      case "workshops":
        return "Reserve Spot"
      case "packages":
        return "View Package"
      default:
        return "Book Session"
    }
  }

  // Get badge variant based on service type
  const getBadgeVariant = () => {
    switch (type) {
      case "courses":
        return "terracotta"
      case "workshops":
        return "sage"
      case "packages":
        return "blush"
      default:
        return "olive"
    }
  }

  return (
    <Link href={href} className="group block h-full animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
      <Card className="h-full w-full flex flex-col border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden">
        {/* Card Header with Gradient */}
        <div className="bg-gradient-to-br from-terracotta-100 to-sage-100 p-6 pb-12 relative flex-shrink-0">
          {/* Rating Badge (if available) */}
          {rating && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" />
                <span className="text-sm font-medium text-olive-800">{rating}</span>
              </div>
            </div>
          )}

          <Badge variant={getBadgeVariant()} className="mb-3">
            <Sparkles className="h-3 w-3 mr-1" strokeWidth="1.5" />
            {getServiceTypeLabel()}
          </Badge>

          <h3 className="font-semibold text-xl text-olive-900 mb-2 line-clamp-2 pr-12">{title}</h3>

          <p className="text-olive-700 text-sm line-clamp-2">{description}</p>
        </div>

        <CardContent className="relative flex flex-col flex-1 p-6 bg-cream-50 -mt-8 rounded-t-[2.5rem] z-10">
          {/* Practitioner Info */}
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center flex-shrink-0">
              {practitioner.image ? (
                <img
                  src={practitioner.image}
                  alt={practitioner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-olive-800">
                  {practitioner.name.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-olive-900 truncate">{practitioner.name}</p>
              <p className="text-sm text-olive-600 truncate">{location}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4 flex-shrink-0">
            {/* Date for workshops */}
            {date && (
              <div className="flex items-center gap-2 text-olive-700">
                <Calendar className="h-4 w-4 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                <span className="text-sm">{date}</span>
              </div>
            )}

            {/* Duration */}
            {duration && (
              <div className="flex items-center gap-2 text-olive-700">
                <Clock className="h-4 w-4 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                <span className="text-sm">
                  {typeof duration === "number" ? `${duration} minutes` : duration}
                </span>
              </div>
            )}

            {/* Session count for packages/courses */}
            {sessionCount && (
              <div className="flex items-center gap-2 text-olive-700">
                <Calendar className="h-4 w-4 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                <span className="text-sm">{sessionCount} sessions</span>
              </div>
            )}

            {/* Location with format indicator */}
            <div className="flex items-center gap-2 text-olive-700">
              {location.toLowerCase() === "virtual" || location.toLowerCase() === "online" ? (
                <>
                  <Globe className="h-4 w-4 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                  <span className="text-sm font-medium text-sage-700">Online</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                  <span className="text-sm truncate">{location}</span>
                </>
              )}
            </div>

            {/* Capacity/Reviews */}
            {(capacity || reviewCount) && (
              <div className="flex items-center gap-2 text-olive-700">
                <Users className="h-4 w-4 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                <span className="text-sm">
                  {capacity ? `${capacity} spots` : `${reviewCount} reviews`}
                </span>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1.5 mb-4 flex-shrink-0">
            {categories.slice(0, 3).map((category) => (
              <span key={category} className="text-xs px-2.5 py-1 bg-sage-100 text-olive-700 rounded-full font-medium">
                {category}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="text-xs text-olive-600">+{categories.length - 3}</span>
            )}
          </div>

          <div className="mt-auto flex justify-between items-center pt-4 border-t border-sage-100 flex-shrink-0">
            <div>
              <p className="text-xs text-olive-600 mb-0.5">Investment</p>
              <p className="text-2xl font-bold text-olive-900">
                {typeof price === "number" ? `$${price}` : price}
              </p>
            </div>

            <Button size="sm" className="shadow-md hover:shadow-lg group-hover:translate-x-0.5 transition-all flex-shrink-0">
              {getCtaText()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}