"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Check, Loader2 } from "lucide-react"
import { subscriptionsTiersRetrieveOptions, subscriptionsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import type { SubscriptionTiersResponseReadable, SubscriptionTierReadable, CodeEnum } from "@/src/client/types.gen"
import { useToast } from "@/components/ui/use-toast"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function SubscriptionTiers() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: tiersResponse, isLoading: tiersLoading } = useQuery(subscriptionsTiersRetrieveOptions()) as { 
    data: SubscriptionTiersResponseReadable | undefined, 
    isLoading: boolean 
  }

  const createSubscriptionMutation = useMutation({
    ...subscriptionsCreateMutation(),
    onSuccess: async (data) => {
      if (data.client_secret) {
        // Redirect to Stripe checkout
        const stripe = await stripePromise
        if (!stripe) {
          toast({
            title: "Error",
            description: "Failed to load payment system",
            variant: "destructive",
          })
          return
        }

        const { error } = await stripe.confirmCardPayment(data.client_secret)
        if (error) {
          toast({
            title: "Payment failed",
            description: error.message,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Success!",
            description: "Your subscription has been activated.",
          })
          queryClient.invalidateQueries({ queryKey: ["payments", "subscriptions"] })
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create subscription",
        variant: "destructive",
      })
    },
  })

  const handleSubscribe = () => {
    if (!selectedTierId) return

    createSubscriptionMutation.mutate({
      body: {
        tier_id: selectedTierId.toString(),
        is_annual: billingPeriod === "annual",
      }
    })
  }

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(numPrice)
  }

  const calculateAnnualSavings = (monthlyPrice: string | number, annualPrice?: string | number | null) => {
    if (!annualPrice) return 0
    const numMonthlyPrice = typeof monthlyPrice === 'string' ? parseFloat(monthlyPrice) : monthlyPrice
    const numAnnualPrice = typeof annualPrice === 'string' ? parseFloat(annualPrice) : annualPrice
    const yearlyMonthlyPrice = numMonthlyPrice * 12
    return yearlyMonthlyPrice - numAnnualPrice
  }

  if (tiersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Use the structured response properly
  const tiers = tiersResponse?.tiers || []
  const tiersByCode = tiersResponse?.tiersByCode || {}
  const availableCodes = tiersResponse?.availableCodes || []
  const codeLabels = tiersResponse?.codeLabels || {}
  const activeTiers = tiers.filter((tier) => tier.is_active)

  return (
    <div className="space-y-6">
      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <RadioGroup
          value={billingPeriod}
          onValueChange={(value) => setBillingPeriod(value as "monthly" | "annual")}
          className="flex items-center space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly">Monthly billing</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="annual" id="annual" />
            <Label htmlFor="annual">Annual billing (save up to 20%)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Subscription Tiers */}
      <div className="grid gap-6 md:grid-cols-3">
        {activeTiers.map((tier) => {
          const monthlyPrice = typeof tier.monthly_price === 'string' ? parseFloat(tier.monthly_price) : tier.monthly_price
          const annualPrice = tier.annual_price ? (typeof tier.annual_price === 'string' ? parseFloat(tier.annual_price) : tier.annual_price) : monthlyPrice * 12
          const price = billingPeriod === "monthly" ? monthlyPrice : annualPrice
          const savings = billingPeriod === "annual" ? calculateAnnualSavings(tier.monthly_price, tier.annual_price) : 0
          const isSelected = selectedTierId === tier.id

          return (
            <Card
              key={tier.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
              }`}
              onClick={() => setSelectedTierId(tier.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  {(tier.is_most_popular || tier.code === 'professional') && (
                    <Badge variant="secondary">Most Popular</Badge>
                  )}
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">{formatPrice(price)}</span>
                    <span className="ml-2 text-muted-foreground">
                      /{billingPeriod === "monthly" ? "month" : "year"}
                    </span>
                  </div>
                  {billingPeriod === "annual" && savings > 0 && (
                    <p className="mt-1 text-sm text-green-600">
                      Save {formatPrice(savings)} per year
                    </p>
                  )}
                </div>

                <ul className="space-y-2">
                  {(Array.isArray(tier.features) ? tier.features : []).map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isSelected ? "default" : "outline"}
                  disabled={!isSelected}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Subscribe Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleSubscribe}
          disabled={!selectedTierId || createSubscriptionMutation.isPending}
        >
          {createSubscriptionMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Subscribe Now"
          )}
        </Button>
      </div>
    </div>
  )
}