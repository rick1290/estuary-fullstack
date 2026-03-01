"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Star, Users, Check, Heart, MessageCircle, Share2 } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { userAddFavorite, userRemoveFavorite } from "@/src/client/sdk.gen"
import { toast } from "sonner"
import { useUserFavorites } from "@/hooks/use-user-favorites"

interface PractitionerHeaderProps {
  practitioner: Practitioner
  onMessageClick?: () => void
}

export default function PractitionerHeader({ practitioner, onMessageClick }: PractitionerHeaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoritePractitionerIds, refetch: refetchFavorites } = useUserFavorites()
  
  // Check if this practitioner is favorited
  const isLiked = favoritePractitionerIds.has(practitioner.id || practitioner.public_uuid)


  const handleLikeToggle = useCallback(async () => {
    if (!isAuthenticated) {
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
      
      // Refetch favorites to update the UI
      await refetchFavorites()
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error("Failed to update favorite status")
    } finally {
      setIsLoading(false)
    }
  }, [practitioner.id, isLiked, isAuthenticated, openAuthModal, refetchFavorites])
  return (
    <div className="bg-white rounded-2xl border border-sage-200/60 overflow-hidden">
      {/* Compact Header Section */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden bg-sage-100">
                {practitioner.profile_image_url ? (
                  <img
                    src={practitioner.profile_image_url}
                    alt={practitioner.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl lg:text-5xl font-bold text-olive-800">
                      {practitioner.display_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
              </div>
              {practitioner.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-olive-800 text-white rounded-full p-1.5">
                  <Check className="h-4 w-4" strokeWidth="2.5" />
                </div>
              )}
            </div>
          </div>

          {/* Main Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-olive-900 mb-3 leading-[1.15]">
                  {practitioner.display_name}
                </h1>
                <p className="text-[15px] font-light text-olive-600 leading-relaxed mb-3">{practitioner.title}</p>
                
                {/* Key Stats - Horizontal */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-light">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" />
                    <span className="font-medium text-olive-900">{practitioner.average_rating_float}</span>
                    <span className="text-olive-600">({practitioner.total_reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sage-500" />
                    <span className="text-olive-700">{practitioner.years_of_experience}+ years</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-sage-500" />
                    <span className="text-olive-700">{practitioner.total_services} services</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sage-500" />
                    <span className="text-olive-700">
                      {(() => {
                        // Handle both API structures: primary_location object or locations array
                        const primaryLocation = practitioner.primary_location || 
                          (practitioner.locations && practitioner.locations.find((loc) => loc.is_primary)) ||
                          (practitioner.locations && practitioner.locations[0]);
                        return primaryLocation?.city_name || "Virtual";
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Top Right */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-olive-500 hover:text-olive-700 hover:bg-sage-50"
                  onClick={() => {
                    navigator.share({
                      title: practitioner.display_name,
                      text: `Check out ${practitioner.display_name} on Estuary`,
                      url: window.location.href
                    }).catch(() => {
                      // Fallback to copy link
                      navigator.clipboard.writeText(window.location.href)
                    })
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-olive-500 hover:text-olive-700 hover:bg-sage-50"
                  onClick={handleLikeToggle}
                  disabled={isLoading}
                  aria-label={isLiked ? "Unlike practitioner" : "Like practitioner"}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Specialties - Compact */}
            <div className="mt-4">
              <div className="flex flex-wrap gap-1.5">
                {practitioner.specializations.slice(0, 4).map((spec) => (
                  <span
                    key={spec.id}
                    className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light"
                  >
                    {spec.content}
                  </span>
                ))}
                {practitioner.specializations.length > 4 && (
                  <span
                    className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light"
                  >
                    +{practitioner.specializations.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quote - If exists */}
        {practitioner.quote && (
          <div className="mt-6 p-4 bg-cream-100/60 rounded-2xl border border-sage-200/60">
            <p className="text-olive-700 font-light italic">"{practitioner.quote}"</p>
          </div>
        )}

        {/* Primary Actions - Message Button */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            size="default"
            className="flex-1 sm:flex-none rounded-full"
            onClick={onMessageClick}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          {practitioner.is_verified && (
            <span className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light inline-flex items-center">
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Verified Expert
            </span>
          )}
        </div>
      </div>
    </div>
  )
}