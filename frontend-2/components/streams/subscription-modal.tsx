"use client"

import { useState } from "react"
import { Check, Crown, Users, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface SubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamId: string
  streamTitle: string
  practitionerName: string
  entryPrice: number // in cents
  premiumPrice: number // in cents
  currentTier?: "free" | "entry" | "premium" | null
  onSubscriptionSuccess?: () => void
}

export default function SubscriptionModal({
  open,
  onOpenChange,
  streamId,
  streamTitle,
  practitionerName,
  entryPrice,
  premiumPrice,
  currentTier,
  onSubscriptionSuccess,
}: SubscriptionModalProps) {
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [selectedTier, setSelectedTier] = useState<"free" | "entry" | "premium">(
    currentTier || "free"
  )
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: window.location.pathname,
        serviceType: "stream",
        title: "Sign in to Subscribe",
        description: "Please sign in to subscribe to this stream"
      })
      return
    }

    setLoading(true)
    
    try {
      // TODO: Replace with actual API call when api-client is available
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock response based on tier
      if (selectedTier === "free") {
        toast({
          title: "Subscribed successfully!",
          description: `You're now subscribed to ${streamTitle} at the ${selectedTier} tier.`,
        })
        
        if (onSubscriptionSuccess) {
          onSubscriptionSuccess()
        }
        
        onOpenChange(false)
      } else {
        // TODO: Handle Stripe payment confirmation
        toast({
          title: "Payment integration pending",
          description: "Stripe payment integration will be added when API client is available.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "There was an error subscribing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const tiers = [
    {
      value: "free" as const,
      name: "Free",
      price: 0,
      features: [
        "Access to free content",
        "Basic community features",
        "Email notifications",
      ],
      icon: <Users className="h-5 w-5" />,
      popular: false,
    },
    {
      value: "entry" as const,
      name: "Entry",
      price: entryPrice,
      features: [
        "All free tier benefits",
        "Access to entry-level content",
        "Priority support",
        "Monthly Q&A sessions",
      ],
      icon: <Crown className="h-5 w-5" />,
      popular: true,
    },
    {
      value: "premium" as const,
      name: "Premium",
      price: premiumPrice,
      features: [
        "All entry tier benefits",
        "Access to all premium content",
        "Direct messaging with practitioner",
        "Exclusive workshops & events",
        "Early access to new content",
      ],
      icon: <Crown className="h-5 w-5" />,
      popular: false,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Subscribe to {streamTitle}</DialogTitle>
          <DialogDescription>
            Join {practitionerName}'s community and get access to exclusive content
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <RadioGroup value={selectedTier} onValueChange={(value) => setSelectedTier(value as typeof selectedTier)}>
            <div className="grid gap-4 md:grid-cols-3">
              {tiers.map((tier) => (
                <label
                  key={tier.value}
                  className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:border-sage-400 ${
                    selectedTier === tier.value
                      ? "border-sage-600 bg-sage-50"
                      : "border-gray-200"
                  }`}
                >
                  <RadioGroupItem
                    value={tier.value}
                    className="sr-only"
                  />
                  
                  {tier.popular && (
                    <Badge className="absolute -top-3 right-4 bg-terracotta-500 text-white">
                      Most Popular
                    </Badge>
                  )}
                  
                  {currentTier === tier.value && (
                    <Badge className="absolute -top-3 left-4 bg-sage-600 text-white">
                      Current Plan
                    </Badge>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${
                        selectedTier === tier.value
                          ? "bg-sage-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {tier.icon}
                      </div>
                      <h3 className="font-semibold text-lg">{tier.name}</h3>
                    </div>
                    
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        ${(tier.price / 100).toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>

                  <Separator className="mb-4" />

                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </label>
              ))}
            </div>
          </RadioGroup>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedTier === "free" ? (
                "No payment required"
              ) : (
                <>
                  <Lock className="inline h-4 w-4 mr-1" />
                  Secure payment via Stripe
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={loading || currentTier === selectedTier}
                className="bg-sage-600 hover:bg-sage-700"
              >
                {loading ? "Processing..." : 
                 currentTier === selectedTier ? "Current Plan" :
                 selectedTier === "free" ? "Subscribe Free" :
                 `Subscribe for $${(tiers.find(t => t.value === selectedTier)?.price || 0) / 100}/mo`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}