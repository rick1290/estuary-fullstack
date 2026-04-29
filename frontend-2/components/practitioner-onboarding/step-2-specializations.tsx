"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ChevronLeft, Sparkles, Users, Lightbulb, BookOpen, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { practitionersPartialUpdate } from "@/src/client/sdk.gen"
import { useQuery } from "@tanstack/react-query"
import {
  specializationsListOptions,
  stylesListOptions,
  topicsListOptions,
  modalitiesListOptions,
  modalityCategoriesListOptions,
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
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [categoriesInitialized, setCategoriesInitialized] = useState(false)

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) next.delete(categoryName)
      else next.add(categoryName)
      return next
    })
  }

  // Fetch data from API
  const { data: specializationsData, isLoading: specializationsLoading } = useQuery(specializationsListOptions())
  const { data: stylesData, isLoading: stylesLoading } = useQuery(stylesListOptions())
  const { data: topicsData, isLoading: topicsLoading } = useQuery(topicsListOptions())
  const { data: modalitiesData, isLoading: modalitiesLoading } = useQuery(modalitiesListOptions({ query: { page_size: 200 } }))
  const { data: modalityCategoriesData, isLoading: modalityCategoriesLoading } = useQuery(modalityCategoriesListOptions({ query: { page_size: 50 } }))

  // Ensure data is always an array - handle both direct arrays and paginated responses
  const specializations = Array.isArray(specializationsData) ? specializationsData :
                         (specializationsData?.results && Array.isArray(specializationsData.results)) ? specializationsData.results : []
  const styles = Array.isArray(stylesData) ? stylesData :
                 (stylesData?.results && Array.isArray(stylesData.results)) ? stylesData.results : []
  const topics = Array.isArray(topicsData) ? topicsData :
                 (topicsData?.results && Array.isArray(topicsData.results)) ? topicsData.results : []
  const modalities = Array.isArray(modalitiesData) ? modalitiesData :
                     (modalitiesData?.results && Array.isArray(modalitiesData.results)) ? modalitiesData.results : []
  const modalityCategories = modalityCategoriesData?.results || []

  // Group modalities by category slug
  const modalitiesByCategory = modalities.reduce<Record<string, typeof modalities>>((acc, mod) => {
    const catSlug = (mod as any).category_slug || "other"
    if (!acc[catSlug]) acc[catSlug] = []
    acc[catSlug].push(mod)
    return acc
  }, {})

  const isLoading = specializationsLoading || stylesLoading || topicsLoading || modalitiesLoading || modalityCategoriesLoading

  // Initialize first 3 categories as open once data loads
  useEffect(() => {
    if (!categoriesInitialized && modalityCategories.length > 0) {
      const firstThree = modalityCategories.slice(0, 3).map((cat) => cat.name || "")
      setOpenCategories(new Set(firstThree))
      setCategoriesInitialized(true)
    }
  }, [modalityCategories, categoriesInitialized])

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
    <>
    <Card className="border-0 shadow-xl pb-20">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Your Expertise</CardTitle>
        <CardDescription className="text-olive-600">
          Tell us about your specializations and approach
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form id="step-2-form" onSubmit={handleSubmit} className="space-y-8">
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
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all h-full min-h-[48px] flex items-center justify-center text-center",
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
              <span className="text-sm text-olive-500">
                {(formData.style_ids?.length || 0) === 0
                  ? "Optional · select all that apply"
                  : `${formData.style_ids?.length} selected`}
              </span>
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
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all h-full min-h-[48px] flex items-center justify-center text-center",
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
              <span className="text-sm text-olive-500">
                {(formData.topic_ids?.length || 0) === 0
                  ? "Optional · select all that apply"
                  : `${formData.topic_ids?.length} selected`}
              </span>
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
                      "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all h-full min-h-[48px] flex items-center justify-center text-center",
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

          {/* Modalities — grouped by category */}
          <div className="space-y-4 pt-6 border-t border-sage-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-olive-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sage-600" />
                Session Modalities
              </label>
              <span className="text-sm text-olive-500">
                {formData.modality_ids?.length || 0} selected
              </span>
            </div>

            <div className="space-y-2">
              {modalityCategories.map((cat) => {
                const catModalities = modalitiesByCategory[(cat as any).slug ?? ""] || []
                if (catModalities.length === 0) return null
                const selectedCount = catModalities.filter(
                  (m) => formData.modality_ids?.includes(m.id.toString())
                ).length
                const isOpen = openCategories.has(cat.name || "")
                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "rounded-lg border overflow-hidden transition-colors",
                      isOpen ? "border-sage-200 bg-white" : "border-sage-100 bg-sage-50/40 hover:bg-sage-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.name || "")}
                      className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-olive-800 hover:text-olive-900"
                    >
                      <span className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: (cat as any).color || "#9CAF88" }}
                        />
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                          <Badge variant="secondary" className="text-xs bg-sage-100 text-sage-700">
                            {selectedCount}
                          </Badge>
                        )}
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-3 pb-3 pt-1 border-t border-sage-100">
                        {catModalities.map((modality) => {
                          const isSelected = formData.modality_ids?.includes(modality.id.toString()) || false
                          return (
                            <button
                              key={modality.id}
                              type="button"
                              onClick={() => toggleSelection(modality.id.toString(), 'modality_ids')}
                              className={cn(
                                "px-3 py-2 rounded-lg border-2 text-sm transition-all text-left",
                                isSelected
                                  ? "border-sage-500 bg-sage-50 text-sage-700 font-medium"
                                  : "border-sage-200 bg-white text-olive-600 hover:border-sage-300"
                              )}
                            >
                              {modality.name}
                              {isSelected && <span className="ml-1">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-olive-500">
              Select the modalities you practice. You can always update these later.
            </p>
          </div>

          {/* Optional note */}
          <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
            <p className="text-sm text-olive-700">
              <span className="font-medium">Not sure?</span> You can always add or change these from your dashboard later.
            </p>
          </div>

        </form>
      </CardContent>
    </Card>

    {/* Fixed bottom bar — outside the Card */}
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-sage-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
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
          form="step-2-form"
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
    </div>
    </>
  )
}
