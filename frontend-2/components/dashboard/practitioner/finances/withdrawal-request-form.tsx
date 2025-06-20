"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"

interface WithdrawalRequestFormProps {
  availableBalance: number
  onSubmit: (amount: number) => void
  isLoading?: boolean
}

export function WithdrawalRequestForm({ availableBalance, onSubmit, isLoading }: WithdrawalRequestFormProps) {
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("bank")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
      setAmount(value)
      setError("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = Number.parseFloat(amount)

    if (!amount || isNaN(numAmount)) {
      setError("Please enter a valid amount")
      return
    }

    if (numAmount <= 0) {
      setError("Amount must be greater than zero")
      return
    }

    if (numAmount > availableBalance) {
      setError("Amount exceeds available balance")
      return
    }

    if (numAmount < 50) {
      setError("Minimum withdrawal amount is $50")
      return
    }

    // Process withdrawal request
    onSubmit(numAmount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input id="amount" placeholder="0.00" value={amount} onChange={handleAmountChange} className="pl-8" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-muted-foreground">Available balance: {formatCurrency(availableBalance)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-method">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger id="payment-method">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Bank Account (ACH)</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any special instructions here"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSubmit(0)} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Request Withdrawal"}
        </Button>
      </div>
    </form>
  )
}
