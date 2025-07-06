"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface CancelBookingDialogProps {
  bookingId: number | string
  serviceName: string
  practitionerName: string
  date: string
  time: string
  price: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm?: (reason: string) => void
  isLoading?: boolean
}

export function CancelBookingDialog({
  bookingId,
  serviceName,
  practitionerName,
  date,
  time,
  price,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: CancelBookingDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<"confirm" | "reason" | "processing" | "success">("confirm")
  const [reason, setReason] = useState<string>("")
  const [reasonCategory, setReasonCategory] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Debug log
  React.useEffect(() => {
    console.log('CancelBookingDialog state:', { open, step, isLoading })
  }, [open, step, isLoading])

  const handleContinue = () => {
    setStep("reason")
  }

  const handleSubmit = () => {
    if (!reasonCategory) {
      setError("Please select a reason category")
      return
    }

    setError(null)
    
    // Combine category and optional additional comments
    const fullReason = reason 
      ? `${reasonCategory}: ${reason}`
      : reasonCategory
    
    if (onConfirm) {
      setStep("processing")
      onConfirm(fullReason)
    } else {
      // Fallback to simulation if no handler provided
      setStep("processing")
      setTimeout(() => {
        setStep("success")
      }, 1500)
    }
  }

  const handleClose = () => {
    if (step === "success") {
      onOpenChange(false)

      // Show a toast notification for additional confirmation
      toast({
        title: "Booking Successfully Cancelled",
        description: `Your booking for ${serviceName} on ${date} has been cancelled and a refund of ${price} will be processed.`,
        variant: "success",
      })

      // Refresh the bookings list
      router.refresh()
    } else {
      onOpenChange(false)
      // Reset the dialog state
      setTimeout(() => {
        setStep("confirm")
        setReason("")
        setReasonCategory("")
        setError(null)
      }, 300)
    }
  }

  // Handle success from parent component
  React.useEffect(() => {
    if (isLoading === false && step === "processing") {
      setStep("success")
    }
  }, [isLoading, step])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your booking for {serviceName} with {practitionerName} on {date} at{" "}
                {time}?
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4">
              <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Important information</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Cancelling this booking will release the time slot for other users. Your credits of {price} will be
                  returned to your wallet within 1-2 business days.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose()}>Keep Booking</Button>
              <Button onClick={handleContinue} variant="destructive">
                Continue to Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "reason" && (
          <>
            <DialogHeader>
              <DialogTitle>Why are you cancelling?</DialogTitle>
              <DialogDescription>
                Your feedback helps us improve our services. This information is only shared anonymously.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason-category">Reason for cancellation</Label>
                <Select value={reasonCategory} onValueChange={setReasonCategory}>
                  <SelectTrigger id="reason-category" className={error ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule-conflict">Schedule conflict</SelectItem>
                    <SelectItem value="found-alternative">Found an alternative service</SelectItem>
                    <SelectItem value="no-longer-needed">No longer needed</SelectItem>
                    <SelectItem value="health-issue">Health issue</SelectItem>
                    <SelectItem value="financial-reasons">Financial reasons</SelectItem>
                    <SelectItem value="other">Other reason</SelectItem>
                  </SelectContent>
                </Select>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-comments">Additional comments (optional)</Label>
                <Textarea
                  id="additional-comments"
                  placeholder="Please share any additional details about why you're cancelling..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("confirm")}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Processing..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "processing" && (
          <>
            <DialogHeader>
              <DialogTitle>Processing Cancellation</DialogTitle>
              <DialogDescription>Please wait while we process your cancellation...</DialogDescription>
            </DialogHeader>
            <div className="my-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Booking Successfully Cancelled
              </DialogTitle>
              <DialogDescription className="text-base">
                Your booking has been cancelled and your time slot has been released.
              </DialogDescription>
            </DialogHeader>
            <div className="my-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Cancellation Details:</h4>
                <ul className="space-y-2 text-green-700">
                  <li>
                    <span className="font-medium">Service:</span> {serviceName}
                  </li>
                  <li>
                    <span className="font-medium">Date & Time:</span> {date} at {time}
                  </li>
                  <li>
                    <span className="font-medium">Practitioner:</span> {practitionerName}
                  </li>
                  <li>
                    <span className="font-medium">Refund Amount:</span> {price}
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Your credits of {price} will be returned to your wallet within 1-2 business days. A confirmation email
                  has been sent to your registered email address.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
                Return to Bookings
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}