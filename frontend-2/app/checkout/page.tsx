"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import LoginModal from "@/components/auth/login-modal"
import { getServiceById } from "@/lib/services"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

// Mock saved cards data
const savedCards = [
  { id: 1, last4: "4242", brand: "Visa", expiry: "12/25" },
  { id: 2, last4: "5555", brand: "Mastercard", expiry: "08/24" },
]

// Mock user credit balance
const userCreditBalance = 25.0

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, login } = useAuth()

  const [loading, setLoading] = useState(true)
  const [service, setService] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [specialRequests, setSpecialRequests] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showNewCardDialog, setShowNewCardDialog] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)

  // Payment form state
  const [selectedCard, setSelectedCard] = useState(savedCards.length > 0 ? savedCards[0].id : null)
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({})
  const [verifyingCard, setVerifyingCard] = useState(false)

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
          setShowLoginModal(true)
        }
      }
    }

    autoLogin()
  }, [isAuthenticated, login])

  useEffect(() => {
    // Fetch service data
    const fetchService = async () => {
      if (!serviceId) {
        setError("No service selected")
        setLoading(false)
        return
      }

      try {
        const serviceData = await getServiceById(serviceId)
        if (!serviceData) {
          setError("Service not found")
          setLoading(false)
          return
        }

        setService(serviceData)
        setLoading(false)
      } catch (err) {
        setError("Failed to load service data")
        setLoading(false)
      }
    }

    fetchService()
  }, [serviceId])

  const handleLoginModalClose = () => {
    // If user closes login modal without logging in, redirect back
    if (!isAuthenticated) {
      router.back()
    }
    setShowLoginModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate payment processing
    setProcessingPayment(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Redirect to confirmation page
      router.push(`/checkout/confirmation?serviceId=${serviceId}&type=${serviceType}`)
    } catch (error) {
      setError("Payment processing failed. Please try again.")
      setProcessingPayment(false)
    }
  }

  const handleAddCard = async () => {
    // Validate card details
    const errors: { [key: string]: string } = {}

    if (!cardNumber) errors.cardNumber = "Card number is required"
    if (!cardName) errors.cardName = "Name on card is required"
    if (!cardExpiry) errors.cardExpiry = "Expiry date is required"
    if (!cardCvc) errors.cardCvc = "CVC is required"

    if (Object.keys(errors).length > 0) {
      setCardErrors(errors)
      return
    }

    setVerifyingCard(true)

    try {
      // Simulate card verification
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Add the new card to saved cards (in a real app, this would be an API call)
      const newCard = {
        id: savedCards.length + 1,
        last4: cardNumber.slice(-4),
        brand: cardNumber.startsWith("4") ? "Visa" : "Mastercard",
        expiry: cardExpiry,
      }

      // Close dialog and reset form
      setShowNewCardDialog(false)
      setVerifyingCard(false)
      setCardNumber("")
      setCardName("")
      setCardExpiry("")
      setCardCvc("")
      setCardErrors({})

      // In a real app, you would update the saved cards list
      // For now, we'll just set the selected card
      setSelectedCard(newCard.id)
    } catch (error) {
      setCardErrors({ general: "Failed to verify card. Please try again." })
      setVerifyingCard(false)
    }
  }

  const handleApplyPromo = () => {
    if (!promoCode) return

    // Simulate promo code verification
    setPromoApplied(true)
    setPromoDiscount(10) // $10 discount for demo
  }

  if (loading) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-6xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="container max-w-6xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Service not found</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  // Calculate pricing - ensure all values are numbers
  const basePrice =
    typeof service.price === "number" ? service.price : service.price ? Number.parseFloat(service.price) : 99.99 // Default price if not available
  const creditsToApply = applyCredits ? Math.min(userCreditBalance, basePrice) : 0
  const subtotal = basePrice
  const discount = creditsToApply + promoDiscount
  const tax = (subtotal - discount) * 0.08 // 8% tax
  const total = subtotal - discount + tax

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={handleLoginModalClose}
        redirectUrl={`/checkout?serviceId=${serviceId}&type=${serviceType}`}
        serviceType={serviceType}
      />

      {/* New Card Dialog */}
      <Dialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {cardErrors.general && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cardErrors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="dialog-card-number">Card Number</Label>
              <Input
                id="dialog-card-number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              {cardErrors.cardNumber && <p className="text-sm text-destructive">{cardErrors.cardNumber}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-card-name">Name on Card</Label>
              <Input
                id="dialog-card-name"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
              {cardErrors.cardName && <p className="text-sm text-destructive">{cardErrors.cardName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-card-expiry">Expiry Date</Label>
                <Input
                  id="dialog-card-expiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                />
                {cardErrors.cardExpiry && <p className="text-sm text-destructive">{cardErrors.cardExpiry}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog-card-cvc">CVC</Label>
                <Input
                  id="dialog-card-cvc"
                  placeholder="123"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                />
                {cardErrors.cardCvc && <p className="text-sm text-destructive">{cardErrors.cardCvc}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard} disabled={verifyingCard}>
              {verifyingCard ? (
                <>
                  <span className="mr-2">Verifying</span>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                </>
              ) : (
                "Add Card"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logo - Full Width */}
      <div className="w-full py-6 border-b border-gray-100 bg-white">
        <div className="px-6 md:px-10 lg:px-12">
          <Link href="/" className="inline-block">
            <h1 className="text-xl font-medium tracking-tight">ESTUARY</h1>
          </Link>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
        <div className="container max-w-6xl py-12">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
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
                {/* Payment Method */}
                <Card className="mb-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Payment Methods</CardTitle>
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md">
                      <div className="p-4 flex items-center justify-between border-b">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Debit / credit card</span>
                        </div>
                        <Button
                          variant="ghost"
                          className="font-medium text-primary"
                          onClick={() => setShowNewCardDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          ADD A NEW CARD
                        </Button>
                      </div>

                      {savedCards.length > 0 && (
                        <div className="p-4 space-y-3">
                          {savedCards.map((card) => (
                            <div
                              key={card.id}
                              className={`p-3 border rounded-md flex items-center justify-between cursor-pointer ${
                                selectedCard === card.id ? "border-primary bg-primary/5" : ""
                              }`}
                              onClick={() => setSelectedCard(card.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                                  {selectedCard === card.id && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                                </div>
                                <span>
                                  {card.brand} ending in {card.last4} (expires {card.expiry})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

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

                  <Button type="submit" className="w-full" size="lg" disabled={processingPayment}>
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
            <div>
              <Card className="md:sticky md:top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md bg-muted overflow-hidden">
                      {service.image ? (
                        <img
                          src={service.image || "/placeholder.svg"}
                          alt={service.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-secondary flex items-center justify-center">
                          <span className="text-secondary-foreground">{service.title?.charAt(0) || "S"}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
                      </p>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="space-y-4 p-3">
                      <h3 className="font-medium text-sm">Booking Details</h3>
                      <div className="grid gap-2 text-sm">
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

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {creditsToApply > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Credits Applied</span>
                        <span>-${creditsToApply.toFixed(2)}</span>
                      </div>
                    )}

                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Promo Discount</span>
                        <span>-${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="rounded-md bg-primary/10 p-3">
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Satisfaction Guaranteed</p>
                        <p className="text-muted-foreground">Full refund if you're not completely satisfied</p>
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
