"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, MapPin, Globe, GraduationCap, Star, Heart } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"

interface PractitionerCardProps {
  practitioner: Practitioner
  initialLiked?: boolean
}

export default function PractitionerCard({ practitioner, initialLiked = false }: PractitionerCardProps) {
  const [isLiked, setIsLiked] = useState(initialLiked)

  // Determine location type
  const hasVirtual = practitioner.locations.some((loc) => loc.is_virtual)
  const hasInPerson = practitioner.locations.some((loc) => loc.is_in_person)
  let locationType = "Unknown"

  if (hasVirtual && hasInPerson) {
    locationType = "Virtual & In-Person"
  } else if (hasVirtual) {
    locationType = "Virtual Only"
  } else if (hasInPerson) {
    locationType = "In-Person Only"
  }

  // Get primary location
  const primaryLocation = practitioner.locations.find((loc) => loc.is_primary)

  const handleLikeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setIsLiked((prev) => {
        const newValue = !prev
        // In a real app, you would save this to the user's profile/database
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
    <Card className="group h-full overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-warm-100 to-warm-200">
        {practitioner.profile_image_url ? (
          <img
            src={practitioner.profile_image_url}
            alt={practitioner.display_name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        
        {/* Verified Badge */}
        {practitioner.is_verified && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Verified</span>
          </div>
        )}
        
        {/* Like Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full h-8 w-8 hover:bg-white"
          onClick={handleLikeToggle}
          aria-label={isLiked ? "Unlike practitioner" : "Like practitioner"}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : "text-gray-600"}`} />
        </Button>
      </div>

      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Name and Title */}
          <div>
            <h3 className="text-xl font-medium text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
              {practitioner.display_name}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">{practitioner.title}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="ml-1 font-medium text-sm">{practitioner.average_rating_float}</span>
            </div>
            <span className="text-sm text-gray-500">({practitioner.total_reviews} reviews)</span>
          </div>

          {/* Specializations */}
          <div className="flex flex-wrap gap-1.5">
            {practitioner.specializations.slice(0, 3).map((specialization) => (
              <span key={specialization.id} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                {specialization.content}
              </span>
            ))}
            {practitioner.specializations.length > 3 && (
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
                +{practitioner.specializations.length - 3}
              </span>
            )}
          </div>

          {/* Location and Experience */}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">
                {locationType}
                {primaryLocation && ` • ${primaryLocation.city_name}, ${primaryLocation.state_abbreviation}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>{practitioner.years_of_experience} years experience</span>
            </div>
          </div>

          {/* Short Bio */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {practitioner.bio_short ||
              "Experienced practitioner dedicated to helping clients achieve their wellness goals through personalized approaches and evidence-based techniques."}
          </p>

          {/* Modalities */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{practitioner.modalities.map((m) => m.name).join(", ")}</span>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100">
        <Button asChild className="w-full shadow-sm">
          <Link href={`/practitioners/${practitioner.id}`}>View Profile</Link>
        </Button>
      </div>
    </Card>
  )
}