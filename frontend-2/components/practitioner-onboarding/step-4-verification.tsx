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

    if (!consent) {
      setError("You must consent to the background check to continue")
      return
    }

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

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Verification & Trust</CardTitle>
        <CardDescription className="text-olive-600">
          Help us build a trusted community
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Box */}
          <div className="p-6 bg-sage-50 rounded-lg border border-sage-200">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-sage-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-medium text-olive-900 mb-2">Why We Verify Practitioners</h3>
                <p className="text-sm text-olive-700 mb-3">
                  Estuary is committed to creating a safe, trusted marketplace. All practitioners undergo a basic verification process to ensure the quality and safety of our community.
                </p>
                <ul className="text-sm text-olive-600 space-y-1">
                  <li>• Background check (if applicable to your field)</li>
                  <li>• Professional credential verification</li>
                  <li>• Identity confirmation</li>
                  <li>• Typical review time: 24-48 hours</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optional: Upload credentials */}
          <div className="space-y-4">
            <Label>Upload Credentials (Optional)</Label>
            <p className="text-sm text-olive-600 mb-3">
              If you have professional certifications or licenses, you can upload them now or add them later from your dashboard.
            </p>
            <Button type="button" variant="outline" className="w-full">
              Upload Certificates (Optional)
            </Button>
            <p className="text-xs text-olive-500 text-center">
              You can skip this step and add credentials later
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-4 pt-4 border-t border-sage-100">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
                I consent to Estuary conducting a background check and verifying my credentials as part of the practitioner application process. I understand this helps maintain the safety and quality of the platform.
              </Label>
            </div>
            {error && (
              <p className="text-sm text-terracotta-600">{error}</p>
            )}
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
              disabled={isSubmitting || !consent}
              className="px-8 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Continuing...
                </>
              ) : (
                "Continue to Payment Setup"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
