"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, MapPin, Globe, Calendar, MessageSquare, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Practitioner } from "@/types/practitioner"
import { useAuth } from "@/hooks/use-auth"
import LoginModal from "@/components/auth/login-modal"

interface PractitionerBookingPanelProps {
  practitioner: Practitioner
}

export default function PractitionerBookingPanel({ practitioner }: PractitionerBookingPanelProps) {
  const [isLiked, setIsLiked] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Load liked state from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      setIsLiked(!!savedLikes[practitioner.id])
    } catch (error) {
      console.error("Error loading liked state:", error)
    }
  }, [practitioner.id])

  const handleLikeToggle = useCallback(() => {
    setIsLiked((prev) => {
      const newValue = !prev
      // Save to localStorage
      try {
        const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
        savedLikes[practitioner.id] = newValue
        localStorage.setItem("likedPractitioners", JSON.stringify(savedLikes))
      } catch (error) {
        console.error("Error saving like:", error)
      }
      return newValue
    })
  }, [practitioner.id])

  // Get the first available session if any
  const firstSession = practitioner.services?.find(
    (service) => service.service_type.name === "session" && service.upcoming_sessions?.length > 0,
  )

  // Function to handle the Book a Session button click
  const handleBookSessionClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Get the session offerings element
    const sessionOfferings = document.getElementById("session-offerings")
    // If the element exists, scroll to it
    if (sessionOfferings) {
      sessionOfferings.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated) {
      router.push(`/practitioners/${practitioner.id}/contact`)
    } else {
      setShowLoginModal(true)
    }
  }

  return (
    <Card className="rounded-lg overflow-hidden border">
      <div className="p-6 bg-primary/10 text-foreground">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold mb-1">Book with {practitioner.display_name}</h3>
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${isLiked ? "text-rose-500 border-rose-500" : ""}`}
            onClick={handleLikeToggle}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? "Liked" : "Like"}
          </Button>
        </div>
        <p className="text-sm">
          {practitioner.is_accepting_new_clients
            ? "Currently accepting new clients"
            : "Limited availability for new clients"}
        </p>
      </div>

      <CardContent className="p-6">
        <div className="mb-6">
          <h4 className="text-base font-medium mb-3">Session Information</h4>

          <div className="space-y-3">
            <div className="flex items-start">
              <Clock className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Session Duration</p>
                <p className="text-sm text-muted-foreground">
                  {`${practitioner.min_duration || 30} - ${practitioner.max_duration || 90} minutes`}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Locations</p>
                <p className="text-sm text-muted-foreground">
                  {practitioner.locations.map((l) => l.city_name).join(", ")}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Globe className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Session Types</p>
                <p className="text-sm text-muted-foreground">{practitioner.modalities.map((m) => m.name).join(", ")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-base font-medium mb-3">Pricing</h4>
          <div className="flex justify-between mb-2">
            <p className="text-sm text-muted-foreground">Individual Sessions</p>
            <p className="text-sm font-medium">
              {practitioner.min_price && practitioner.max_price
                ? `$${practitioner.min_price} - $${practitioner.max_price}`
                : "Contact for pricing"}
            </p>
          </div>
          {practitioner.offers_packages && (
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Package Discounts</p>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Available
              </Badge>
            </div>
          )}
        </div>

        {practitioner.next_available_date && (
          <div className="mb-6">
            <h4 className="text-base font-medium mb-3">Availability</h4>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-sm">Next available: {practitioner.next_available_date}</p>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        <Button className="w-full mb-3" size="lg" onClick={handleBookSessionClick}>
          Book a Session
        </Button>

        <Button variant="outline" className="w-full" onClick={handleMessageClick}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Message
        </Button>

        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Free cancellation 24h before session</p>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Secure payment processing</p>
          </div>
        </div>
      </CardContent>
      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectUrl={`/practitioners/${practitioner.id}/contact`}
        serviceType="message"
      />
    </Card>
  )
}
