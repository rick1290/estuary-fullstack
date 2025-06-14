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

  // Dummy avatar images for different practitioners
  const getDummyAvatar = (practitionerId: string) => {
    // Use consistent pravatar.cc images based on practitioner ID
    const imageNumbers = [47, 33, 44, 12, 32, 52, 48, 68, 91, 15]
    const index = practitioner.id.charCodeAt(0) % imageNumbers.length
    return `https://i.pravatar.cc/200?img=${imageNumbers[index]}`
  }

  return (
    <Card className="overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-2xl group">
      <CardContent className="p-0">
        <div className="flex">
          {/* Left: Profile Image */}
          <div className="relative w-48 h-48 flex-shrink-0 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-l-2xl overflow-hidden">
            <img
              src={practitioner.profile_image_url || getDummyAvatar(practitioner.id)}
              alt={practitioner.display_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

            {/* Right: Content */}
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {/* Name and Title */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-olive-900 group-hover:text-sage-700 transition-colors">
                      {practitioner.display_name}
                    </h3>
                    {practitioner.is_verified && (
                      <Badge className="gap-1 bg-sage-100 text-olive-700 hover:bg-sage-200 rounded-full">
                        <CheckCircle className="h-3 w-3" strokeWidth="1.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-olive-600 mt-1">{practitioner.title}</p>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-terracotta-500 fill-terracotta-500" strokeWidth="1.5" />
                      <span className="ml-1 font-medium text-sm text-olive-800">{practitioner.average_rating_float}</span>
                    </div>
                    <span className="text-sm text-olive-500">({practitioner.total_reviews} reviews)</span>
                  </div>
                </div>

                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8 hover:bg-sage-50"
                  onClick={handleLikeToggle}
                  aria-label={isLiked ? "Unlike practitioner" : "Like practitioner"}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : "text-olive-400 hover:text-rose-500"}`} strokeWidth="1.5" />
                </Button>
              </div>

              {/* Bio */}
              <p className="text-olive-600 mb-4 line-clamp-2 leading-relaxed">
                {practitioner.bio_short ||
                  "Experienced practitioner dedicated to helping clients achieve their wellness goals through personalized approaches and evidence-based techniques."}
              </p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-olive-600">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-sage-600" strokeWidth="1.5" />
                    <span>
                      {primaryLocation 
                        ? `${primaryLocation.city_name}, ${primaryLocation.state_abbreviation}`
                        : "Location not specified"}
                    </span>
                  </div>
                  
                  {/* Experience */}
                  <div className="flex items-center gap-2 text-sm text-olive-600">
                    <GraduationCap className="h-3.5 w-3.5 flex-shrink-0 text-sage-600" strokeWidth="1.5" />
                    <span>{practitioner.years_of_experience} years experience</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Session Types */}
                  <div className="flex items-center gap-2 text-sm text-olive-600">
                    <Video className="h-3.5 w-3.5 flex-shrink-0 text-sage-600" strokeWidth="1.5" />
                    <span>
                      {hasVirtual && hasInPerson 
                        ? "Virtual & In-Person" 
                        : hasVirtual 
                        ? "Virtual Only" 
                        : "In-Person Only"}
                    </span>
                  </div>
                  
                  {/* Price Range (mock data) */}
                  <div className="flex items-center gap-2 text-sm text-olive-600">
                    <DollarSign className="h-3.5 w-3.5 flex-shrink-0 text-sage-600" strokeWidth="1.5" />
                    <span>$80 - $150 per session</span>
                  </div>
                </div>
              </div>

              {/* Specializations */}
              <div className="flex items-start gap-2 mb-4">
                <span className="text-sm text-olive-500 mt-0.5">Specializes in:</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {practitioner.specializations.slice(0, 4).map((specialization) => (
                    <span key={specialization.id} className="text-xs px-2.5 py-1 bg-sage-100 text-olive-700 rounded-full">
                      {specialization.content}
                    </span>
                  ))}
                  {practitioner.specializations.length > 4 && (
                    <span className="text-xs px-2.5 py-1 bg-sage-100 text-olive-500 rounded-full">
                      +{practitioner.specializations.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Modalities */}
              <div className="flex items-start gap-2 mb-6">
                <span className="text-sm text-olive-500 mt-0.5">Approaches:</span>
                <p className="text-sm text-olive-600 flex-1 line-clamp-1">
                  {practitioner.modalities.map((m) => m.name).join(", ")}
                </p>
              </div>
              
              {/* View Profile Button */}
              <div className="flex justify-end">
                <Link href={`/practitioners/${practitioner.id}`}>
                  <Button className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 rounded-xl px-6 shadow-lg">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  )
}