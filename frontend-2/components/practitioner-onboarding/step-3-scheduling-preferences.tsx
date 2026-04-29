"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ChevronLeft, Clock, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { practitionersPartialUpdate } from "@/src/client/sdk.gen"

interface Step3Data {
  buffer_time: number
}

interface Step3SchedulingPreferencesProps {
  initialData?: Partial<Step3Data>
  onComplete: (data: Step3Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step3SchedulingPreferences({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step3SchedulingPreferencesProps) {
  const [formData, setFormData] = useState<Step3Data>({
    buffer_time: initialData?.buffer_time || 15
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setError(null)

    try {
      // Update practitioner profile via SDK
      const { error } = await practitionersPartialUpdate({
        path: { id: practitionerId },
        body: {
          buffer_time: formData.buffer_time
        }
      })

      if (error) {
        throw new Error('Failed to update scheduling preferences')
      }

      onComplete(formData)
    } catch (error: any) {
      console.error('Error updating scheduling preferences:', error)
      setError(error.message || 'Failed to save. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <Card className="border-0 shadow-xl pb-20">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Scheduling Preferences</CardTitle>
        <CardDescription className="text-olive-600">
          Set up your default scheduling preferences
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form id="step-3-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Buffer Time */}
          <div className="space-y-2">
            <Label htmlFor="buffer_time" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sage-600" />
              Buffer Time Between Sessions *
            </Label>
            <Select
              value={formData.buffer_time.toString()}
              onValueChange={(value) => setFormData({ ...formData, buffer_time: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes (recommended)</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-olive-500">
              Time between consecutive sessions for preparation, notes, and breaks
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-gradient-to-br from-sage-50 to-terracotta-50 rounded-lg border border-sage-200">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-sage-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-olive-900 mb-1">About Buffer Time</h3>
                <p className="text-sm text-olive-700">
                  Buffer time helps prevent back-to-back sessions, giving you time to:
                </p>
                <ul className="text-sm text-olive-600 mt-2 space-y-1 ml-4 list-disc">
                  <li>Complete session notes</li>
                  <li>Take a short break</li>
                  <li>Prepare for your next client</li>
                  <li>Handle any session overruns gracefully</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
            <p className="text-sm text-olive-700">
              <span className="font-medium">Up next:</span> Once you finish setup, head to{" "}
              <span className="font-medium">Dashboard → Availability</span> to set your weekly hours and bookable time slots.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-terracotta-50 border border-terracotta-200 rounded-lg">
              <p className="text-sm text-terracotta-700">{error}</p>
            </div>
          )}

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
          form="step-3-form"
          disabled={isSubmitting}
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
