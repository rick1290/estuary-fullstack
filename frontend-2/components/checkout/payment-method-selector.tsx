"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  paymentMethodsListOptions, 
  paymentMethodsSetDefaultCreateMutation,
  paymentMethodsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentMethodSelectorProps {
  selectedMethodId: string | null
  onSelectMethod: (methodId: string) => void
  onAddNewCard: () => void
}

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

export default function PaymentMethodSelector({
  selectedMethodId,
  onSelectMethod,
  onAddNewCard
}: PaymentMethodSelectorProps) {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<number | null>(null)

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

  const handleDelete = async (methodId: number) => {
    if (!confirm("Are you sure you want to remove this payment method?")) {
      return
    }
    
    setDeletingId(methodId)
    await deleteMutation.mutateAsync({
      path: { id: methodId }
    })
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
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load payment methods. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const methods = paymentMethods?.results || []
  const hasValidMethods = methods.some(method => !isExpired(method.exp_month, method.exp_year))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payment Methods</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddNewCard}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Card
        </Button>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No payment methods saved</p>
            <Button onClick={onAddNewCard} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Payment Method
            </Button>
          </div>
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
            
            <RadioGroup
              value={selectedMethodId || ""}
              onValueChange={onSelectMethod}
              className="space-y-3"
            >
              {methods.map((method) => {
                const expired = isExpired(method.exp_month, method.exp_year)
                const isDeleting = deletingId === method.id
                
                return (
                  <div
                    key={method.id}
                    className={cn(
                      "relative rounded-lg border p-4",
                      selectedMethodId === method.id.toString() && "border-primary bg-primary/5",
                      expired && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={method.id.toString()}
                        id={`method-${method.id}`}
                        disabled={expired || isDeleting}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={`method-${method.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className={cn(
                              "h-5 w-5",
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
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {method.is_default && (
                              <div className="flex items-center gap-1 text-primary">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Default</span>
                              </div>
                            )}
                            
                            {!method.is_default && !expired && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleSetDefault(method.id)
                                }}
                                disabled={setDefaultMutation.isPending}
                              >
                                Set as default
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                handleDelete(method.id)
                              }}
                              disabled={isDeleting}
                              className="text-destructive hover:text-destructive"
                            >
                              {isDeleting ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </>
        )}
      </CardContent>
    </Card>
  )
}