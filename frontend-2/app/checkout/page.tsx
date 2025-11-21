"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  servicesRetrieveOptions, 
  paymentMethodsListOptions,
  checkoutDirectPaymentCreateMutation,
  creditsBalanceRetrieveOptions 
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
  
  // Fetch real user credit balance
  const { data: creditBalance } = useQuery({
    ...creditsBalanceRetrieveOptions(),
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
  
  // Auto-enable credits if user has balance
  useEffect(() => {
    if (creditBalance && creditBalance.balance_cents > 0) {
      setApplyCredits(true)
    }
  }, [creditBalance])

  // Credit balance state
  const [applyCredits, setApplyCredits] = useState(false)

  // Get service ID and other parameters from URL
  const serviceId = searchParams.get("serviceId")
  const serviceType = searchParams.get("type") || "session"
  const selectedDate = searchParams.get("date")
  const selectedTime = searchParams.get("time")
  const selectedSessionIds = searchParams.get("sessions")?.split(",").map(Number) || []

  // Check authentication and show modal if needed
  useEffect(() => {
    if (!isAuthenticated) {
      const currentUrl = `/checkout?serviceId=${serviceId}&type=${serviceType}`
      const fullUrl = selectedDate && selectedTime
        ? `${currentUrl}&date=${selectedDate}&time=${selectedTime}`
        : currentUrl

      openAuthModal({
        defaultTab: "login",
        redirectUrl: fullUrl,
        serviceType: serviceType,
        title: "Sign in to Continue",
        description: "Please sign in to complete your booking"
      })
    }
  }, [isAuthenticated, serviceId, serviceType, selectedDate, selectedTime, openAuthModal])

  // Fetch service data from API using ID
  const { data: serviceData, isLoading: loadingService, error: serviceError } = useQuery({
    ...servicesRetrieveOptions({ path: { id: parseInt(serviceId || '0') } }),
    enabled: !!serviceId && !isNaN(parseInt(serviceId)),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

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

    if (!serviceId || !serviceData) {
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
        service_id: parseInt(serviceId), // Now using integer ID
        payment_method_id: parseInt(selectedPaymentMethodId),
        apply_credits: applyCredits,
        special_requests: specialRequests,
      }
      
      // Add booking-specific details based on service type
      if (serviceType === 'session') {
        // For sessions, we need start and end time
        if (selectedDate && selectedTime) {
          // Parse the formatted date string (e.g., "Mon, Jul 07")
          // We need to add the current year since it's not included
          const currentYear = new Date().getFullYear()
          const [dayName, monthDate] = selectedDate.split(', ')
          const dateWithYear = `${monthDate}, ${currentYear}`
          
          // Create the date object with the current year
          const baseDate = new Date(dateWithYear)
          
          // Parse the time (e.g., "2:30 PM" or "14:30")
          let hours: number, minutes: number
          
          if (selectedTime.includes('AM') || selectedTime.includes('PM')) {
            // 12-hour format with AM/PM
            const [time, period] = selectedTime.split(' ')
            const [hourStr, minuteStr] = time.split(':')
            hours = parseInt(hourStr)
            minutes = parseInt(minuteStr)
            
            // Convert to 24-hour format
            if (period === 'PM' && hours !== 12) {
              hours += 12
            } else if (period === 'AM' && hours === 12) {
              hours = 0
            }
          } else {
            // 24-hour format
            const [hourStr, minuteStr] = selectedTime.split(':')
            hours = parseInt(hourStr)
            minutes = parseInt(minuteStr)
          }
          
          // Create the full datetime
          const startDateTime = new Date(baseDate)
          startDateTime.setHours(hours, minutes, 0, 0)
          
          // Calculate end time based on service duration
          const durationMinutes = serviceData.duration_minutes || 60
          const endDateTime = new Date(startDateTime)
          endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes)
          
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
          // Parse the formatted date string (e.g., "Mon, Jul 07")
          const currentYear = new Date().getFullYear()
          const [dayName, monthDate] = selectedDate.split(', ')
          const dateWithYear = `${monthDate}, ${currentYear}`
          
          // Create the date object with the current year
          const baseDate = new Date(dateWithYear)
          
          // Parse the time (e.g., "2:30 PM" or "14:30")
          let hours: number, minutes: number
          
          if (selectedTime.includes('AM') || selectedTime.includes('PM')) {
            // 12-hour format with AM/PM
            const [time, period] = selectedTime.split(' ')
            const [hourStr, minuteStr] = time.split(':')
            hours = parseInt(hourStr)
            minutes = parseInt(minuteStr)
            
            // Convert to 24-hour format
            if (period === 'PM' && hours !== 12) {
              hours += 12
            } else if (period === 'AM' && hours === 12) {
              hours = 0
            }
          } else {
            // 24-hour format
            const [hourStr, minuteStr] = selectedTime.split(':')
            hours = parseInt(hourStr)
            minutes = parseInt(minuteStr)
          }
          
          // Create the full datetime
          const startDateTime = new Date(baseDate)
          startDateTime.setHours(hours, minutes, 0, 0)
          
          // Calculate end time based on service duration
          const durationMinutes = serviceData.duration_minutes || 60
          const endDateTime = new Date(startDateTime)
          endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes)
          
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
    id: serviceData.id,
    title: serviceData.name || 'Service',
    type: serviceType,
    price: serviceData.price_cents ? serviceData.price_cents / 100 : 0,
    location: serviceData.location_type === 'virtual' ? 'Virtual' : serviceData.location || 'Virtual',
    practitioner: {
      name: serviceData.primary_practitioner?.display_name || serviceData.practitioner?.display_name || 'Practitioner',
      image: serviceData.primary_practitioner?.profile_image_url || serviceData.practitioner?.profile_image_url,
      slug: serviceData.primary_practitioner?.slug || serviceData.practitioner?.slug
    },
    image: serviceData.image_url || serviceData.featured_image,
    firstSessionDate: serviceData.first_session_date,
    lastSessionDate: serviceData.last_session_date,
    nextSessionDate: serviceData.next_session_date
  }

  // Calculate pricing - ensure all values are numbers
  const basePrice = service.price
  const userCreditBalance = creditBalance ? creditBalance.balance : 0
  const creditsToApply = applyCredits ? Math.min(userCreditBalance, basePrice) : 0
  const subtotal = basePrice
  const discount = creditsToApply + promoDiscount
  const total = subtotal - discount

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
          <Link href="/" className="flex items-center font-bold text-xl tracking-widest">
            ESTUARY
          </Link>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
        <div className="container max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-5">
            {/* Checkout Form */}
            <div className="lg:col-span-3">
              {/* Back link */}
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Back to service
              </button>

              <h1 className="text-3xl font-medium mb-8">Checkout</h1>

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
                      Special Requests or Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      id="special-requests"
                      placeholder="Any special requirements or information for the practitioner..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="resize-none bg-white"
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
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Complete Payment (${total.toFixed(2)})
                      </>
                    )}
                  </Button>

                  {/* Legal language and security information */}
                  <div className="mt-3 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      By completing this payment, you agree to Estuary's{" "}
                      <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
                      {" "}and{" "}
                      <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Secure checkout powered by Stripe
                    </p>
                  </div>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Service + Practitioner */}
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-lg bg-white border border-sage-200 overflow-hidden flex-shrink-0">
                      {service.image ? (
                        <img
                          src={service.image || "/placeholder.svg"}
                          alt={service.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                          <span className="text-lg font-medium text-olive-700">{service.title?.charAt(0) || "S"}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-olive-900 text-sm line-clamp-2">{service.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {service.practitioner?.image ? (
                          <img
                            src={service.practitioner.image}
                            alt={service.practitioner.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                            <User className="h-3 w-3 text-olive-600" />
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">{service.practitioner?.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details - Compact */}
                  <div className="grid grid-cols-2 gap-2 text-sm bg-sage-50/50 rounded-lg p-3 border border-sage-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">
                        {serviceType === "courses" && service.firstSessionDate && service.lastSessionDate
                          ? `${new Date(service.firstSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : selectedDate || "Flexible"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{selectedTime || "TBC"}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{service.location || "Virtual"}</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Price Breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {/* Credits */}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Credits</span>
                      <div className="flex items-center gap-2">
                        {userCreditBalance > 0 ? (
                          <>
                            <span className={applyCredits ? "text-sage-700" : "text-muted-foreground"}>
                              {applyCredits ? `-$${creditsToApply.toFixed(2)}` : `$${userCreditBalance.toFixed(2)} available`}
                            </span>
                            <Switch
                              id="apply-credits"
                              checked={applyCredits}
                              onCheckedChange={setApplyCredits}
                              className="scale-75"
                            />
                          </>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </div>
                    </div>

                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-sage-700">
                        <span>Promo</span>
                        <span>-${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Promo Code Input */}
                    {!promoApplied && (
                      <div className="flex gap-1 pt-1">
                        <Input
                          id="promo-code"
                          placeholder="Promo code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          onClick={handleApplyPromo}
                          className="h-8 px-3"
                          size="sm"
                          disabled={!promoCode}
                        >
                          Apply
                        </Button>
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div className="flex justify-between text-base font-semibold text-olive-900">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Satisfaction Guarantee - Compact */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                    <span>Satisfaction guaranteed · Full refund available</span>
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
