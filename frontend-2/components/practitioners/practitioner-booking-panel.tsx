"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, MapPin, Globe, Calendar, MessageSquare, Heart, Sparkles, Rss, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Practitioner } from "@/types/practitioner"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface PractitionerBookingPanelProps {
  practitioner: Practitioner
}

export default function PractitionerBookingPanel({ practitioner }: PractitionerBookingPanelProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

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

  // Function to handle the Book a Session button click
  const handleBookSessionClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const sessionOfferings = document.getElementById("session-offerings")
    if (sessionOfferings) {
      sessionOfferings.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated) {
      router.push(`/practitioners/${practitioner.id}/contact`)
    } else {
      openAuthModal({
        redirectUrl: `/practitioners/${practitioner.id}`,
        serviceType: "message",
        title: "Sign in to Connect",
        description: `Connect with ${practitioner.display_name} and begin your wellness journey`
      })
    }
  }

  const handleSubscribeClick = () => {
    setIsSubscribed(!isSubscribed)
    // In real app, this would handle subscription logic
  }

  return (
    <>
      <Card className="border border-sage-100 bg-white shadow-sm overflow-hidden sticky top-24">
        {/* Price Header */}
        <div className="bg-gradient-to-br from-sage-50 to-terracotta-50 p-6 text-center">
          <p className="text-sm text-olive-600 mb-2">Session Investment</p>
          <p className="text-3xl font-bold text-olive-900">
            {practitioner.min_price && practitioner.max_price
              ? `$${practitioner.min_price} - $${practitioner.max_price}`
              : "Contact for pricing"}
          </p>
          {practitioner.next_available_date && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-olive-700">
              <Calendar className="h-4 w-4" />
              Next: {practitioner.next_available_date}
            </div>
          )}
        </div>

        <CardContent className="p-6">
          {/* Primary Actions */}
          <div className="space-y-3 mb-6">
            <Button 
              className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800" 
              size="lg" 
              onClick={handleBookSessionClick}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Book a Session
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleMessageClick}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Subscribe to Streams */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rss className="h-4 w-4 text-sage-600" />
                <span className="text-sm font-medium text-olive-800">Estuary Streams</span>
              </div>
              <Badge variant="sage" className="text-xs">Free</Badge>
            </div>
            <p className="text-xs text-olive-600 mb-3">
              Get updates, insights, and exclusive content from {practitioner.display_name.split(' ')[0]}
            </p>
            <Button
              variant={isSubscribed ? "secondary" : "outline"}
              size="sm"
              className="w-full"
              onClick={handleSubscribeClick}
            >
              {isSubscribed ? (
                <>
                  <Check className="mr-2 h-3.5 w-3.5" />
                  Subscribed
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-3.5 w-3.5" />
                  Subscribe to Updates
                </>
              )}
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Quick Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-olive-600">Duration</span>
              <span className="font-medium text-olive-800">30-90 min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-olive-600">Location</span>
              <span className="font-medium text-olive-800">
                {practitioner.locations.some(l => l.is_virtual) ? "Virtual Available" : "In-Person"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-olive-600">Response time</span>
              <span className="font-medium text-olive-800">Within 24h</span>
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full mt-6",
              isLiked && "text-rose-600 hover:text-rose-700"
            )}
            onClick={handleLikeToggle}
          >
            <Heart className={cn("mr-2 h-4 w-4", isLiked && "fill-current")} />
            {isLiked ? "Saved" : "Save Practitioner"}
          </Button>

          {/* Trust Badges */}
          <div className="mt-6 pt-6 border-t border-sage-100 space-y-2">
            <div className="flex items-center gap-2 text-xs text-olive-600">
              <Check className="h-3.5 w-3.5 text-sage-600" />
              Free cancellation up to 24h
            </div>
            <div className="flex items-center gap-2 text-xs text-olive-600">
              <Check className="h-3.5 w-3.5 text-sage-600" />
              Secure payment
            </div>
            <div className="flex items-center gap-2 text-xs text-olive-600">
              <Check className="h-3.5 w-3.5 text-sage-600" />
              100% satisfaction guarantee
            </div>
          </div>
        </CardContent>
      </Card>

    </>
  )
}

// Add cn utility import
import { cn } from "@/lib/utils"