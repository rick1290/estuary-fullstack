"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"

interface SessionFeedbackFormProps {
  sessionId: string
  practitionerId: string
}

export function SessionFeedbackForm({ sessionId, practitionerId }: SessionFeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleRatingChange = (selectedRating: number) => {
    setRating(selectedRating)
  }

  const handleSubmit = async () => {
    if (rating === null) return

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, you would send the feedback to your API
    console.log({
      sessionId,
      practitionerId,
      rating,
      feedback,
    })

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="px-6 py-8 text-center">
        <div className="mb-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Star className="h-8 w-8 text-primary fill-primary" />
          </div>
        </div>
        <h3 className="font-medium text-xl mb-2">Thank you for your feedback!</h3>
        <p className="text-muted-foreground">Your feedback helps improve the experience for everyone.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4">
      <h3 className="font-medium text-lg mb-2">Rate your session</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Your feedback helps practitioners improve and helps others find great sessions.
      </p>

      <div className="flex justify-center mb-6">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => handleRatingChange(star)} className="focus:outline-none">
              <Star
                className={`h-8 w-8 ${
                  rating !== null && star <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="feedback" className="block text-sm font-medium mb-2">
          Share your experience (optional)
        </label>
        <Textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What did you like? What could be improved?"
          rows={4}
        />
      </div>

      <Button onClick={handleSubmit} disabled={rating === null || isSubmitting} className="w-full">
        {isSubmitting ? "Submitting..." : "Submit Feedback"}
      </Button>
    </div>
  )
}
