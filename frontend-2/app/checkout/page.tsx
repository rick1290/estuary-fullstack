"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  publicServicesRetrieveOptions, 
  paymentMethodsListOptions,
  checkoutDirectPaymentCreateMutation 
} from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CreditCard,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Plus,
  Check,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import PaymentMethodSelector from "@/components/checkout/payment-method-selector"
import AddPaymentMethodModal from "@/components/checkout/add-payment-method-modal"

// Mock user credit balance for now
const userCreditBalance = 25.0

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, login } = useAuth()
  const { openAuthModal } = useAuthModal()

  const [specialRequests, setSpecialRequests] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Payment form state
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  
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

  // Credit balance state
  const [applyCredits, setApplyCredits] = useState(userCreditBalance > 0)

  // Get service ID and other parameters from URL
  const serviceId = searchParams.get("serviceId")
  const serviceType = searchParams.get("type") || "session"
  const selectedDate = searchParams.get("date")
  const selectedTime = searchParams.get("time")
  const selectedSessionIds = searchParams.get("sessions")?.split(",").map(Number) || []

  // For demo purposes, auto-login with test credentials
  useEffect(() => {
    const autoLogin = async () => {
      if (!isAuthenticated) {
        try {
          // Auto-login with test credentials for demo purposes
          await login("testuser@example.com", "test1234")
        } catch (error) {
          console.error("Auto-login failed:", error)
          openAuthModal({
            defaultTab: "login",
            redirectUrl: `/checkout?serviceId=${serviceId}&type=${serviceType}`,
            serviceType: serviceType,
            title: "Sign in to Continue",
            description: "Please sign in to complete your booking"
          })
        }
      }
    }

    autoLogin()
  }, [isAuthenticated, login])

  // Fetch service data from API using public_uuid
  const { data: serviceData, isLoading: loadingService, error: serviceError } = useQuery({
    ...publicServicesRetrieveOptions({ path: { public_uuid: serviceId || '' } }),
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.back()
    }
  }, [isAuthenticated, router])

  // Create direct payment mutation
  const directPayment = useMutation({
    ...checkoutDirectPaymentCreateMutation(),
    onSuccess: (data) => {
      // Payment successful, redirect to confirmation
      if (data?.status === 'success') {
        router.push(`/checkout/confirmation?orderId=${data.order_id}&bookingId=${data.booking_id}&serviceId=${serviceId}&type=${serviceType}`)
      } else if (data?.status === 'requires_action') {
        // Payment requires additional authentication
        setCheckoutError("Payment requires additional authentication. Please try again.")
        setProcessingPayment(false)
      }
    },
    onError: (error: any) => {
      const message = error?.body?.message || error?.body?.detail || error?.message || "Payment processing failed. Please try again."
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

    if (!serviceId) {
      setCheckoutError("Service information is missing")
      return
    }

    // Clear any previous errors
    setCheckoutError(null)
    setProcessingPayment(true)

    // Get the current URL for success/cancel redirects
    const currentOrigin = window.location.origin
    const successUrl = `${currentOrigin}/checkout/confirmation?serviceId=${serviceId}&type=${serviceType}`
    const cancelUrl = `${currentOrigin}/checkout?serviceId=${serviceId}&type=${serviceType}`

    try {
      // Prepare booking details based on service type
      const bookingDetails: any = {
        service_id: serviceId,
        payment_method_id: parseInt(selectedPaymentMethodId),
        apply_credits: applyCredits,
        special_requests: specialRequests,
      }
      
      // Add booking-specific details based on service type
      if (serviceType === 'session') {
        // For sessions, we need start and end time
        if (selectedDate && selectedTime) {
          // Parse the date and time to create proper datetime
          const [hours, minutes] = selectedTime.split(':')
          const startDateTime = new Date(selectedDate)
          startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          
          // Assume 1 hour duration for now
          const endDateTime = new Date(startDateTime)
          endDateTime.setHours(endDateTime.getHours() + 1)
          
          bookingDetails.start_time = startDateTime.toISOString()
          bookingDetails.end_time = endDateTime.toISOString()
          bookingDetails.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      } else if (serviceType === 'workshop') {
        // For workshops, we need the service session ID
        if (selectedSessionIds.length > 0) {
          bookingDetails.service_session_id = selectedSessionIds[0]
        }
      } else if (serviceType === 'package' || serviceType === 'bundle') {
        // For packages and bundles, optionally include first session time
        if (selectedDate && selectedTime) {
          const [hours, minutes] = selectedTime.split(':')
          const startDateTime = new Date(selectedDate)
          startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          
          const endDateTime = new Date(startDateTime)
          endDateTime.setHours(endDateTime.getHours() + 1)
          
          bookingDetails.start_time = startDateTime.toISOString()
          bookingDetails.end_time = endDateTime.toISOString()
          bookingDetails.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }
      
      // Use direct payment with saved payment method
      await directPayment.mutateAsync({
        body: bookingDetails
      })
    } catch (error) {
      // Error is handled by onError
      console.error('Payment error:', error)
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleApplyPromo = () => {
    if (!promoCode) return

    // Simulate promo code verification
    setPromoApplied(true)
    setPromoDiscount(10) // $10 discount for demo
  }

  if (loadingService) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (serviceError || !serviceData) {
    return (
      <div className="container max-w-6xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {serviceError ? "Failed to load service data" : "Service not found"}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  // Transform API data to component format
  const service = {
    id: serviceData.public_uuid || serviceData.id,
    title: serviceData.name || 'Service',
    type: serviceType,
    price: serviceData.price_cents ? serviceData.price_cents / 100 : 0,
    location: serviceData.location_type === 'virtual' ? 'Virtual' : serviceData.location || 'Virtual',
    practitioner: {
      name: serviceData.primary_practitioner?.display_name || serviceData.practitioner?.display_name || 'Practitioner'
    },
    image: serviceData.image_url || serviceData.featured_image
  }

  // Calculate pricing - ensure all values are numbers
  const basePrice = service.price
  const creditsToApply = applyCredits ? Math.min(userCreditBalance, basePrice) : 0
  const subtotal = basePrice
  const discount = creditsToApply + promoDiscount
  const tax = (subtotal - discount) * 0.08 // 8% tax
  const total = subtotal - discount + tax

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
            {/* Checkout Form */}
            <div className="lg:col-span-3">
              <h1 className="text-3xl font-medium mb-8">Checkout</h1>

              {/* Credits Section */}
              {userCreditBalance > 0 && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Available Credits</h3>
                        <p className="text-sm text-muted-foreground">
                          You have ${userCreditBalance.toFixed(2)} in credits available
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="apply-credits" checked={applyCredits} onCheckedChange={setApplyCredits} />
                        <Label htmlFor="apply-credits">{applyCredits ? "Applied" : "Apply to order"}</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <form onSubmit={handleSubmit}>
                {/* Error Display */}
                {checkoutError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{checkoutError}</AlertDescription>
                  </Alert>
                )}

                {/* Payment Method */}
                <div className="mb-6">
                  <PaymentMethodSelector
                    selectedMethodId={selectedPaymentMethodId}
                    onSelectMethod={setSelectedPaymentMethodId}
                    onAddNewCard={() => setShowAddPaymentModal(true)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="pt-2">
                    <Label htmlFor="special-requests" className="mb-2 block">
                      Special Requests or Notes
                    </Label>
                    <Textarea
                      id="special-requests"
                      placeholder="Any special requirements or information for the practitioner..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="resize-none"
                      rows={3}
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
                      `Complete Payment ($${total.toFixed(2)})`
                    )}
                  </Button>

                  {/* Add the legal language and security information below the button */}
                  <div className="mt-3 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      By pressing the "Complete Payment" button, you agree to Estuary's Refund and Payment Policy
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
                      It's safe to pay on Estuary. All transactions are protected by SSL encryption.
                    </p>
                  </div>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-sage-50 to-terracotta-50 rounded-lg border border-sage-200">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 rounded-lg bg-white border border-sage-200 overflow-hidden flex-shrink-0">
                        {service.image ? (
                          <img
                            src={service.image || "/placeholder.svg"}
                            alt={service.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                            <span className="text-2xl font-medium text-olive-700">{service.title?.charAt(0) || "S"}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-olive-900 line-clamp-2">{service.title}</h3>
                        <p className="text-sm text-olive-600 mt-1">
                          {serviceType === "one-on-one" ? "Session" : 
                           serviceType === "workshops" ? "Workshop" :
                           serviceType === "courses" ? "Course" :
                           serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <Card className="bg-sage-50/50 border border-sage-200">
                    <CardContent className="space-y-4 p-4">
                      <h3 className="font-medium">Booking Details</h3>
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Date</p>
                            <p className="text-muted-foreground">{selectedDate || "Flexible"}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Time</p>
                            <p className="text-muted-foreground">{selectedTime || "To be confirmed"}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Location</p>
                            <p className="text-muted-foreground">{service.location || "Online"}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Practitioner</p>
                            <p className="text-muted-foreground">
                              {service.practitioner?.name || "Various practitioners"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Promo Code */}
                  <div className="pt-2">
                    <Label htmlFor="promo-code" className="text-sm font-medium">
                      Promo Code
                    </Label>
                    <div className="flex mt-1">
                      <Input
                        id="promo-code"
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="rounded-r-none"
                        disabled={promoApplied}
                      />
                      <Button
                        onClick={handleApplyPromo}
                        className="rounded-l-none"
                        variant={promoApplied ? "outline" : "default"}
                        disabled={!promoCode || promoApplied}
                      >
                        {promoApplied ? <Check className="h-4 w-4" /> : "Apply"}
                      </Button>
                    </div>
                    {promoApplied && (
                      <p className="text-xs text-primary mt-1">Promo code applied: ${promoDiscount.toFixed(2)} off</p>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-olive-700">Subtotal</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>

                    {creditsToApply > 0 && (
                      <div className="flex justify-between text-sage-700">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Credits Applied
                        </span>
                        <span className="font-medium">-${creditsToApply.toFixed(2)}</span>
                      </div>
                    )}

                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-sage-700">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Promo Discount
                        </span>
                        <span className="font-medium">-${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base">
                      <span className="text-olive-700">Tax</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex justify-between text-lg font-bold text-olive-900">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-sage-100/50 border border-sage-200 p-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-sage-700 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-olive-900">Satisfaction Guaranteed</p>
                        <p className="text-olive-600">Full refund if you're not completely satisfied</p>
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
