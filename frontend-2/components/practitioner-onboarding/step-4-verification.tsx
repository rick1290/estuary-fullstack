"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronLeft, ShieldCheck } from "lucide-react"

interface Step4Data {
  background_check_consent: boolean
}

interface Step4VerificationProps {
  initialData?: Partial<Step4Data>
  onComplete: (data: Step4Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step4Verification({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step4VerificationProps) {
  const [consent, setConsent] = useState(initialData?.background_check_consent || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setError(null)

    try {
      // In production, you would submit background check consent here
      // For now, we just continue
      onComplete({ background_check_consent: consent })
    } catch (error: any) {
      console.error('Error:', error)
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    // Allow them to skip verification for now
    onComplete({ background_check_consent: false })
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Credentials (Optional)</CardTitle>
        <CardDescription className="text-olive-600">
          Add your professional credentials or skip for now
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Info Box */}
          <div className="p-6 bg-sage-50 rounded-lg border border-sage-200">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-sage-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-medium text-olive-900 mb-2">Build Trust with Credentials</h3>
                <p className="text-sm text-olive-700 mb-3">
                  Adding credentials helps build trust with potential clients and can increase your bookings. You can add these now or complete this later from your dashboard.
                </p>
                <ul className="text-sm text-olive-600 space-y-1">
                  <li>• Professional certifications and licenses</li>
                  <li>• Education history</li>
                  <li>• Specialized training</li>
                  <li>• Background verification (reviewed within 24-48 hours)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optional: Upload credentials */}
          <div className="space-y-4">
            <Label>Professional Credentials</Label>
            <p className="text-sm text-olive-600 mb-3">
              If you have professional certifications, licenses, or educational credentials, you can add them from your dashboard after completing onboarding.
            </p>
          </div>

          {/* Consent Checkbox */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-sage-100">
            <div>
              <Label className="text-base font-medium text-olive-900 mb-3 block">
                Background Verification (Optional)
              </Label>
              <div className="flex items-start space-x-3 bg-white p-4 rounded-lg border border-sage-200">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
                  I consent to Estuary conducting a background check and verifying my credentials as part of the practitioner application process. This helps maintain the safety and quality of the platform.
                </Label>
              </div>
              <p className="text-xs text-olive-500 mt-2">
                You can complete verification later, but you won't be able to accept bookings until verified.
              </p>
            </div>
            {error && (
              <p className="text-sm text-terracotta-600">{error}</p>
            )}
          </form>

          {/* Skip Option */}
          <div className="p-4 bg-terracotta-50 rounded-lg border border-terracotta-200">
            <p className="text-sm text-olive-700 text-center">
              <span className="font-medium">Not ready to add credentials?</span> You can skip this step and complete it later from your practitioner dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-6 border-t border-sage-100">
            {/* Primary actions */}
            <div className="flex items-center justify-between">
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
                  disabled={isSubmitting}
                  className="px-8 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Continuing...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
