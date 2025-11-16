"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import ProgressStepper from "@/components/practitioner-onboarding/progress-stepper"
import { useAuth } from "@/hooks/use-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

// Step components (we'll create these)
import Step1BasicProfile from "@/components/practitioner-onboarding/step-1-basic-profile"
import Step2Specializations from "@/components/practitioner-onboarding/step-2-specializations"
import Step3FirstService from "@/components/practitioner-onboarding/step-3-first-service"
import Step4Verification from "@/components/practitioner-onboarding/step-4-verification"
import Step5PaymentSetup from "@/components/practitioner-onboarding/step-5-payment-setup"

interface OnboardingData {
  basicProfile?: {
    display_name: string
    professional_title: string
    bio: string
    years_of_experience: number
    profile_image_url?: string
  }
  specializations?: {
    specialization_ids: string[]
    style_ids?: string[]
    topic_ids?: string[]
    modality_ids?: string[]
  }
  firstService?: {
    name: string
    description: string
    service_type: string
    duration_minutes: number
    price_cents: number
    location_type: string
  }
  verification?: {
    certifications?: any[]
    educations?: any[]
    background_check_consent: boolean
  }
  paymentSetup?: {
    stripe_account_id?: string
  }
}

export default function PractitionerOnboardingPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [practitionerId, setPractitionerId] = useState<string | null>(null)

  // Check if user is authenticated and doesn't already have a practitioner profile
  useEffect(() => {
    const checkPractitionerStatus = async () => {
      if (!isAuthenticated) {
        router.push('/become-practitioner')
        return
      }

      try {
        const response = await fetch('/api/v1/practitioners/my-profile/', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()

          // Check if onboarding is already complete
          if (data.is_onboarded) {
            router.push('/dashboard/practitioner')
            return
          }

          // Resume onboarding from where they left off
          setPractitionerId(data.id)
          setCurrentStep(data.onboarding_step || 1)

          // Load any saved progress
          // TODO: Fetch onboarding progress from API

          setIsLoading(false)
        } else if (response.status === 404) {
          // No practitioner profile - they can proceed
          setIsLoading(false)
        } else {
          setError('Failed to check practitioner status')
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Error checking practitioner status:', err)
        setError('An error occurred. Please try again.')
        setIsLoading(false)
      }
    }

    checkPractitionerStatus()
  }, [isAuthenticated, router])

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('practitioner_onboarding')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setOnboardingData(data.formData || {})
        setCurrentStep(data.currentStep || 1)
        setCompletedSteps(data.completedSteps || [])
      } catch (err) {
        console.error('Error loading saved progress:', err)
      }
    }
  }, [])

  // Auto-save progress to localStorage
  useEffect(() => {
    const dataToSave = {
      currentStep,
      completedSteps,
      formData: onboardingData,
      lastSaved: new Date().toISOString()
    }
    localStorage.setItem('practitioner_onboarding', JSON.stringify(dataToSave))
  }, [currentStep, completedSteps, onboardingData])

  const handleStepComplete = (stepNumber: number, data: any) => {
    // Update onboarding data
    setOnboardingData(prev => ({
      ...prev,
      ...data
    }))

    // Mark step as completed
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps(prev => [...prev, stepNumber])
    }

    // Move to next step
    if (stepNumber < 5) {
      setCurrentStep(stepNumber + 1)
    } else {
      // All steps complete - redirect to completion page
      router.push('/become-practitioner/onboarding/complete')
    }
  }

  const handleStepBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-sage-600 animate-spin mx-auto mb-4" />
          <p className="text-olive-700">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white flex items-center justify-center p-6">
        <Alert className="max-w-md border-terracotta-200 bg-terracotta-50">
          <AlertCircle className="h-4 w-4 text-terracotta-600" />
          <AlertDescription className="text-olive-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-olive-900 mb-3">
            Welcome to Estuary
          </h1>
          <p className="text-lg text-olive-600">
            Let's set up your practitioner profile
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-12">
          <ProgressStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <Step1BasicProfile
                initialData={onboardingData.basicProfile}
                onComplete={(data) => handleStepComplete(1, { basicProfile: data })}
                onBack={handleStepBack}
                practitionerId={practitionerId}
                setPractitionerId={setPractitionerId}
              />
            )}

            {currentStep === 2 && (
              <Step2Specializations
                initialData={onboardingData.specializations}
                onComplete={(data) => handleStepComplete(2, { specializations: data })}
                onBack={handleStepBack}
                practitionerId={practitionerId}
              />
            )}

            {currentStep === 3 && (
              <Step3FirstService
                initialData={onboardingData.firstService}
                onComplete={(data) => handleStepComplete(3, { firstService: data })}
                onBack={handleStepBack}
                practitionerId={practitionerId}
              />
            )}

            {currentStep === 4 && (
              <Step4Verification
                initialData={onboardingData.verification}
                onComplete={(data) => handleStepComplete(4, { verification: data })}
                onBack={handleStepBack}
                practitionerId={practitionerId}
              />
            )}

            {currentStep === 5 && (
              <Step5PaymentSetup
                initialData={onboardingData.paymentSetup}
                onComplete={(data) => handleStepComplete(5, { paymentSetup: data })}
                onBack={handleStepBack}
                practitionerId={practitionerId}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-olive-600">
            Need help? Email us at{" "}
            <a href="mailto:support@estuary.com" className="text-sage-600 hover:underline">
              support@estuary.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
