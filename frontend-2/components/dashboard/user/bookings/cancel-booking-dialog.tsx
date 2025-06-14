"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface CancelBookingDialogProps {
  bookingId: number
  serviceName: string
  practitionerName: string
  date: string
  time: string
  price: string
  open: boolean
  onOpenChange: (open: boolean) => void
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
}: CancelBookingDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<"confirm" | "reason" | "processing" | "success">("confirm")
  const [reason, setReason] = useState<string>("")
  const [reasonCategory, setReasonCategory] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const handleContinue = () => {
    setStep("reason")
  }

  const handleSubmit = () => {
    if (!reasonCategory) {
      setError("Please select a reason category")
      return
    }

    setError(null)
    setStep("processing")

    // Simulate API call
    setTimeout(() => {
      setStep("success")
    }, 1500)
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

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        {step === "confirm" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel your booking for {serviceName} with {practitionerName} on {date} at{" "}
                {time}?
              </AlertDialogDescription>
            </AlertDialogHeader>
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
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
              <AlertDialogAction onClick={handleContinue} className="bg-destructive text-destructive-foreground">
                Continue to Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}

        {step === "reason" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Why are you cancelling?</AlertDialogTitle>
              <AlertDialogDescription>
                Your feedback helps us improve our services. This information is only shared anonymously.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setStep("confirm")}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleSubmit}>
                Confirm Cancellation
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === "processing" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Processing Cancellation</AlertDialogTitle>
              <AlertDialogDescription>Please wait while we process your cancellation...</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Booking Successfully Cancelled
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Your booking has been cancelled and your time slot has been released.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
            <AlertDialogFooter>
              <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
                Return to Bookings
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
