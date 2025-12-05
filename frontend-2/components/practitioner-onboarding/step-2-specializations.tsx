"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ChevronLeft, Sparkles, Users, Lightbulb, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { practitionersPartialUpdate } from "@/src/client/sdk.gen"
import { useQuery } from "@tanstack/react-query"
import {
  specializationsListOptions,
  stylesListOptions,
  topicsListOptions,
  modalitiesListOptions
} from "@/src/client/@tanstack/react-query.gen"

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

  // Fetch data from API
  const { data: specializationsData, isLoading: specializationsLoading } = useQuery(specializationsListOptions())
  const { data: stylesData, isLoading: stylesLoading } = useQuery(stylesListOptions())
  const { data: topicsData, isLoading: topicsLoading } = useQuery(topicsListOptions())
  const { data: modalitiesData, isLoading: modalitiesLoading } = useQuery(modalitiesListOptions())

  // Ensure data is always an array - handle both direct arrays and paginated responses
  const specializations = Array.isArray(specializationsData) ? specializationsData :
                         (specializationsData?.results && Array.isArray(specializationsData.results)) ? specializationsData.results : []
  const styles = Array.isArray(stylesData) ? stylesData :
                 (stylesData?.results && Array.isArray(stylesData.results)) ? stylesData.results : []
  const topics = Array.isArray(topicsData) ? topicsData :
                 (topicsData?.results && Array.isArray(topicsData.results)) ? topicsData.results : []
  const modalities = Array.isArray(modalitiesData) ? modalitiesData :
                     (modalitiesData?.results && Array.isArray(modalitiesData.results)) ? modalitiesData.results : []

  const isLoading = specializationsLoading || stylesLoading || topicsLoading || modalitiesLoading

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
      // Ensure we have a practitioner ID
      if (!practitionerId) {
        throw new Error('Practitioner profile not found. Please go back and complete step 1.')
      }

      // Convert string IDs to numbers for the API
      const specialization_ids = formData.specialization_ids.map(id => parseInt(id))
      const style_ids = formData.style_ids?.map(id => parseInt(id)) || []
      const topic_ids = formData.topic_ids?.map(id => parseInt(id)) || []
      const modality_ids = formData.modality_ids?.map(id => parseInt(id)) || []

      // Update practitioner profile via SDK
      const { error } = await practitionersPartialUpdate({
        path: { id: practitionerId },
        body: {
          specialization_ids,
          style_ids,
          topic_ids,
          modality_ids
        }
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

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-sage-600 animate-spin mb-4" />
            <p className="text-olive-600">Loading options...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Your Expertise</CardTitle>
        <CardDescription className="text-olive-600">
          Tell us about your specializations and approach
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
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
              {specializations.map((spec) => {
                const isSelected = formData.specialization_ids.includes(spec.id.toString())
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSelection(spec.id.toString(), 'specialization_ids')}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                      isSelected
                        ? "border-sage-500 bg-sage-50 text-sage-700"
                        : "border-sage-200 bg-white text-olive-600 hover:border-sage-300"
                    )}
                  >
                    {spec.content}
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
              Choose the areas where you have the most expertise. Select 1-5 specializations.
            </p>
          </div>

          {/* Styles */}
          <div className="space-y-4 pt-6 border-t border-sage-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-olive-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-sage-600" />
                Teaching/Coaching Styles
              </label>
              <span className="text-sm text-olive-500">Optional</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {styles.map((style) => {
                const isSelected = formData.style_ids?.includes(style.id.toString()) || false
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleSelection(style.id.toString(), 'style_ids')}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                      isSelected
                        ? "border-sage-500 bg-sage-50 text-sage-700"
                        : "border-sage-200 bg-white text-olive-600 hover:border-sage-300"
                    )}
                  >
                    {style.content}
                    {isSelected && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-olive-500">
              Select the styles that best describe your approach.
            </p>
          </div>

          {/* Topics */}
          <div className="space-y-4 pt-6 border-t border-sage-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-olive-900 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-sage-600" />
                Topics
              </label>
              <span className="text-sm text-olive-500">Optional</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {topics.map((topic) => {
                const isSelected = formData.topic_ids?.includes(topic.id.toString()) || false
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleSelection(topic.id.toString(), 'topic_ids')}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                      isSelected
                        ? "border-sage-500 bg-sage-50 text-sage-700"
                        : "border-sage-200 bg-white text-olive-600 hover:border-sage-300"
                    )}
                  >
                    {topic.content}
                    {isSelected && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-olive-500">
              Select the topics you cover in your practice.
            </p>
          </div>

          {/* Modalities */}
          <div className="space-y-4 pt-6 border-t border-sage-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-olive-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sage-600" />
                Session Modalities
              </label>
              <span className="text-sm text-olive-500">Optional</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {modalities.map((modality) => {
                const isSelected = formData.modality_ids?.includes(modality.id.toString()) || false
                return (
                  <button
                    key={modality.id}
                    type="button"
                    onClick={() => toggleSelection(modality.id.toString(), 'modality_ids')}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                      isSelected
                        ? "border-sage-500 bg-sage-50 text-sage-700"
                        : "border-sage-200 bg-white text-olive-600 hover:border-sage-300"
                    )}
                  >
                    <div className="text-left">
                      <div>{modality.name}</div>
                      {modality.description && (
                        <div className="text-xs text-olive-500 font-normal mt-0.5">{modality.description}</div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-olive-500">
              Select the ways you offer your services.
            </p>
          </div>

          {/* Optional note */}
          <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
            <p className="text-sm text-olive-700">
              <span className="font-medium">Not sure?</span> You can always add or change these from your dashboard later.
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
