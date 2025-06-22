"use client"

import { useState } from "react"
import { DollarSign, Info, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useMutation } from "@tanstack/react-query"
import { streamsPricingPartialUpdateMutation } from "@/src/client/@tanstack/react-query.gen"

interface StreamPricingProps {
  streamId: number
  currentEntryPrice?: number
  currentPremiumPrice?: number
  onPricingUpdate?: () => void
}

export default function StreamPricing({ 
  streamId, 
  currentEntryPrice = 0, 
  currentPremiumPrice = 0,
  onPricingUpdate 
}: StreamPricingProps) {
  const { toast } = useToast()
  const [entryPrice, setEntryPrice] = useState(currentEntryPrice / 100) // Convert cents to dollars
  const [premiumPrice, setPremiumPrice] = useState(currentPremiumPrice / 100)

  const updatePricingMutation = useMutation({
    ...streamsPricingPartialUpdateMutation(),
    onSuccess: () => {
      toast({
        title: "Pricing updated",
        description: "Your stream pricing has been updated successfully. Stripe products will be created automatically.",
      })
      
      if (onPricingUpdate) {
        onPricingUpdate()
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.body?.detail || "Failed to update pricing. Please try again.",
        variant: "destructive",
      })
    }
  })

  const handleSubmit = () => {
    // Validation
    if (entryPrice < 1) {
      toast({
        title: "Invalid price",
        description: "Entry tier price must be at least $1",
        variant: "destructive",
      })
      return
    }
    
    if (premiumPrice <= entryPrice) {
      toast({
        title: "Invalid price",
        description: "Premium tier price must be higher than entry tier price",
        variant: "destructive",
      })
      return
    }

    if (!streamId) {
      toast({
        title: "Error",
        description: "Stream ID is required",
        variant: "destructive",
      })
      return
    }

    updatePricingMutation.mutate({
      path: {
        id: streamId
      },
      body: {
        entry_tier_price_cents: Math.round(entryPrice * 100),
        premium_tier_price_cents: Math.round(premiumPrice * 100),
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium">Subscription Pricing</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Set monthly subscription prices for your content tiers. Subscribers will be charged monthly to access your content.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The platform takes a 15% commission on all subscription revenue. Prices shown to subscribers include this fee.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free Tier</CardTitle>
            <CardDescription>Always free - available to everyone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-semibold">0</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entry Tier</CardTitle>
            <CardDescription>Basic paid subscription with access to entry-level content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="entry-price">Monthly Price (USD)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="entry-price"
                  type="number"
                  min="1"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll receive ${(entryPrice * 0.85).toFixed(2)} per subscriber after platform fees
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Premium Tier</CardTitle>
            <CardDescription>Full access to all your exclusive content and perks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="premium-price">Monthly Price (USD)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="premium-price"
                  type="number"
                  min="1"
                  step="0.01"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(parseFloat(e.target.value) || 0)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll receive ${(premiumPrice * 0.85).toFixed(2)} per subscriber after platform fees
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">10 Entry subscribers:</span>
              <span>${(entryPrice * 10 * 0.85).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">5 Premium subscribers:</span>
              <span>${(premiumPrice * 5 * 0.85).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total (after fees):</span>
              <span>${((entryPrice * 10 + premiumPrice * 5) * 0.85).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={updatePricingMutation.isPending || !streamId}
          className="gap-2"
        >
          {updatePricingMutation.isPending ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Pricing
            </>
          )}
        </Button>
      </div>

      {currentEntryPrice > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Existing subscribers will continue at their current rates. 
            New pricing only applies to new subscribers.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}