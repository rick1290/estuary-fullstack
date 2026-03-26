"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign, Loader2 } from "lucide-react"

interface TipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamId: number | string
  postId?: string
  practitionerName: string
}

const PRESET_AMOUNTS = [100, 300, 500, 1000, 2500]

export default function TipModal({ open, onOpenChange, streamId, postId, practitionerName }: TipModalProps) {
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()

  const [selectedAmount, setSelectedAmount] = useState<number>(500)
  const [customAmount, setCustomAmount] = useState("")
  const [isCustom, setIsCustom] = useState(false)
  const [message, setMessage] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const amountCents = isCustom ? Math.round(parseFloat(customAmount || "0") * 100) : selectedAmount

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount)
    setIsCustom(false)
    setCustomAmount("")
  }

  const handleCustom = () => {
    setIsCustom(true)
    setSelectedAmount(0)
  }

  const handleSendTip = async () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: window.location.pathname,
        serviceType: "stream",
        title: "Sign in to Tip",
        description: "Please sign in to send a tip"
      })
      return
    }

    if (amountCents < 100) {
      toast({
        title: "Minimum tip is $1.00",
        description: "Please enter an amount of at least $1.00",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = postId
        ? `${apiUrl}/api/v1/stream-posts/${postId}/tip/`
        : `${apiUrl}/api/v1/streams/${streamId}/tip/`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount_cents: amountCents,
          message: message || undefined,
          is_anonymous: isAnonymous,
          // TODO: Replace with real Stripe payment method from Stripe Elements integration
          payment_method_id: 'pm_card_visa',
        }),
      })

      if (response.ok) {
        toast({
          title: "Tip sent!",
          description: `You tipped ${practitionerName} $${(amountCents / 100).toFixed(2)}`,
        })
        onOpenChange(false)
        // Reset state
        setSelectedAmount(500)
        setCustomAmount("")
        setIsCustom(false)
        setMessage("")
        setIsAnonymous(false)
      } else {
        const data = await response.json().catch(() => ({}))
        toast({
          title: "Couldn't process your tip. Please try again.",
          description: data.error || "Please try again later",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Couldn't process your tip. Please try again.",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Send a Tip
          </DialogTitle>
          <DialogDescription>
            Show your appreciation for {practitionerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preset amounts */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Amount</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleSelectPreset(amount)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${!isCustom && selectedAmount === amount
                      ? "bg-amber-500 text-white"
                      : "bg-sage-50 text-olive-700 hover:bg-sage-100 border border-sage-200/60"
                    }
                  `}
                >
                  ${(amount / 100).toFixed(0)}
                </button>
              ))}
              <button
                onClick={handleCustom}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${isCustom
                    ? "bg-amber-500 text-white"
                    : "bg-sage-50 text-olive-700 hover:bg-sage-100 border border-sage-200/60"
                  }
                `}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom amount input */}
          {isCustom && (
            <div>
              <Label htmlFor="custom-amount" className="text-sm font-medium mb-1 block">
                Custom Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="custom-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="5.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <Label htmlFor="tip-message" className="text-sm font-medium mb-1 block">
              Message <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="tip-message"
              placeholder="Say something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-sage-300"
            />
            <span className="text-sm text-olive-700">Send anonymously</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendTip}
            disabled={isSending || amountCents < 100}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send $${(amountCents / 100).toFixed(2)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
