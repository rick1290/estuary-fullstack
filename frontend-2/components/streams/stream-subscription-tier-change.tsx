"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  streamSubscriptionsPartialUpdateMutation,
  streamSubscriptionsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  AlertTriangle,
  CreditCard,
  Calendar
} from "lucide-react"
import { format } from "date-fns"

interface StreamSubscriptionTierChangeProps {
  stream: any
  currentSubscription: any
  onClose: () => void
}

export default function StreamSubscriptionTierChange({
  stream,
  currentSubscription,
  onClose
}: StreamSubscriptionTierChangeProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedTier, setSelectedTier] = useState<"free" | "entry" | "premium">(
    currentSubscription.tier_level
  )
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Update tier mutation
  const updateTierMutation = useMutation({
    ...streamSubscriptionsPartialUpdateMutation(),
    onSuccess: () => {
      toast({
        title: "Subscription updated!",
        description: "Your subscription tier has been changed successfully",
      })
      queryClient.invalidateQueries({ 
        queryKey: ['streamsRetrieve', { path: { id: stream.id } }] 
      })
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.body?.detail || "Failed to update subscription",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  })

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    ...streamSubscriptionsDestroyMutation(),
    onSuccess: () => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled",
      })
      queryClient.invalidateQueries({ 
        queryKey: ['streamsRetrieve', { path: { id: stream.id } }] 
      })
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error?.body?.detail || "Failed to cancel subscription",
        variant: "destructive",
      })
    }
  })

  const handleTierChange = async () => {
    if (selectedTier === currentSubscription.tier_level) {
      return
    }

    setIsProcessing(true)

    // For now, only handle downgrades to free tier
    if (selectedTier === "free") {
      // Downgrade to free tier
      await updateTierMutation.mutateAsync({
        path: { id: currentSubscription.id },
        body: { tier_level: "free" }
      })
    } else {
      // For upgrades, we'd need to handle payment
      toast({
        title: "Payment Required",
        description: "Please use the upgrade button to change to a paid tier",
      })
      setIsProcessing(false)
    }
  }

  const handleCancelSubscription = async () => {
    await cancelSubscriptionMutation.mutateAsync({
      path: { id: currentSubscription.id }
    })
  }

  const isDowngrade = selectedTier === "free" && currentSubscription.tier_level !== "free"
  const isUpgrade = (
    (selectedTier === "entry" && currentSubscription.tier_level === "free") ||
    (selectedTier === "premium" && currentSubscription.tier_level !== "premium")
  )

  const tierPrices = {
    free: 0,
    entry: (stream.entry_tier_price_cents || 0) / 100,
    premium: (stream.premium_tier_price_cents || 0) / 100
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>
            Change your subscription tier or cancel your subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Subscription Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Subscription</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tier</span>
                <Badge variant="secondary" className="capitalize">
                  {currentSubscription.tier_level}
                </Badge>
              </div>
              {currentSubscription.tier_level !== "free" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Monthly Price</span>
                    <span className="font-medium">
                      ${tierPrices[currentSubscription.tier_level as keyof typeof tierPrices]}/mo
                    </span>
                  </div>
                  {currentSubscription.current_period_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Next billing date</span>
                      <span className="font-medium">
                        {format(new Date(currentSubscription.current_period_end), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Tier Selection */}
          <div>
            <h4 className="font-medium mb-3">Change Tier</h4>
            <div className="space-y-3">
              {/* Free Tier */}
              <label className="block">
                <input
                  type="radio"
                  name="tier"
                  value="free"
                  checked={selectedTier === "free"}
                  onChange={() => setSelectedTier("free")}
                  className="sr-only peer"
                />
                <div className="p-4 rounded-lg border-2 cursor-pointer transition-all peer-checked:border-sage-600 peer-checked:bg-sage-50 hover:border-gray-300">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">Free</h5>
                    <span className="text-lg font-bold">$0/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Access to free content only
                  </p>
                </div>
              </label>

              {/* Entry Tier */}
              <label className="block">
                <input
                  type="radio"
                  name="tier"
                  value="entry"
                  checked={selectedTier === "entry"}
                  onChange={() => setSelectedTier("entry")}
                  className="sr-only peer"
                />
                <div className="p-4 rounded-lg border-2 cursor-pointer transition-all peer-checked:border-sage-600 peer-checked:bg-sage-50 hover:border-gray-300">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">Entry</h5>
                    <span className="text-lg font-bold">${tierPrices.entry}/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Entry-level exclusive content + group sessions
                  </p>
                </div>
              </label>

              {/* Premium Tier */}
              <label className="block">
                <input
                  type="radio"
                  name="tier"
                  value="premium"
                  checked={selectedTier === "premium"}
                  onChange={() => setSelectedTier("premium")}
                  className="sr-only peer"
                />
                <div className="p-4 rounded-lg border-2 cursor-pointer transition-all peer-checked:border-sage-600 peer-checked:bg-sage-50 hover:border-gray-300">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">Premium</h5>
                    <span className="text-lg font-bold">${tierPrices.premium}/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All content + 1-on-1 sessions + priority support
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Change Warnings */}
          {isDowngrade && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Downgrading to free will remove access to exclusive content at the end of your current billing period.
              </AlertDescription>
            </Alert>
          )}

          {isUpgrade && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Upgrading requires payment. Use the main subscription page to upgrade your tier.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {selectedTier !== currentSubscription.tier_level && (
              <Button
                onClick={handleTierChange}
                disabled={isProcessing || isUpgrade}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isUpgrade ? (
                  "Use Upgrade Button for Paid Tiers"
                ) : (
                  "Change to Free Tier"
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="w-full text-destructive hover:text-destructive"
            >
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription to {stream.title}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {currentSubscription.tier_level === "free" ? (
                  "You will lose access to this stream's content immediately."
                ) : (
                  `You will continue to have access until ${
                    currentSubscription.current_period_end 
                      ? format(new Date(currentSubscription.current_period_end), "MMM d, yyyy")
                      : "the end of your billing period"
                  }.`
                )}
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">You will lose access to:</p>
              <ul className="space-y-1 ml-4">
                <li>• Exclusive content for your tier</li>
                <li>• Group sessions and workshops</li>
                <li>• Direct messaging with the practitioner</li>
                {currentSubscription.tier_level === "premium" && (
                  <li>• 1-on-1 monthly check-ins</li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}