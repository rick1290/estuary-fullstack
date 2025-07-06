"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Check, Lock, CreditCard } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  streamsSubscribeCreateMutation,
  streamsRetrieveOptions
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/components/ui/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { Elements } from "@stripe/react-stripe-js"
import { getStripe } from "@/lib/stripe-loader"
import StreamSubscriptionPayment from "./stream-subscription-payment"

const stripePromise = getStripe()

interface SubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stream: any
  initialTier?: "free" | "entry" | "premium"
  onSuccess?: () => void
}

export default function SubscriptionDialog({
  open,
  onOpenChange,
  stream,
  initialTier = "free",
  onSuccess
}: SubscriptionDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTier, setSelectedTier] = useState<"free" | "entry" | "premium">(initialTier)
  const [showPayment, setShowPayment] = useState(false)

  // Subscribe mutation for free tier
  const subscribeMutation = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Subscribed successfully!",
        description: `You are now subscribed to ${stream?.title}`,
      })
      queryClient.invalidateQueries({ 
        queryKey: streamsRetrieveOptions({ 
          path: { id: stream?.public_uuid } 
        }).queryKey 
      })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast({
        title: "Subscription failed",
        description: error?.body?.detail || "Failed to subscribe to stream",
        variant: "destructive",
      })
    }
  })

  const handleSubscribe = () => {
    if (selectedTier === "free") {
      subscribeMutation.mutate({
        path: {
          id: stream?.id!
        },
        body: {
          tier: "free"
        }
      })
    } else {
      // Show payment flow for paid tiers
      setShowPayment(true)
    }
  }

  const tierOptions = [
    {
      value: "free",
      title: "Free",
      price: "$0",
      period: "",
      features: [
        "Access to free content",
        "Community updates"
      ]
    },
    {
      value: "entry",
      title: "Entry",
      price: `$${((stream?.entry_tier_price_cents || 0) / 100).toFixed(0)}`,
      period: "/mo",
      features: [
        "Everything in Free",
        "Exclusive content",
        "Group sessions"
      ]
    },
    {
      value: "premium",
      title: "Premium",
      price: `$${((stream?.premium_tier_price_cents || 0) / 100).toFixed(0)}`,
      period: "/mo",
      features: [
        "Everything in Entry",
        "All premium content",
        "1-on-1 check-ins",
        "Priority support"
      ],
      recommended: true
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {!showPayment ? (
          <>
            <DialogHeader>
              <DialogTitle>Subscribe to {stream?.title}</DialogTitle>
              <DialogDescription>
                Choose a subscription tier to access exclusive content and connect with {stream?.practitioner_name}
              </DialogDescription>
            </DialogHeader>

            <RadioGroup 
              value={selectedTier} 
              onValueChange={(value) => setSelectedTier(value as any)}
              className="space-y-3 mt-4"
            >
              {tierOptions.map((tier) => (
                <div key={tier.value} className="relative">
                  <RadioGroupItem
                    value={tier.value}
                    id={tier.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={tier.value}
                    className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedTier === tier.value 
                        ? 'border-sage-600 bg-sage-50/50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-base flex items-center gap-2">
                          {tier.title}
                          {tier.recommended && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{tier.price}</span>
                        <span className="text-sm text-muted-foreground">{tier.period}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={subscribeMutation.isPending}
                className="flex-1 bg-sage-600 hover:bg-sage-700"
              >
                {subscribeMutation.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : selectedTier === "free" ? (
                  "Subscribe Free"
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continue to Payment
                  </>
                )}
              </Button>
            </div>

            {selectedTier !== "free" && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                You'll be redirected to enter payment details
              </p>
            )}
          </>
        ) : (
          <Elements stripe={stripePromise}>
            <StreamSubscriptionPayment
              stream={stream}
              selectedTier={selectedTier as "entry" | "premium"}
              onSuccess={() => {
                setShowPayment(false)
                onOpenChange(false)
                onSuccess?.()
              }}
              onCancel={() => setShowPayment(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}