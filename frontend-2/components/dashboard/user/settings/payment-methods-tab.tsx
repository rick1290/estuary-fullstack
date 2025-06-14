"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreditCard, Plus, Trash2 } from "lucide-react"

// Mock payment methods
const initialPaymentMethods = [
  {
    id: "1",
    type: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2025,
    isDefault: true,
  },
  {
    id: "2",
    type: "mastercard",
    last4: "5555",
    expMonth: 8,
    expYear: 2024,
    isDefault: false,
  },
]

export default function PaymentMethodsTab() {
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods)
  const [openDialog, setOpenDialog] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expMonth, setExpMonth] = useState("")
  const [expYear, setExpYear] = useState("")
  const [cvv, setCvv] = useState("")

  const handleAddCard = () => {
    // Simulate adding a new card
    const newCard = {
      id: Math.random().toString(36).substring(7),
      type: "visa",
      last4: cardNumber.slice(-4),
      expMonth: Number.parseInt(expMonth),
      expYear: Number.parseInt(expYear),
      isDefault: paymentMethods.length === 0,
    }

    setPaymentMethods([...paymentMethods, newCard])
    handleCloseDialog()
  }

  const handleDeleteCard = (id: string) => {
    setPaymentMethods(paymentMethods.filter((method) => method.id !== id))
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods(
      paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === id,
      })),
    )
  }

  const handleOpenDialog = () => {
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setCardNumber("")
    setCardName("")
    setExpMonth("")
    setExpYear("")
    setCvv("")
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medium">Payment Methods</h2>
        <Button onClick={handleOpenDialog} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <Card key={method.id} className="border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CreditCard className="mr-4 h-5 w-5" />
                  <div>
                    <p className="font-medium">
                      {method.type.charAt(0).toUpperCase() + method.type.slice(1)} •••• {method.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.expMonth}/{method.expYear}
                    </p>
                    {method.isDefault && <p className="text-xs text-primary">Default payment method</p>}
                  </div>
                </div>
                <div className="flex items-center">
                  {!method.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(method.id)} className="mr-2">
                      Set as Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={() => handleDeleteCard(method.id)}
                    disabled={method.isDefault}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>Enter your card details to add a new payment method.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cardName">Name on Card</Label>
              <Input
                id="cardName"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expMonth">Expiration Month</Label>
                <Select value={expMonth} onValueChange={setExpMonth}>
                  <SelectTrigger id="expMonth">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expYear">Expiration Year</Label>
                <Select value={expYear} onValueChange={setExpYear}>
                  <SelectTrigger id="expYear">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input id="cvv" value={cvv} onChange={(e) => setCvv(e.target.value)} className="w-24" placeholder="123" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddCard}>Add Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
