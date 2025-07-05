"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Loader2 } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { reviewsCreate } from "@/src/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ReviewBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: {
    id: string
    public_uuid: string
    service?: {
      name?: string
      primary_practitioner?: {
        display_name?: string
        public_uuid?: string
      }
    }
    practitioner?: {
      display_name?: string
      public_uuid?: string
    }
  }
  onSuccess?: () => void
}

export function ReviewBookingDialog({ open, onOpenChange, booking, onSuccess }: ReviewBookingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")

  const practitionerName = booking.service?.primary_practitioner?.display_name || booking.practitioner?.display_name
  const practitionerUuid = booking.service?.primary_practitioner?.public_uuid || booking.practitioner?.public_uuid
  const serviceName = booking.service?.name

  const { mutate: submitReview, isPending } = useMutation({
    mutationFn: async () => {
      if (!practitionerUuid) {
        throw new Error("Practitioner information not found")
      }

      const response = await reviewsCreate({
        body: {
          rating: rating.toString(),
          comment: comment.trim(),
          practitioner_uuid: practitionerUuid,
          service_uuid: booking.service?.public_uuid,
          booking_uuid: booking.public_uuid,
          is_anonymous: false,
          answers: []
        }
      })

      return response.data
    },
    onSuccess: () => {
      toast.success("Thank you for your review!")
      setRating(0)
      setComment("")
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      console.error('Review submission error:', error)
      const message = error?.response?.data?.message || 
                     error?.response?.data?.detail || 
                     error?.response?.data?.error ||
                     "Failed to submit review. You may have already reviewed this booking."
      toast.error(message)
    }
  })

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    if (!comment.trim()) {
      toast.error("Please add a comment about your experience")
      return
    }

    submitReview()
  }

  const displayRating = hoveredRating || rating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Review Your Experience</DialogTitle>
          <DialogDescription>
            Share your experience with {practitionerName} for {serviceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label>How was your experience?</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-transparent text-gray-300"
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Tell us more about your experience</Label>
            <Textarea
              id="comment"
              placeholder="What did you enjoy? How was the practitioner? Would you recommend this service?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your review will be public and help others make informed decisions
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || rating === 0}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}