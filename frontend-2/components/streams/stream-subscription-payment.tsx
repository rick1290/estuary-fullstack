"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  paymentMethodsListOptions,
  streamsSubscribeCreateMutation
} from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import PaymentMethodSelector from "@/components/checkout/payment-method-selector"
import AddPaymentMethodModal from "@/components/checkout/add-payment-method-modal"
import { useStripe } from "@stripe/react-stripe-js"
import { 
  CreditCard, 
  Lock, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StreamSubscriptionPaymentProps {
  stream: any
  selectedTier: "entry" | "premium"
  onSuccess: () => void
  onCancel: () => void
}

export default function StreamSubscriptionPayment({
  stream,
  selectedTier,
  onSuccess,
  onCancel
}: StreamSubscriptionPaymentProps) {
  const stripe = useStripe()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    ...paymentMethodsListOptions(),
    enabled: !!user
  })

  // Auto-select default payment method
  useEffect(() => {
    if (paymentMethods?.results && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.results.find(m => m.is_default)
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id.toString())
      }
    }
  }, [paymentMethods, selectedPaymentMethodId])

  // Subscribe mutation
  const subscribeMutation = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: async (data) => {
      if (data.client_secret && stripe) {
        // Confirm payment with Stripe
        const result = await stripe.confirmCardPayment(data.client_secret)
        
        if (result.error) {
          setPaymentError(result.error.message || "Payment failed")
          setProcessingPayment(false)
        } else {
          // Payment successful
          toast({
            title: "Subscription successful!",
            description: `You are now subscribed to ${stream.title} (${selectedTier} tier)`,
          })
          queryClient.invalidateQueries({ 
            queryKey: ['streamsRetrieve', { path: { id: stream.id } }] 
          })
          onSuccess()
        }
      }
    },
    onError: (error: any) => {
      const message = error?.body?.detail || error?.body?.message || "Subscription failed"
      setPaymentError(message)
      setProcessingPayment(false)
    }
  })

  const handleSubscribe = async () => {
    if (!selectedPaymentMethodId) {
      setPaymentError("Please select a payment method")
      return
    }

    if (!stripe) {
      setPaymentError("Payment system not ready. Please try again.")
      return
    }

    setPaymentError(null)
    setProcessingPayment(true)

    try {
      await subscribeMutation.mutateAsync({
        path: {
          id: stream.id
        },
        body: {
          tier: selectedTier,
          payment_method_id: parseInt(selectedPaymentMethodId)
        }
      })
    } catch (error) {
      // Error handled by mutation
      console.error('Subscription error:', error)
    }
  }

  // Calculate pricing
  const monthlyPrice = selectedTier === 'entry' 
    ? (stream.entry_tier_price_cents / 100).toFixed(2)
    : (stream.premium_tier_price_cents / 100).toFixed(2)

  const tierFeatures = selectedTier === 'entry' ? [
    "Access to all entry-level content",
    "Monthly group sessions",
    "Community discussion access",
    "Email support"
  ] : [
    "Everything in Entry tier",
    "Access to all premium content",
    "1-on-1 monthly check-ins",
    "Priority support",
    "Exclusive workshops"
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button 
        variant="ghost" 
        onClick={onCancel}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to tier selection
      </Button>

      {/* Subscription Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Summary</CardTitle>
          <CardDescription>
            Review your subscription details before confirming payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{stream.title}</h4>
              <p className="text-sm text-muted-foreground">by {stream.practitioner?.display_name}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {selectedTier} Tier
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <h5 className="text-sm font-medium">What's included:</h5>
            <ul className="space-y-1">
              {tierFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Monthly subscription</span>
            <span className="text-2xl font-bold">${monthlyPrice}/mo</span>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You can cancel anytime. No hidden fees or commitments.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div>
        <PaymentMethodSelector
          selectedMethodId={selectedPaymentMethodId}
          onSelectMethod={setSelectedPaymentMethodId}
          onAddNewCard={() => setShowAddPaymentModal(true)}
        />
      </div>

      {/* Error Display */}
      {paymentError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={processingPayment}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubscribe}
          disabled={processingPayment || !selectedPaymentMethodId || !stripe}
          className="flex-1"
        >
          {processingPayment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Subscribe ${monthlyPrice}/mo
            </>
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure payment powered by Stripe
        </p>
      </div>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        open={showAddPaymentModal}
        onOpenChange={setShowAddPaymentModal}
      />
    </div>
  )
}