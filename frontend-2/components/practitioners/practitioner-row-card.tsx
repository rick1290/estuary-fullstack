"use client"

import type React from "react"
import { useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, MapPin, Star, Heart, Clock, DollarSign } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { userAddFavorite, userRemoveFavorite } from "@/src/client/sdk.gen"
import { toast } from "sonner"
import { useUserFavorites } from "@/hooks/use-user-favorites"

interface PractitionerRowCardProps {
  practitioner: Practitioner
  initialLiked?: boolean
}

export default function PractitionerRowCard({ practitioner, initialLiked = false }: PractitionerRowCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoritePractitionerIds, refetch: refetchFavorites } = useUserFavorites()

  // Determine if practitioner is liked based on auth state
  const isLiked = isAuthenticated
    ? favoritePractitionerIds.has(practitioner.id)
    : (() => {
        try {
          const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
          const practitionerId = practitioner.public_uuid || practitioner.id
          return !!savedLikes[practitionerId]
        } catch {
          return initialLiked
        }
      })()

  // Get primary location for meta display
  const locations = practitioner.locations || (practitioner.primary_location ? [practitioner.primary_location] : [])
  const primaryLocation = practitioner.primary_location || locations.find((loc) => loc.is_primary) || locations[0]

  const handleLikeToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!isAuthenticated) {
        // Save to localStorage and open auth modal
        try {
          const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
          const practitionerId = practitioner.public_uuid || practitioner.id
          savedLikes[practitionerId] = !isLiked
          localStorage.setItem("likedPractitioners", JSON.stringify(savedLikes))
        } catch (error) {
          console.error("Error saving like to localStorage:", error)
        }

        openAuthModal({
          defaultTab: "login",
          title: "Sign in to Save Practitioners",
          description: "Create an account to save your favorite practitioners and receive updates"
        })
        return
      }

      setIsLoading(true)
      try {
        if (!isLiked) {
          // Add to favorites
          await userAddFavorite({
            body: {
              practitioner_id: practitioner.id
            }
          })
          toast.success("Practitioner saved to favorites")
        } else {
          // Remove from favorites
          await userRemoveFavorite({
            path: {
              practitioner_id: practitioner.id
            }
          })
          toast.success("Practitioner removed from favorites")
        }

        // Update localStorage for consistency
        const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
        const practitionerId = practitioner.public_uuid || practitioner.id
        savedLikes[practitionerId] = !isLiked
        localStorage.setItem("likedPractitioners", JSON.stringify(savedLikes))

        // Refetch favorites to update the UI
        await refetchFavorites()
      } catch (error) {
        console.error("Error toggling favorite:", error)
        toast.error("Failed to update favorite status")
      } finally {
        setIsLoading(false)
      }
    },
    [practitioner.public_uuid, practitioner.id, isLiked, isAuthenticated, openAuthModal, refetchFavorites],
  )

  const displayName = practitioner.display_name || `${practitioner.user?.first_name || ''} ${practitioner.user?.last_name || ''}`.trim() || 'Practitioner'

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Rotate gradient backgrounds so each practitioner looks distinct
  const gradientPairs = [
    "from-sage-200 to-terracotta-100",
    "from-terracotta-200 to-cream-200",
    "from-olive-200 to-sage-100",
    "from-cream-300 to-terracotta-200",
    "from-sage-100 to-olive-200",
    "from-terracotta-100 to-sage-200",
  ]
  const nameHash = displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const avatarGradient = gradientPairs[nameHash % gradientPairs.length]

  const profileUrl = `/practitioners/${practitioner.slug || practitioner.public_uuid || practitioner.id}`

  // Location display string
  const locationDisplay = primaryLocation?.city_name
    ? `${primaryLocation.city_name}, ${primaryLocation.state_abbreviation}`
    : "Location not specified"

  // Price range display string
  const priceDisplay = practitioner.price_range && (practitioner.price_range.min || practitioner.price_range.max)
    ? practitioner.price_range.min && practitioner.price_range.max
      ? practitioner.price_range.min === practitioner.price_range.max
        ? `$${practitioner.price_range.min}`
        : `$${practitioner.price_range.min} – $${practitioner.price_range.max}`
      : practitioner.price_range.min
        ? `From $${practitioner.price_range.min}`
        : `Up to $${practitioner.price_range.max}`
    : null

  return (
    <Link href={profileUrl} className="block">
      <Card className="bg-white border border-[rgba(74,63,53,0.05)] hover:shadow-[0_16px_48px_rgba(74,63,53,0.08)] hover:-translate-y-1 transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] rounded-2xl group cursor-pointer relative">
        {/* Featured accent bar */}
        {practitioner.is_featured && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-terracotta-400 to-sage-400 rounded-t-xl" />
        )}
        <CardContent className="p-3 sm:p-5">
          <div className="flex gap-3 sm:gap-4">
            {/* Left: Avatar */}
            <div className="relative flex-shrink-0">
              <div className={`w-24 h-24 max-sm:w-18 max-sm:h-18 rounded-2xl overflow-hidden bg-gradient-to-br ${avatarGradient}`}>
                {practitioner.profile_image_url ? (
                  <img
                    src={practitioner.profile_image_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl max-sm:text-lg font-serif font-normal text-olive-700/30">
                      {getInitials(displayName)}
                    </span>
                  </div>
                )}
              </div>
              {/* Verified overlay badge */}
              {practitioner.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle className="h-4 w-4 text-sage-600 fill-sage-100" strokeWidth="1.5" />
                </div>
              )}
            </div>

            {/* Right: Content */}
            <div className="flex-1 min-w-0">
              {/* Row 1: Name + Heart */}
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-[#4A3F35] group-hover:text-[#C4956A] transition-colors truncate">
                  {displayName}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-7 w-7 ml-auto flex-shrink-0 hover:bg-sage-50"
                  onClick={handleLikeToggle}
                  disabled={isLoading}
                  aria-label={isLiked ? "Unlike practitioner" : "Like practitioner"}
                >
                  <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? "fill-rose-500 text-rose-500" : "text-olive-500 hover:text-rose-500"}`} strokeWidth="1.5" />
                </Button>
              </div>

              {/* Row 2: Professional Title */}
              <p className="text-[13px] font-light text-olive-500 mt-0.5">
                {practitioner.professional_title || practitioner.title}
              </p>

              {/* Row 3: Meta items — individual flex-wrap spans with icons */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                {/* Rating */}
                <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                  <Star className="h-3 w-3 text-terracotta-400 fill-terracotta-400" strokeWidth="1.5" />
                  <span className="font-medium text-olive-800">{practitioner.average_rating || practitioner.average_rating_float || "–"}</span>
                  <span className="text-olive-500">({practitioner.total_reviews || 0} reviews)</span>
                </span>

                {/* Location */}
                <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                  <MapPin className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                  {locationDisplay}
                </span>

                {/* Price Range */}
                {priceDisplay && (
                  <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                    <DollarSign className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                    <span className="font-medium text-olive-800">{priceDisplay}</span>
                  </span>
                )}

                {/* Experience */}
                {practitioner.years_of_experience && (
                  <span className="inline-flex items-center gap-1 text-xs text-olive-500">
                    <Clock className="h-3 w-3 text-sage-500" strokeWidth="1.5" />
                    {practitioner.years_of_experience} years experience
                  </span>
                )}
              </div>

              {/* Specialty tags + View Profile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2.5">
                {practitioner.specializations && practitioner.specializations.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                    {practitioner.specializations.slice(0, 4).map((specialization) => (
                      <span
                        key={specialization.id}
                        className="text-[11px] px-2.5 py-0.5 bg-[#E8EDE4] text-[#6B6560] rounded-full"
                      >
                        {specialization.content}
                      </span>
                    ))}
                    {practitioner.specializations.length > 4 && (
                      <span className="text-[11px] px-2.5 py-0.5 bg-cream-50 border border-sage-200 text-olive-500 rounded-full">
                        +{practitioner.specializations.length - 4}
                      </span>
                    )}
                  </div>
                ) : (practitioner.bio_short || practitioner.bio) ? (
                  <p className="text-xs italic font-light text-olive-500 line-clamp-1 flex-1 min-w-0">
                    {practitioner.bio_short || practitioner.bio}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}
                <span className="bg-[#4A3F35] hover:bg-[#5c4f42] text-white rounded-full px-4 py-1.5 text-[11px] sm:text-[12px] font-medium flex-shrink-0 transition-colors whitespace-nowrap self-start sm:self-auto">
                  View Profile
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
