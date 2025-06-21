"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, CreditCard, RefreshCw, Zap, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BillingHistoryDialog } from "./billing-history-dialog"
import { 
  subscriptionsTiersRetrieveOptions, 
  subscriptionsCurrentRetrieveOptions, 
  subscriptionsCreateMutation,
  subscriptionsCancelCreateMutation,
  paymentMethodsListOptions 
} from "@/src/client/@tanstack/react-query.gen"
import type { 
  SubscriptionTiersResponseReadable, 
  SubscriptionTierReadable, 
  PractitionerSubscriptionReadable,
  CodeEnum,
  PaymentMethodReadable 
} from "@/src/client/types.gen"
import { useToast } from "@/components/ui/use-toast"
import { loadStripe } from "@stripe/stripe-js"
import { SUBSCRIPTION_TIER_CODES, TIER_FEATURES } from "@/lib/subscription-constants"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function BillingSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  const [isBillingHistoryOpen, setIsBillingHistoryOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch current subscription
  const { data: currentSubscription, isLoading: loadingSubscription, error: subscriptionError } = useQuery({
    ...subscriptionsCurrentRetrieveOptions(),
    retry: false,
    // Don't show error toast for 404 (no subscription found)
    meta: {
      errorHandler: (error: any) => {
        if (error?.response?.status !== 404) {
          toast({
            title: "Error",
            description: "Failed to load subscription details",
            variant: "destructive",
          })
        }
      }
    }
  }) as {
    data: PractitionerSubscriptionReadable | undefined,
    isLoading: boolean,
    error: any
  }

  // Fetch available tiers
  const { data: tiersResponse, isLoading: loadingTiers } = useQuery(subscriptionsTiersRetrieveOptions()) as { 
    data: SubscriptionTiersResponseReadable | undefined, 
    isLoading: boolean 
  }

  const tiers = tiersResponse?.tiers || []
  const tiersByCode = tiersResponse?.tiersByCode || {}

  // Fetch payment methods
  const { data: paymentMethodsResponse, isLoading: loadingPaymentMethods } = useQuery({
    ...paymentMethodsListOptions(),
    enabled: isUpgradeDialogOpen,
  })

  const paymentMethods = paymentMethodsResponse?.results || []

  // Set default payment method when dialog opens
  useEffect(() => {
    if (isUpgradeDialogOpen && paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0]
      setSelectedPaymentMethodId(defaultMethod.id?.toString() || null)
    }
  }, [isUpgradeDialogOpen, paymentMethods, selectedPaymentMethodId])

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    ...subscriptionsCreateMutation(),
    onSuccess: async (data: any) => {
      if (data.client_secret) {
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
            description: "Your subscription has been updated.",
          })
          queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
          setIsUpgradeDialogOpen(false)
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update subscription",
        variant: "destructive",
      })
    },
  })

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    ...subscriptionsCancelCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will remain active until the end of the billing period.",
      })
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to cancel subscription",
        variant: "destructive",
      })
    },
  })

  const handleUpgrade = (tierId: number) => {
    setSelectedTierId(tierId)
    setIsUpgradeDialogOpen(true)
  }

  const confirmUpgrade = () => {
    if (!selectedTierId) return

    const mutationData: any = {
      body: {
        tier_id: selectedTierId,
        is_annual: billingPeriod === "yearly",
      }
    }

    if (selectedPaymentMethodId) {
      mutationData.body.payment_method_id = selectedPaymentMethodId
    }

    createSubscriptionMutation.mutate(mutationData)
  }

  const handleCancel = () => {
    if (!currentSubscription?.id) return
    
    cancelSubscriptionMutation.mutate({
      path: {
        id: currentSubscription.id.toString(),
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

  const getTierFeatures = (code?: CodeEnum) => {
    if (!code) return []
    return TIER_FEATURES[code as keyof typeof TIER_FEATURES] || []
  }

  if (loadingSubscription || loadingTiers) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Subscription</span>
            {currentSubscription && (
              <Badge variant="outline" className="ml-2">
                {currentSubscription.is_annual ? "Annual" : "Monthly"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Manage your subscription plan and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSubscription ? (
            <div className="flex items-start space-x-4 rounded-md border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">{currentSubscription.tier?.name} Plan</p>
                  <Badge variant="secondary">{currentSubscription.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentSubscription.tier?.description}</p>
                <div className="pt-2">
                  <p className="text-sm">
                    <span className="font-medium text-lg">
                      {formatPrice(
                        currentSubscription.is_annual 
                          ? currentSubscription.tier?.annual_price || 0
                          : currentSubscription.tier?.monthly_price || 0
                      )}
                    </span>
                    <span className="text-muted-foreground">/{currentSubscription.is_annual ? "year" : "month"}</span>
                  </p>
                  {currentSubscription.end_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentSubscription.auto_renew ? "Renews" : "Expires"} on {new Date(currentSubscription.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Active Subscription</AlertTitle>
              <AlertDescription>
                Choose a plan below to get started with your practitioner subscription.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border p-1 text-sm">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => setBillingPeriod("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === "yearly" ? "default" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => setBillingPeriod("yearly")}
              >
                Yearly
                <Badge variant="outline" className="ml-1 rounded-full px-2 py-0 text-xs">
                  Save 15%
                </Badge>
              </Button>
            </div>
          </div>

        </CardContent>
        {currentSubscription && (
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="outline" onClick={() => setIsBillingHistoryOpen(true)}>
              View Billing History
            </Button>
            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      <h3 className="text-lg font-medium mt-8 mb-4">Available Plans</h3>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrentTier = currentSubscription?.tier?.id === tier.id
          const price = billingPeriod === "monthly" ? tier.monthly_price : (tier.annual_price || tier.monthly_price)
          const monthlyPrice = typeof tier.monthly_price === 'string' ? parseFloat(tier.monthly_price) : tier.monthly_price
          const annualPrice = tier.annual_price ? (typeof tier.annual_price === 'string' ? parseFloat(tier.annual_price) : tier.annual_price) : monthlyPrice * 12
          const savings = billingPeriod === "yearly" ? calculateAnnualSavings(tier.monthly_price, tier.annual_price) : 0
          const features = getTierFeatures(tier.code)

          return (
            <Card key={tier.id} className={`relative ${tier.code === 'professional' ? "border-primary" : ""}`}>
              {tier.code === 'professional' && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{formatPrice(price)}</span>
                  <span className="text-muted-foreground">/{billingPeriod === "monthly" ? "month" : "year"}</span>
                </div>
                {savings > 0 && (
                  <p className="text-sm text-green-600">
                    Save {formatPrice(savings)} per year
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentTier ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={tier.code === 'professional' ? "default" : "outline"}
                    onClick={() => handleUpgrade(tier.id!)}
                    disabled={!tier.id}
                  >
                    {currentSubscription && currentSubscription.tier?.code === 'premium' && tier.code !== 'premium' ? "Downgrade" : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentSubscription?.tier?.code === 'premium' && selectedTierId && 
               tiers.find(t => t.id === selectedTierId)?.code !== 'premium' 
                ? "Confirm Downgrade" : "Confirm Upgrade"}
            </DialogTitle>
            <DialogDescription>
              {currentSubscription?.tier?.code === 'premium' && selectedTierId &&
               tiers.find(t => t.id === selectedTierId)?.code !== 'premium'
                ? "Are you sure you want to downgrade your subscription? You'll lose access to premium features."
                : "You're about to change your subscription plan. This will be effective immediately."}
            </DialogDescription>
          </DialogHeader>

          {selectedTierId && (
            <div className="space-y-4 py-4">
              {(() => {
                const selectedTier = tiers.find(t => t.id === selectedTierId)
                if (!selectedTier) return null
                
                const price = billingPeriod === "yearly" 
                  ? (selectedTier.annual_price || selectedTier.monthly_price)
                  : selectedTier.monthly_price

                return (
                  <>
                    <div className="rounded-md border p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">New Plan:</h4>
                        <Badge>{selectedTier.name}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedTier.description}
                      </p>
                      <div className="text-sm">
                        <span className="font-medium">{formatPrice(price)}</span>
                        <span className="text-muted-foreground">/{billingPeriod === "monthly" ? "month" : "year"}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Select Payment Method</h4>
                      {loadingPaymentMethods ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : paymentMethods && paymentMethods.length > 0 ? (
                        <RadioGroup value={selectedPaymentMethodId || ""} onValueChange={setSelectedPaymentMethodId}>
                          {paymentMethods.map((method) => (
                            <div key={method.id} className="flex items-center space-x-3 rounded-md border p-3">
                              <RadioGroupItem value={method.id?.toString() || ""} id={method.id?.toString() || ""} />
                              <Label
                                htmlFor={method.id?.toString() || ""}
                                className="flex flex-1 cursor-pointer items-center justify-between"
                              >
                                <div className="flex items-center space-x-3">
                                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {method.brand?.toUpperCase() || 'CARD'} •••• {method.last4}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Expires {method.exp_month}/{method.exp_year}
                                    </p>
                                  </div>
                                </div>
                                {method.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>No Payment Methods</AlertTitle>
                          <AlertDescription>
                            You need to add a payment method before subscribing. Please add one in your profile settings.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmUpgrade} 
              disabled={createSubscriptionMutation.isPending || !selectedPaymentMethodId || (paymentMethods?.length === 0)}
            >
              {createSubscriptionMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : currentSubscription?.tier?.code === 'premium' && selectedTierId && 
                tiers.find(t => t.id === selectedTierId)?.code !== 'premium' ? (
                "Confirm Downgrade"
              ) : (
                "Confirm Upgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BillingHistoryDialog open={isBillingHistoryOpen} onOpenChange={setIsBillingHistoryOpen} />
    </div>
  )
}
