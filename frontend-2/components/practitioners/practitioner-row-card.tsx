"use client"

import type React from "react"
import { useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, MapPin, Globe, GraduationCap, Star, Heart, Clock, DollarSign, Video } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"

interface PractitionerRowCardProps {
  practitioner: Practitioner
  initialLiked?: boolean
}

export default function PractitionerRowCard({ practitioner, initialLiked = false }: PractitionerRowCardProps) {
  const [isLiked, setIsLiked] = useState(initialLiked)

  // Determine location type
  const hasVirtual = practitioner.locations.some((loc) => loc.is_virtual)
  const hasInPerson = practitioner.locations.some((loc) => loc.is_in_person)
  
  // Get primary location
  const primaryLocation = practitioner.locations.find((loc) => loc.is_primary)

  const handleLikeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setIsLiked((prev) => {
        const newValue = !prev
        try {
          const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
          savedLikes[practitioner.id] = newValue
          localStorage.setItem("likedPractitioners", JSON.stringify(savedLikes))
        } catch (error) {
          console.error("Error saving like:", error)
        }
        return newValue
      })
    },
    [practitioner.id],
  )

  return (
    <Link href={`/practitioners/${practitioner.id}`} className="block group">
      <Card className="overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-200">
        <CardContent className="p-0">
          <div className="flex">
            {/* Left: Profile Image */}
            <div className="relative w-48 h-48 flex-shrink-0 bg-gradient-to-br from-warm-100 to-warm-200">
              {practitioner.profile_image_url ? (
                <img
                  src={practitioner.profile_image_url}
                  alt={practitioner.display_name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-white/80 flex items-center justify-center">
                    <span className="text-3xl font-medium text-warm-600">
                      {practitioner.display_name.charAt(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Content */}
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {/* Name and Title */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                      {practitioner.display_name}
                    </h3>
                    {practitioner.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">{practitioner.title}</p>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 font-medium text-sm">{practitioner.average_rating_float}</span>
                    </div>
                    <span className="text-sm text-gray-500">({practitioner.total_reviews} reviews)</span>
                  </div>
                </div>

                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={handleLikeToggle}
                  aria-label={isLiked ? "Unlike practitioner" : "Like practitioner"}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : "text-gray-400"}`} />
                </Button>
              </div>

              {/* Bio */}
              <p className="text-gray-600 mb-4 line-clamp-2">
                {practitioner.bio_short ||
                  "Experienced practitioner dedicated to helping clients achieve their wellness goals through personalized approaches and evidence-based techniques."}
              </p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {primaryLocation 
                        ? `${primaryLocation.city_name}, ${primaryLocation.state_abbreviation}`
                        : "Location not specified"}
                    </span>
                  </div>
                  
                  {/* Experience */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{practitioner.years_of_experience} years experience</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Session Types */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Video className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {hasVirtual && hasInPerson 
                        ? "Virtual & In-Person" 
                        : hasVirtual 
                        ? "Virtual Only" 
                        : "In-Person Only"}
                    </span>
                  </div>
                  
                  {/* Price Range (mock data) */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>$80 - $150 per session</span>
                  </div>
                </div>
              </div>

              {/* Specializations */}
              <div className="flex items-start gap-2 mb-4">
                <span className="text-sm text-gray-500 mt-0.5">Specializes in:</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {practitioner.specializations.slice(0, 4).map((specialization) => (
                    <span key={specialization.id} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md">
                      {specialization.content}
                    </span>
                  ))}
                  {practitioner.specializations.length > 4 && (
                    <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-md">
                      +{practitioner.specializations.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Modalities */}
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-500 mt-0.5">Approaches:</span>
                <p className="text-sm text-gray-600 flex-1 line-clamp-1">
                  {practitioner.modalities.map((m) => m.name).join(", ")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}