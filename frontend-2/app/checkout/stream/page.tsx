"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  streamsRetrieveOptions,
  paymentMethodsListOptions,
  streamsSubscribeCreateMutation,
  creditsBalanceRetrieveOptions 
} from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Check,
  Zap,
  Star,
  Crown
} from "lucide-react"
import Link from "next/link"
import PaymentMethodSelector from "@/components/checkout/payment-method-selector"
import AddPaymentMethodModal from "@/components/checkout/add-payment-method-modal"

export default function StreamCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  const [processingPayment, setProcessingPayment] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  
  // Get stream ID and tier from URL
  const streamId = searchParams.get("streamId")
  const initialTier = searchParams.get("tier") as "entry" | "premium" || "entry"
  const [selectedTier, setSelectedTier] = useState<"entry" | "premium">(initialTier)

  // Watch payment methods to auto-select default
  const { data: paymentMethods } = useQuery({
    ...paymentMethodsListOptions(),
    enabled: isAuthenticated,
  })
  
  // Auto-select default payment method when it changes
  useEffect(() => {
    if (paymentMethods?.results && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.results.find(m => m.is_default)
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id.toString())
      }
    }
  }, [paymentMethods, selectedPaymentMethodId])

  // Fetch stream data
  const { data: streamData, isLoading: loadingStream, error: streamError } = useQuery({
    ...streamsRetrieveOptions({ path: { id: streamId || '' } }),
    enabled: !!streamId,
  })

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout/stream?streamId=${streamId}&tier=${selectedTier}`,
        serviceType: "stream",
        title: "Sign in to Subscribe",
        description: "Please sign in to complete your subscription"
      })
    }
  }, [isAuthenticated])

  // Create stream subscription mutation
  const streamSubscription = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: (data) => {
      // Subscription successful
      if (data?.status === 'active') {
        router.push(`/checkout/confirmation?subscriptionId=${data.id}&streamId=${streamId}&type=stream-subscription`)
      } else if (data?.stripe_payment_status === 'requires_action') {
        // Handle 3D Secure or additional authentication
        setCheckoutError("Payment requires additional authentication. Please try again.")
        setProcessingPayment(false)
      }
    },
    onError: (error: any) => {
      const message = error?.body?.message || error?.body?.detail || error?.message || "Subscription failed. Please try again."
      setCheckoutError(message)
      setProcessingPayment(false)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPaymentMethodId) {
      setCheckoutError("Please select a payment method")
      return
    }

    if (!streamId || !streamData) {
      setCheckoutError("Stream information is missing")
      return
    }

    // Clear any previous errors
    setCheckoutError(null)
    setProcessingPayment(true)

    try {
      // Create subscription
      await streamSubscription.mutateAsync({
        path: { id: streamData.id },
        body: {
          tier: selectedTier,
          payment_method_id: parseInt(selectedPaymentMethodId),
        }
      })
    } catch (error) {
      // Error is handled by onError
      console.error('Subscription error:', error)
    } finally {
      setProcessingPayment(false)
    }
  }

  if (loadingStream) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (streamError || !streamData) {
    return (
      <div className="container max-w-6xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {streamError ? "Failed to load stream data" : "Stream not found"}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  // Calculate pricing
  const price = selectedTier === "entry" 
    ? (streamData.entry_tier_price_cents || 0) / 100 
    : (streamData.premium_tier_price_cents || 0) / 100
  const tax = price * 0.08 // 8% tax
  const total = price + tax

  const tierFeatures = {
    entry: [
      "Access to exclusive content",
      "Monthly updates",
      "Community discussions",
      "Early access to new posts"
    ],
    premium: [
      "Everything in Entry tier",
      "All premium exclusive content", 
      "Direct messaging with creator",
      "Monthly Q&A sessions",
      "Behind-the-scenes content",
      "Priority support"
    ]
  }

  return (
    <>
      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        open={showAddPaymentModal}
        onOpenChange={setShowAddPaymentModal}
      />

      {/* Logo - Full Width */}
      <div className="w-full py-6 border-b border-sage-200 bg-gradient-to-r from-sage-50 to-terracotta-50">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-medium tracking-tight text-olive-900">ESTUARY</h1>
          </Link>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
        <div className="container max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-5">
            {/* Subscription Form */}
            <div className="lg:col-span-3">
              <h1 className="text-3xl font-medium mb-2">Subscribe to {streamData.title}</h1>
              <p className="text-muted-foreground mb-8">Choose your subscription tier and start accessing exclusive content</p>

              <form onSubmit={handleSubmit}>
                {/* Error Display */}
                {checkoutError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{checkoutError}</AlertDescription>
                  </Alert>
                )}

                {/* Tier Selection */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Select Your Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={selectedTier} onValueChange={(value) => setSelectedTier(value as "entry" | "premium")}>
                      <div className="space-y-4">
                        {/* Entry Tier */}
                        <div className="relative">
                          <RadioGroupItem
                            value="entry"
                            id="entry"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="entry"
                            className={`flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all
                              ${selectedTier === 'entry' 
                                ? 'border-sage-600 bg-sage-50/50' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  <Zap className="h-5 w-5 text-sage-600" />
                                  Entry Tier
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Perfect for getting started
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-bold">${((streamData.entry_tier_price_cents || 0) / 100).toFixed(0)}</span>
                                <span className="text-sm text-muted-foreground">/month</span>
                              </div>
                            </div>
                            <ul className="space-y-2 text-sm">
                              {tierFeatures.entry.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </Label>
                        </div>

                        {/* Premium Tier */}
                        <div className="relative">
                          <RadioGroupItem
                            value="premium"
                            id="premium"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="premium"
                            className={`flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all relative
                              ${selectedTier === 'premium' 
                                ? 'border-sage-600 bg-sage-50/50' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <Badge className="absolute -top-3 right-6 bg-gradient-to-r from-terracotta-500 to-blush-500 text-white">
                              Most Popular
                            </Badge>
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  <Crown className="h-5 w-5 text-terracotta-600" />
                                  Premium Tier
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  The complete experience
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-bold">${((streamData.premium_tier_price_cents || 0) / 100).toFixed(0)}</span>
                                <span className="text-sm text-muted-foreground">/month</span>
                              </div>
                            </div>
                            <ul className="space-y-2 text-sm">
                              {tierFeatures.premium.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <div className="mb-6">
                  <PaymentMethodSelector
                    selectedMethodId={selectedPaymentMethodId}
                    onSelectMethod={setSelectedPaymentMethodId}
                    onAddNewCard={() => setShowAddPaymentModal(true)}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg" 
                  size="lg" 
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <>
                      <span className="mr-2">Processing</span>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    </>
                  ) : (
                    `Start Subscription ($${total.toFixed(2)}/mo)`
                  )}
                </Button>

                {/* Legal text */}
                <div className="mt-3 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    By subscribing, you agree to monthly recurring billing. Cancel anytime.
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3 mr-1"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Secure payment powered by Stripe
                  </p>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Subscription Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stream Info */}
                  <div className="p-4 bg-gradient-to-br from-sage-50 to-terracotta-50 rounded-lg border border-sage-200">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 rounded-lg bg-white border border-sage-200 overflow-hidden flex-shrink-0">
                        {streamData.profile_image_url || streamData.cover_image_url ? (
                          <img
                            src={streamData.profile_image_url || streamData.cover_image_url || "/placeholder.svg"}
                            alt={streamData.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                            <span className="text-2xl font-medium text-olive-700">{streamData.title?.charAt(0) || "S"}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-olive-900 line-clamp-2">{streamData.title}</h3>
                        <p className="text-sm text-olive-600 mt-1">by {streamData.practitioner_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-olive-600">{streamData.subscriber_count || 0} subscribers</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Tier */}
                  <Card className="bg-sage-50/50 border border-sage-200">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Selected Tier</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedTier === "premium" ? (
                            <Crown className="h-5 w-5 text-terracotta-600" />
                          ) : (
                            <Zap className="h-5 w-5 text-sage-600" />
                          )}
                          <span className="font-medium">
                            {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Tier
                          </span>
                        </div>
                        <span className="font-semibold">${price.toFixed(2)}/mo</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Separator className="my-4" />

                  {/* Pricing Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-olive-700">Monthly Subscription</span>
                      <span className="font-medium">${price.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-base">
                      <span className="text-olive-700">Tax</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex justify-between text-lg font-bold text-olive-900">
                      <span>Total per month</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Benefits reminder */}
                  <div className="rounded-lg bg-sage-100/50 border border-sage-200 p-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-sage-700 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-olive-900">Cancel Anytime</p>
                        <p className="text-olive-600">No commitments. Cancel your subscription whenever you want.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}