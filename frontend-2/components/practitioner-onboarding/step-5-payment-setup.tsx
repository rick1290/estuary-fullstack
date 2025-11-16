"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ChevronLeft, CreditCard, CheckCircle2 } from "lucide-react"
import { practitionerApplicationsStripeConnectCreateCreate } from "@/src/client/sdk.gen"

interface Step5Data {
  stripe_account_id?: string
}

interface Step5PaymentSetupProps {
  initialData?: Partial<Step5Data>
  onComplete: (data: Step5Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step5PaymentSetup({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step5PaymentSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSetupPayments = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Call SDK to create Stripe Connect onboarding link
      const { data, error } = await practitionerApplicationsStripeConnectCreateCreate({
        body: {
          practitioner_id: practitionerId,
          return_url: `${window.location.origin}/become-practitioner/onboarding/complete?success=true`,
          refresh_url: `${window.location.origin}/become-practitioner/onboarding?step=5`
        }
      })

      if (error) {
        throw new Error('Failed to create Stripe onboarding link')
      }

      // Redirect to Stripe Connect onboarding
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No URL returned from API')
      }
    } catch (error: any) {
      console.error('Error setting up Stripe:', error)
      setError(error.message || 'Failed to setup payments. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSkipForNow = () => {
    // Allow them to skip but mark as incomplete
    onComplete({ stripe_account_id: undefined })
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Payment Setup</CardTitle>
        <CardDescription className="text-olive-600">
          Connect your bank account to receive payouts
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info Box */}
        <div className="p-6 bg-gradient-to-br from-sage-50 to-terracotta-50 rounded-lg border border-sage-200">
          <div className="flex items-start gap-4">
            <CreditCard className="h-8 w-8 text-sage-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium text-olive-900 mb-2">Secure Payment Processing with Stripe</h3>
              <p className="text-sm text-olive-700 mb-3">
                Estuary uses Stripe Connect to process payments securely. You'll need to:
              </p>
              <ul className="text-sm text-olive-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" />
                  <span>Provide your business information</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" />
                  <span>Connect your bank account for payouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-600 mt-0.5 flex-shrink-0" />
                  <span>Verify your identity (for security)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 py-4">
          <img
            src="https://stripe.com/img/v3/home/social.png"
            alt="Powered by Stripe"
            className="h-8 opacity-70"
          />
          <span className="text-sm text-olive-600">Powered by Stripe</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-terracotta-50 border border-terracotta-200 rounded-lg">
            <p className="text-sm text-terracotta-700">{error}</p>
          </div>
        )}

        {/* Setup Button */}
        <div className="space-y-4">
          <Button
            onClick={handleSetupPayments}
            disabled={isLoading}
            className="w-full py-6 text-lg bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              "Setup Payments with Stripe"
            )}
          </Button>

          <p className="text-xs text-center text-olive-500">
            You'll be redirected to Stripe to complete the setup process (~5 minutes)
          </p>
        </div>

        {/* Skip Option */}
        <div className="pt-4 border-t border-sage-100">
          <p className="text-sm text-olive-700 mb-3 text-center">
            Not ready to set up payments right now?
          </p>
          <Button
            onClick={handleSkipForNow}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            I'll Set This Up Later
          </Button>
          <p className="text-xs text-olive-500 mt-2 text-center">
            You can complete this from your dashboard, but you won't be able to accept bookings until payment setup is complete.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-sage-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-olive-600"
            disabled={isLoading}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
