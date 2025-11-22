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
import { userAddFavorite, userRemoveFavorite } from "@/src/client/sdk.gen"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useUserFavorites } from "@/hooks/use-user-favorites"
import { SendMessageModal } from "./send-message-modal"

interface PractitionerBookingPanelProps {
  practitioner: Practitioner
}

export default function PractitionerBookingPanel({ practitioner }: PractitionerBookingPanelProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const router = useRouter()
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
      setMessageModalOpen(true)
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
        <CardContent className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="text-center p-3 bg-gradient-to-br from-sage-50 to-sage-100/50 rounded-lg border border-sage-100">
              <Calendar className="h-4 w-4 mx-auto mb-1 text-sage-600" />
              <div className="text-lg font-bold text-olive-900">{practitioner.completed_sessions_count || 0}</div>
              <div className="text-[10px] text-olive-600">Sessions completed</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-sage-50 to-sage-100/50 rounded-lg border border-sage-100">
              <Sparkles className="h-4 w-4 mx-auto mb-1 text-sage-600" />
              <div className="text-lg font-bold text-olive-900">{practitioner.total_services || 0}</div>
              <div className="text-[10px] text-olive-600">Services</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-sage-50 to-sage-100/50 rounded-lg border border-sage-100">
              <Clock className="h-4 w-4 mx-auto mb-1 text-sage-600" />
              <div className="text-lg font-bold text-olive-900">
                {practitioner.price_range?.min
                  ? `$${practitioner.price_range.min}`
                  : practitioner.min_price
                    ? `$${practitioner.min_price}`
                    : '$85'}
              </div>
              <div className="text-[10px] text-olive-600">From</div>
            </div>
          </div>

          <Separator className="my-6" />

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

            <Button
              variant="ghost"
              className={cn(
                "w-full",
                isLiked && "text-rose-600 hover:text-rose-700"
              )}
              onClick={handleLikeToggle}
              disabled={isLoading}
            >
              <Heart className={cn("mr-2 h-4 w-4 transition-colors", isLiked && "fill-current")} />
              {isLiked ? "Saved" : "Save Practitioner"}
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

          {/* Trust Badges */}
          <div className="pt-6 border-t border-sage-100 space-y-2">
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

      <SendMessageModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        practitioner={practitioner}
      />
    </>
  )
}