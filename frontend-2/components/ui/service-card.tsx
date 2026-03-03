"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Calendar, Star, Sparkles, Users, Globe } from "lucide-react"

interface ServiceCardProps {
  id: number | string
  title: string
  type: "one-on-one" | "packages" | "bundles" | "workshops" | "courses"
  description: string
  price: number | string
  duration?: number | string
  sessionCount?: number
  sessionsIncluded?: number
  savingsPercentage?: number
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
  image?: string
  href: string
  index?: number
  firstSessionDate?: string
  nextSessionDate?: string
}

export default function ServiceCard({
  id,
  title,
  type,
  description,
  price,
  duration,
  sessionCount,
  sessionsIncluded,
  savingsPercentage,
  location,
  date,
  capacity,
  rating,
  reviewCount,
  categories,
  practitioner,
  image,
  href,
  index = 0,
  firstSessionDate,
  nextSessionDate
}: ServiceCardProps) {
  // Get service type label
  const getServiceTypeLabel = () => {
    switch (type) {
      case "one-on-one":
        return "Personal Session"
      case "bundles":
        return "Session Bundle"
      case "packages":
        return "Wellness Package"
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
      case "bundles":
        return "View Bundle"
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
      case "bundles":
        return "terracotta"
      case "packages":
        return "blush"
      default:
        return "olive"
    }
  }

  const initials = practitioner.name.split(' ').map(n => n[0]).filter(Boolean).join('')

  // Check if the image is a real URL (not a local placeholder path)
  const hasServiceImage = image && (image.startsWith('http') || image.startsWith('data:'))

  return (
    <Link href={href} className="group block animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
      <Card className="bg-white border border-sage-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl cursor-pointer overflow-hidden">
        {/* Cover Image */}
        {hasServiceImage ? (
          <div className="relative w-full h-40 overflow-hidden bg-gradient-to-br from-cream-50 to-sage-50">
            <img
              src={image}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="relative w-full h-28 overflow-hidden bg-gradient-to-br from-cream-50 via-sage-50 to-terracotta-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-sage-300" strokeWidth="1" />
            </div>
          </div>
        )}

        <CardContent className="p-5">
          {/* Service type badge + rating */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getBadgeVariant()} className="text-[10px]">
              <Sparkles className="h-2.5 w-2.5 mr-1" strokeWidth="1.5" />
              {getServiceTypeLabel()}
            </Badge>
            {savingsPercentage && savingsPercentage > 0 ? (
              <span className="text-[10px] font-medium text-terracotta-600 bg-terracotta-50 px-2 py-0.5 rounded-full">
                Save {savingsPercentage}%
              </span>
            ) : rating ? (
              <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                <Star className="h-3 w-3 text-terracotta-400 fill-terracotta-400" strokeWidth="1.5" />
                <span className="font-medium text-olive-800">{rating}</span>
              </span>
            ) : null}
          </div>

          {/* Title */}
          <h3 className="text-base font-medium text-olive-900 group-hover:text-sage-700 transition-colors line-clamp-1">
            {title}
          </h3>

          {/* Practitioner avatar + name */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="relative w-5 h-5 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-terracotta-100 to-sage-100">
              {practitioner.image ? (
                <img
                  src={practitioner.image}
                  alt={practitioner.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-serif font-medium text-olive-700/40">
                    {initials}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[13px] font-light text-olive-500 truncate">
              {practitioner.name} · {location.toLowerCase() === "virtual" || location.toLowerCase() === "online" ? "Online" : location}
            </p>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-olive-600 mt-3 line-clamp-2 leading-relaxed">{description}</p>
          )}

          {/* Meta items row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
            {/* Date for workshops */}
            {type === "workshops" && (nextSessionDate || date) && (
              <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                <Calendar className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                {nextSessionDate
                  ? `Next: ${new Date(nextSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : date}
              </span>
            )}

            {/* Start date for courses */}
            {type === "courses" && firstSessionDate && (
              <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                <Calendar className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                Starts {new Date(firstSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {/* Duration */}
            {duration && (
              <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                <Clock className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                {typeof duration === "number" ? `${duration} min` : duration}
              </span>
            )}

            {/* Session count */}
            {sessionCount && (
              <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                <Calendar className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                {sessionCount} sessions
              </span>
            )}

            {/* Sessions included for bundles */}
            {sessionsIncluded && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-olive-600">
                <Calendar className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                {sessionsIncluded} sessions included
              </span>
            )}

            {/* Location */}
            <span className="inline-flex items-center gap-1 text-xs text-olive-500">
              {location.toLowerCase() === "virtual" || location.toLowerCase() === "online" ? (
                <>
                  <Globe className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                  Online
                </>
              ) : (
                <>
                  <MapPin className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                  {location}
                </>
              )}
            </span>

            {/* Capacity/Reviews */}
            {(capacity || reviewCount) && (
              <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                <Users className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                {capacity ? `${capacity} spots` : `${reviewCount} reviews`}
              </span>
            )}
          </div>

          {/* Category tags */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {categories.slice(0, 3).map((category) => (
                <span key={category} className="text-[11px] px-2.5 py-0.5 bg-cream-50 border border-sage-200 text-olive-600 rounded-full">
                  {category}
                </span>
              ))}
              {categories.length > 3 && (
                <span className="text-[11px] px-2.5 py-0.5 bg-cream-50 border border-sage-200 text-olive-400 rounded-full">
                  +{categories.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer: Price + CTA on same line */}
          <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-sage-100">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold text-olive-900">
                {typeof price === "number" ? `$${price}` : price}
              </span>
              <span className="text-[11px] text-olive-400 font-light">investment</span>
            </div>
            <span className="bg-olive-900 hover:bg-olive-800 text-cream-50 rounded-full px-5 py-2 text-[13px] font-medium flex-shrink-0 transition-colors">
              {getCtaText()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
