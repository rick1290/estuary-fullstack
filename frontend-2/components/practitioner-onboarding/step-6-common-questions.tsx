"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronLeft, Plus, X, MessageCircleQuestion } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { practitionersQuestionsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Question {
  title: string
  order: number
}

interface Step6Data {
  questions: Question[]
}

interface Step6CommonQuestionsProps {
  initialData?: Partial<Step6Data>
  onComplete: (data: Step6Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step6CommonQuestions({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step6CommonQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || [])
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuestionMutation = useMutation({
    ...practitionersQuestionsCreateMutation()
  })

  const addQuestion = () => {
    if (currentQuestion.trim()) {
      setQuestions([...questions, { title: currentQuestion, order: questions.length }])
      setCurrentQuestion("")
    }
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!practitionerId) {
      setError("No practitioner profile found. Please complete previous steps first.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Submit questions
      for (const question of questions) {
        await createQuestionMutation.mutateAsync({
          path: { id: practitionerId },
          body: question
        })
      }

      onComplete({ questions })
    } catch (error: any) {
      console.error('Error saving questions:', error)
      setError('Failed to save questions. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onComplete({ questions: [] })
  }

  const suggestedQuestions = [
    "What should I expect during our first session?",
    "What is your cancellation policy?",
    "Do you offer virtual sessions?",
    "What forms of payment do you accept?",
    "How long is a typical session?",
    "Do you offer packages or discounts?",
  ]

  const addSuggestedQuestion = (question: string) => {
    if (!questions.find(q => q.title === question)) {
      setQuestions([...questions, { title: question, order: questions.length }])
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Common Questions (Optional)</CardTitle>
        <CardDescription className="text-olive-600">
          Add questions clients often ask to help them feel more prepared
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Box */}
          <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
            <div className="flex items-start gap-3">
              <MessageCircleQuestion className="h-5 w-5 text-sage-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-olive-700">
                <p className="font-medium mb-1">Help clients feel comfortable</p>
                <p>Adding common questions helps set expectations and reduces pre-session anxiety. These will appear on your profile for potential clients to see.</p>
              </div>
            </div>
          </div>

          {/* Added Questions */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <Label>Your Questions</Label>
              {questions.map((question, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-sage-50 rounded-lg border border-sage-200">
                  <MessageCircleQuestion className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-olive-900">{question.title}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                    className="text-terracotta-600 hover:text-terracotta-700 hover:bg-terracotta-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Question Form */}
          <div className="space-y-3">
            <Label htmlFor="question">Add a Question</Label>
            <div className="flex gap-2">
              <Textarea
                id="question"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="e.g., What should I expect during our first session?"
                rows={2}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                disabled={!currentQuestion.trim()}
                className="self-start"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggested Questions */}
          <div className="space-y-3">
            <Label>Suggested Questions</Label>
            <p className="text-sm text-olive-600">Click to add any of these common questions:</p>
            <div className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  onClick={() => addSuggestedQuestion(question)}
                  disabled={questions.some(q => q.title === question)}
                  className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                >
                  <Plus className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="text-olive-700">{question}</span>
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Skip Info */}
          <div className="p-4 bg-terracotta-50 rounded-lg border border-terracotta-200">
            <p className="text-sm text-olive-700 text-center">
              <span className="font-medium">Not ready to add questions?</span> You can skip this step and add them later from your dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-sage-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-olive-600"
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="px-6"
              >
                Skip for Now
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || questions.length === 0}
                className="px-8 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
