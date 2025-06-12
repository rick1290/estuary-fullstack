"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, MapPin, Globe, Calendar, MessageSquare, Heart, Sparkles } from "lucide-react"
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
    <Card className="border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden animate-fade-in" style={{animationDelay: '0.3s'}}>
      <div className="bg-gradient-to-br from-sage-100 to-terracotta-100 p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-terracotta-600" strokeWidth="1.5" />
          <p className="text-sm text-olive-700 font-medium">Begin Your Transformation</p>
        </div>
        <p className="text-lg font-semibold text-olive-900 mb-1">{practitioner.display_name}</p>
        <p className="text-olive-600 text-sm">
          {practitioner.is_accepting_new_clients
            ? "Now accepting new clients"
            : "Limited availability"}
        </p>
      </div>

      <CardContent className="p-8">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-olive-900 mb-4">Session Details</h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Duration</span>
              </div>
              <span className="font-semibold text-olive-900">
                {`${practitioner.min_duration || 30} - ${practitioner.max_duration || 90} min`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Locations</span>
              </div>
              <span className="font-semibold text-olive-900 text-right max-w-[50%]">
                {practitioner.locations.map((l) => l.city_name).join(", ")}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-sage-600 mt-0.5" strokeWidth="1.5" />
                <span className="text-olive-700">Modalities</span>
              </div>
              <div className="text-right max-w-[50%]">
                <span className="font-semibold text-olive-900">{practitioner.modalities.slice(0, 3).map((m) => m.name).join(", ")}</span>
                {practitioner.modalities.length > 3 && (
                  <span className="text-olive-600 text-sm block">+{practitioner.modalities.length - 3} more</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-sage-200 my-6" />

        <div className="mb-6">
          <h4 className="text-lg font-semibold text-olive-900 mb-4">Investment</h4>
          <div className="bg-sage-50 rounded-xl p-4 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-olive-700">Individual Sessions</span>
              <span className="text-xl font-bold text-olive-900">
                {practitioner.min_price && practitioner.max_price
                  ? `$${practitioner.min_price} - $${practitioner.max_price}`
                  : "Contact for pricing"}
              </span>
            </div>
          </div>
          {practitioner.offers_packages && (
            <Badge variant="sage" className="w-full justify-center py-2">
              <Sparkles className="h-3.5 w-3.5 mr-1" strokeWidth="1.5" />
              Package Discounts Available
            </Badge>
          )}
        </div>

        {practitioner.next_available_date && (
          <div className="mb-6 bg-terracotta-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-terracotta-600" strokeWidth="1.5" />
              <div>
                <p className="text-sm text-olive-700">Next availability</p>
                <p className="font-semibold text-olive-900">{practitioner.next_available_date}</p>
              </div>
            </div>
          </div>
        )}

        <Button 
          className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all mb-3" 
          size="lg" 
          onClick={handleBookSessionClick}
        >
          Begin Your Journey
        </Button>

        <Button 
          variant="outline" 
          className="w-full py-5 hover:bg-sage-50 transition-all group" 
          onClick={handleMessageClick}
        >
          <MessageSquare className="mr-2 h-4 w-4 group-hover:text-sage-600" strokeWidth="1.5" />
          Send a Message
        </Button>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-olive-600">
            <div className="w-5 h-5 rounded-full bg-sage-200 flex items-center justify-center">
              <Check className="h-3 w-3 text-sage-700" strokeWidth="2" />
            </div>
            <p className="text-sm">Free cancellation 24h before</p>
          </div>
          <div className="flex items-center gap-3 text-olive-600">
            <div className="w-5 h-5 rounded-full bg-sage-200 flex items-center justify-center">
              <Check className="h-3 w-3 text-sage-700" strokeWidth="2" />
            </div>
            <p className="text-sm">Secure & trusted payments</p>
          </div>
          <div className="flex items-center gap-3 text-olive-600">
            <div className="w-5 h-5 rounded-full bg-sage-200 flex items-center justify-center">
              <Check className="h-3 w-3 text-sage-700" strokeWidth="2" />
            </div>
            <p className="text-sm">100% satisfaction guarantee</p>
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
