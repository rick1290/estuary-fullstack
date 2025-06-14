"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ServiceFormProvider } from "@/contexts/service-form-context"
import { ServiceTypeStep } from "./steps/service-type-step"
import { BasicInfoStep } from "./steps/basic-info-step"
import { SessionSetupStep } from "./steps/session-setup-step"
import { MediaStep } from "./steps/media-step"
import { PractitionerDetailsStep } from "./steps/practitioner-details-step"
import { LearningGoalsStep } from "./steps/learning-goals-step"
import LocationStep from "./steps/location-step"
import AvailabilityStep from "./steps/availability-step"
import PreviewStep from "./steps/preview-step"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Save } from "lucide-react"
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperTitle,
  StepperTrigger,
  StepperSeparator,
} from "@/components/ui/stepper"
import { useToast } from "@/hooks/use-toast"

// Mock function to fetch service data
const fetchServiceData = async (id: string) => {
  // In a real app, this would be an API call
  return {
    serviceType: "session",
    title: "Mindfulness Meditation Session",
    description: "A guided meditation session to help you reduce stress and increase focus.",
    price: 75,
    duration: 60,
    sessionFormat: "individual",
    sessionType: "single",
    deliveryMethod: "online",
    practitionerBio: "I've been practicing meditation for over 10 years and teaching for 5.",
    credentials: "Certified Meditation Instructor, 200-hour Yoga Teacher Training",
    yearsOfExperience: 5,
    teachingStyle: "Gentle, supportive, and focused on practical techniques.",
    coverImage: "/serene-meditation.png",
    learningGoals: [
      "Develop a daily mindfulness practice",
      "Learn techniques to reduce stress and anxiety",
      "Improve focus and concentration",
    ],
    locationType: "online",
    meetingPlatform: "Zoom",
  }
}

const steps = [
  { id: "service-type", label: "Service Type", component: ServiceTypeStep },
  { id: "basic-info", label: "Basic Info", component: BasicInfoStep },
  { id: "session-setup", label: "Session Setup", component: SessionSetupStep },
  { id: "media", label: "Media", component: MediaStep },
  { id: "practitioner-details", label: "Practitioner Details", component: PractitionerDetailsStep },
  { id: "learning-goals", label: "Learning Goals", component: LearningGoalsStep },
  { id: "location", label: "Location", component: LocationStep },
  { id: "availability", label: "Availability", component: AvailabilityStep },
  { id: "preview", label: "Preview", component: PreviewStep },
]

interface ServiceWizardProps {
  serviceId?: string
}

export default function ServiceWizard({ serviceId }: ServiceWizardProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState<{ [k: number]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<any>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const totalSteps = steps.length
  const isLastStep = activeStep === totalSteps - 1

  // Load service data if in edit mode
  useEffect(() => {
    if (serviceId) {
      setIsLoading(true)
      setIsEditMode(true)

      fetchServiceData(serviceId)
        .then((data) => {
          setInitialData(data)
          // Mark all steps as completed in edit mode
          const allCompleted = steps.reduce(
            (acc, _, index) => {
              acc[index] = true
              return acc
            },
            {} as { [k: number]: boolean },
          )
          setCompleted(allCompleted)
        })
        .catch((error) => {
          console.error("Error fetching service data:", error)
          toast({
            title: "Error",
            description: "Failed to load service data. Please try again.",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [serviceId, toast])

  const handleNext = () => {
    // Mark current step as completed
    setCompleted((prev) => ({ ...prev, [activeStep]: true }))

    if (isLastStep) {
      return
    }

    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleStepClick = (step: number) => {
    // Only allow clicking on completed steps or the next available step
    if (completed[step] || step === activeStep || step === Object.keys(completed).length) {
      setActiveStep(step)
    }
  }

  const handleSave = () => {
    setIsLoading(true)

    // Simulate saving
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: isEditMode ? "Service Updated" : "Service Created",
        description: isEditMode
          ? "Your service has been updated successfully."
          : "Your service has been created successfully.",
      })
      router.push("/dashboard/practitioner/services")
    }, 1000)
  }

  const CurrentStepComponent = steps[activeStep]?.component || steps[0].component

  if (isLoading && Object.keys(initialData).length === 0 && isEditMode) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ServiceFormProvider initialData={initialData} serviceId={serviceId}>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{isEditMode ? "Edit Service" : "Create New Service"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <Stepper value={activeStep} onValueChange={handleStepClick} className="w-full mb-8">
              {steps.map((step, index) => (
                <StepperItem
                  key={step.id}
                  step={index}
                  completed={completed[index]}
                  disabled={!completed[index] && index !== activeStep && index !== Object.keys(completed).length}
                  className="[&:not(:last-child)]:flex-1"
                >
                  <StepperTrigger className="flex flex-col items-center gap-1">
                    <StepperIndicator />
                    <div className="flex flex-col items-center mt-2">
                      <StepperTitle className="text-xs font-medium">{step.label}</StepperTitle>
                    </div>
                  </StepperTrigger>
                  {index < steps.length - 1 && <StepperSeparator />}
                </StepperItem>
              ))}
            </Stepper>

            <div className="mt-8">
              <CurrentStepComponent />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleBack} disabled={activeStep === 0 || isLoading} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? "Save Changes" : "Create Service"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </ServiceFormProvider>
  )
}
