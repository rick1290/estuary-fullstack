"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  paymentMethodsListOptions, 
  paymentMethodsSetDefaultCreateMutation,
  paymentMethodsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CreditCard, Plus, Trash2, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import AddPaymentMethodModal from "@/components/checkout/add-payment-method-modal"

// Map Stripe brand names to display names
const brandDisplayNames: Record<string, string> = {
  'visa': 'Visa',
  'mastercard': 'Mastercard',
  'amex': 'American Express',
  'discover': 'Discover',
  'diners': 'Diners Club',
  'jcb': 'JCB',
  'unionpay': 'UnionPay',
  'unknown': 'Card'
}

// Map brands to colors
const brandColors: Record<string, string> = {
  'visa': 'text-blue-600',
  'mastercard': 'text-orange-600',
  'amex': 'text-blue-500',
  'discover': 'text-orange-500',
  'diners': 'text-gray-600',
  'jcb': 'text-red-600',
  'unionpay': 'text-red-500',
  'unknown': 'text-gray-600'
}

export default function PaymentMethodsTab() {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showAddCardModal, setShowAddCardModal] = useState(false)

  // Fetch payment methods
  const { data: paymentMethods, isLoading, error } = useQuery({
    ...paymentMethodsListOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // Mutation to set default payment method
  const setDefaultMutation = useMutation({
    ...paymentMethodsSetDefaultCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethodsList'] })
    },
  })

  // Mutation to delete payment method
  const deleteMutation = useMutation({
    ...paymentMethodsDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethodsList'] })
      setDeletingId(null)
    },
    onError: () => {
      setDeletingId(null)
    }
  })

  const handleSetDefault = async (methodId: number) => {
    await setDefaultMutation.mutateAsync({
      path: { id: methodId }
    })
  }

  const handleDeleteCard = async (methodId: number) => {
    if (!confirm("Are you sure you want to remove this payment method?")) {
      return
    }
    
    setDeletingId(methodId)
    await deleteMutation.mutateAsync({
      path: { id: methodId }
    })
  }

  const handleAddCard = () => {
    setShowAddCardModal(true)
  }

  // Check if a card is expired
  const isExpired = (expMonth: number, expYear: number) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    return expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)
  }

  // Format expiry date
  const formatExpiry = (month: number, year: number) => {
    const monthStr = month.toString().padStart(2, '0')
    const yearStr = year.toString().slice(-2)
    return `${monthStr}/${yearStr}`
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium">Payment Methods</h2>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-medium mb-6">Payment Methods</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load payment methods. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const methods = paymentMethods?.results || []
  const hasValidMethods = methods.some(method => !isExpired(method.exp_month, method.exp_year))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medium">Payment Methods</h2>
        <Button onClick={handleAddCard} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No payment methods saved</p>
              <Button onClick={handleAddCard} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Card
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {!hasValidMethods && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                All your saved cards have expired. Please add a new payment method.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {methods.map((method) => {
              const expired = isExpired(method.exp_month, method.exp_year)
              const isDeleting = deletingId === method.id
              
              return (
                <Card 
                  key={method.id} 
                  className={cn(
                    "border transition-all",
                    expired && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CreditCard className={cn(
                          "mr-4 h-5 w-5",
                          brandColors[method.brand] || "text-gray-600"
                        )} />
                        <div>
                          <p className="font-medium">
                            {brandDisplayNames[method.brand] || method.brand} •••• {method.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {formatExpiry(method.exp_month, method.exp_year)}
                            {expired && (
                              <span className="text-destructive ml-2">
                                (Expired)
                              </span>
                            )}
                          </p>
                          {method.is_default && (
                            <div className="flex items-center gap-1 text-primary mt-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">Default payment method</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.is_default && !expired && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSetDefault(method.id)}
                            disabled={setDefaultMutation.isPending}
                          >
                            Set as Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleDeleteCard(method.id)}
                          disabled={isDeleting || method.is_default}
                          title={method.is_default ? "Cannot delete default payment method" : "Delete payment method"}
                        >
                          {isDeleting ? (
                            <Clock className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
      
      <AddPaymentMethodModal
        open={showAddCardModal}
        onOpenChange={setShowAddCardModal}
      />
    </div>
  )
}