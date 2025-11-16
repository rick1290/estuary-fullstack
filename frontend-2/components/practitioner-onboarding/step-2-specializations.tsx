"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ChevronLeft, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { practitionersPartialUpdate } from "@/src/client/sdk.gen"

interface Step2Data {
  specialization_ids: string[]
  style_ids?: string[]
  topic_ids?: string[]
  modality_ids?: string[]
}

interface Step2SpecializationsProps {
  initialData?: Partial<Step2Data>
  onComplete: (data: Step2Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step2Specializations({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step2SpecializationsProps) {
  const [formData, setFormData] = useState<Step2Data>({
    specialization_ids: initialData?.specialization_ids || [],
    style_ids: initialData?.style_ids || [],
    topic_ids: initialData?.topic_ids || [],
    modality_ids: initialData?.modality_ids || []
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // For MVP, using hardcoded options
  // TODO: Fetch from API in production
  const SPECIALIZATIONS = [
    { id: "1", name: "Mindfulness" },
    { id: "2", name: "Meditation" },
    { id: "3", name: "Yoga" },
    { id: "4", name: "Therapy" },
    { id: "5", name: "Coaching" },
    { id: "6", name: "Nutrition" },
    { id: "7", name: "Fitness" },
    { id: "8", name: "Wellness" }
  ]

  const toggleSelection = (id: string, field: keyof Step2Data) => {
    setFormData(prev => {
      const currentList = prev[field] as string[] || []
      const isSelected = currentList.includes(id)

      return {
        ...prev,
        [field]: isSelected
          ? currentList.filter(item => item !== id)
          : [...currentList, id]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.specialization_ids.length === 0) {
      setError("Please select at least one specialization")
      return
    }

    if (formData.specialization_ids.length > 5) {
      setError("Please select no more than 5 specializations")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Update practitioner profile via SDK
      const { error } = await practitionersPartialUpdate({
        path: { id: practitionerId },
        body: formData
      })

      if (error) {
        throw new Error('Failed to update specializations')
      }

      onComplete(formData)
    } catch (error: any) {
      console.error('Error updating specializations:', error)
      setError(error.message || 'Failed to save. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Your Expertise</CardTitle>
        <CardDescription className="text-olive-600">
          Select your areas of specialization (1-5 required)
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Specializations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-olive-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sage-600" />
                Specializations *
              </label>
              <span className="text-sm text-olive-600">
                {formData.specialization_ids.length} / 5 selected
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SPECIALIZATIONS.map((spec) => {
                const isSelected = formData.specialization_ids.includes(spec.id)
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSelection(spec.id, 'specialization_ids')}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                      isSelected
                        ? "border-sage-500 bg-sage-50 text-sage-700"
                        : "border-sage-200 bg-white text-olive-600 hover:border-sage-300"
                    )}
                  >
                    {spec.name}
                    {isSelected && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <p className="text-sm text-terracotta-600">{error}</p>
            )}

            <p className="text-xs text-olive-500">
              Choose the areas where you have the most expertise. You can add more later.
            </p>
          </div>

          {/* Optional note */}
          <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
            <p className="text-sm text-olive-700">
              <span className="font-medium">Not sure?</span> You can always add more specializations, styles, and topics from your dashboard later.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-sage-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-olive-600"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || formData.specialization_ids.length === 0}
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
        </form>
      </CardContent>
    </Card>
  )
}
