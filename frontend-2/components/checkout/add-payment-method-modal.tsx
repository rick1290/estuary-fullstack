"use client"

import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { paymentMethodsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, CreditCard, Lock } from "lucide-react"
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { getStripe } from "@/lib/stripe-loader"

// Initialize Stripe
const stripePromise = getStripe()

interface AddPaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PaymentMethodForm({ onSuccess, onCancel }: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const queryClient = useQueryClient()
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isDefault, setIsDefault] = useState(true)
  const [postalCode, setPostalCode] = useState("")

  const createPaymentMethod = useMutation({
    ...paymentMethodsCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethodsList'] })
      onSuccess()
    },
    onError: (error: any) => {
      const message = error?.body?.detail || error?.message || "Failed to add payment method"
      setErrors({ general: message })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      return
    }

    setErrors({})

    // Form is valid - proceed

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      return
    }

    // Create payment method with Stripe
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        address: {
          postal_code: postalCode
        }
      }
    })

    if (error) {
      setErrors({ card: error.message || "Invalid card details" })
      return
    }

    if (!paymentMethod) {
      setErrors({ general: "Failed to create payment method" })
      return
    }

    // Save payment method to backend
    await createPaymentMethod.mutateAsync({
      body: {
        stripe_payment_method_id: paymentMethod.id,
        is_default: isDefault
      }
    })
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="card">Card Information</Label>
        <div className="border rounded-md p-3 bg-background">
          <CardElement id="card" options={cardElementOptions} />
        </div>
        {errors.card && <p className="text-sm text-destructive">{errors.card}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="postalCode">Postal Code</Label>
        <Input
          id="postalCode"
          placeholder="12345"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="default"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(!!checked)}
        />
        <Label
          htmlFor="default"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Set as default payment method
        </Label>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <p>Your payment information is encrypted and secure</p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={createPaymentMethod.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || createPaymentMethod.isPending}
        >
          {createPaymentMethod.isPending ? (
            <>
              <span className="mr-2">Adding</span>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </>
          ) : (
            "Add Payment Method"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function AddPaymentMethodModal({
  open,
  onOpenChange,
}: AddPaymentMethodModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a new credit or debit card to your account. Your payment information is securely processed by Stripe.
          </DialogDescription>
        </DialogHeader>
        
        <Elements stripe={stripePromise}>
          <PaymentMethodForm
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}