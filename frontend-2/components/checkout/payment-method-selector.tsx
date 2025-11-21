"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  paymentMethodsListOptions,
  paymentMethodsSetDefaultCreateMutation,
  paymentMethodsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown
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
  'amex': 'Amex',
  'discover': 'Discover',
  'diners': 'Diners',
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

  const handleDelete = async (e: React.MouseEvent, methodId: number) => {
    e.preventDefault()
    e.stopPropagation()

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
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Failed to load payment methods
        </div>
      </div>
    )
  }

  const methods = paymentMethods?.results || []
  const validMethods = methods.filter(method => !isExpired(method.exp_month, method.exp_year))
  const selectedMethod = methods.find(m => m.id.toString() === selectedMethodId)

  // No payment methods
  if (methods.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Button
          type="button"
          variant="outline"
          onClick={onAddNewCard}
          className="w-full justify-start gap-2 h-11"
        >
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Payment Method</Label>
      <Select
        value={selectedMethodId || ""}
        onValueChange={(value) => {
          if (value === "add-new") {
            onAddNewCard()
          } else {
            onSelectMethod(value)
          }
        }}
      >
        <SelectTrigger className="w-full h-11 bg-white">
          <SelectValue placeholder="Select payment method">
            {selectedMethod && (
              <div className="flex items-center gap-2">
                <CreditCard className={cn("h-4 w-4", brandColors[selectedMethod.brand])} />
                <span>
                  {brandDisplayNames[selectedMethod.brand]} •••• {selectedMethod.last4}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatExpiry(selectedMethod.exp_month, selectedMethod.exp_year)}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {methods.map((method) => {
            const expired = isExpired(method.exp_month, method.exp_year)

            return (
              <SelectItem
                key={method.id}
                value={method.id.toString()}
                disabled={expired}
                className="py-3"
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className={cn("h-4 w-4", brandColors[method.brand])} />
                    <span className={expired ? "text-muted-foreground" : ""}>
                      {brandDisplayNames[method.brand]} •••• {method.last4}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatExpiry(method.exp_month, method.exp_year)}
                    </span>
                    {expired && (
                      <span className="text-destructive text-xs">(Expired)</span>
                    )}
                    {method.is_default && !expired && (
                      <span className="text-xs text-primary font-medium">Default</span>
                    )}
                  </div>
                </div>
              </SelectItem>
            )
          })}

          {/* Add new card option */}
          <SelectItem value="add-new" className="py-3 border-t mt-1">
            <div className="flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" />
              <span>Add new card</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Manage cards link */}
      {methods.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Manage your saved cards in{" "}
          <a href="/dashboard/user/profile" className="underline hover:text-foreground">
            account settings
          </a>
        </p>
      )}
    </div>
  )
}
