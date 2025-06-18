"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ServiceFormProvider } from "@/contexts/service-form-context"
import { ServiceTypeStep } from "./steps/service-type-step"
import { BasicInfoStep } from "./steps/basic-info-step"
import { SessionSetupStep } from "./steps/session-setup-step"
import { WorkshopSessionsStep } from "./steps/workshop-sessions-step"
import { PackageBuilderStep } from "./steps/package-builder-step"
import { MediaStep } from "./steps/media-step"
import { ResourcesStep } from "./steps/resources-step"
import { RevenueSharingStep } from "./steps/revenue-sharing-step"
import { BenefitsStep } from "./steps/benefits-step"
import { PractitionerDetailsStep } from "./steps/practitioner-details-step"
import { LearningGoalsStep } from "./steps/learning-goals-step"
import LocationStep from "./steps/location-step"
import AvailabilityStep from "./steps/availability-step"
import PreviewStep from "./steps/preview-step"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react"
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperTitle,
  StepperTrigger,
  StepperSeparator,
} from "@/components/ui/stepper"
import { useToast } from "@/hooks/use-toast"
import { useServiceForm } from "@/hooks/use-service-form"
import { 
  servicesCreateMutation, 
  servicesUpdateMutation,
  servicesRetrieveOptions 
} from "@/src/client/@tanstack/react-query.gen"
import type { ServiceCreateUpdateRequestWritable } from "@/src/client/types.gen"

// Dynamic steps based on service type
const getStepsForServiceType = (serviceType: string) => {
  const baseSteps = [
    { id: "service-type", label: "Service Type", component: ServiceTypeStep },
    { id: "basic-info", label: "Basic Info", component: BasicInfoStep },
  ]

  // Add session setup for all types
  baseSteps.push({ id: "session-setup", label: "Details", component: SessionSetupStep })
  
  // Add workshop/course sessions scheduling
  if (serviceType === 'workshop' || serviceType === 'course') {
    baseSteps.push({ id: "sessions", label: "Sessions", component: WorkshopSessionsStep })
  }
  
  // Add package builder for packages
  if (serviceType === 'package') {
    baseSteps.push({ id: "package-builder", label: "Package Contents", component: PackageBuilderStep })
  }

  // Add media and practitioner details
  baseSteps.push(
    { id: "media", label: "Media", component: MediaStep },
    { id: "benefits", label: "Benefits", component: BenefitsStep },
    { id: "practitioner-details", label: "About You", component: PractitionerDetailsStep },
    { id: "learning-goals", label: "Learning Goals", component: LearningGoalsStep }
  )

  // Location is needed for all types
  baseSteps.push({ id: "location", label: "Location", component: LocationStep })
  
  // Resources for all types
  baseSteps.push({ id: "resources", label: "Resources", component: ResourcesStep })
  
  // Revenue sharing (optional step)
  baseSteps.push({ id: "revenue-sharing", label: "Revenue Sharing", component: RevenueSharingStep })

  // Availability only for sessions (individual appointments)
  if (serviceType === 'session') {
    baseSteps.push({ id: "availability", label: "Availability", component: AvailabilityStep })
  }

  // Always end with preview
  baseSteps.push({ id: "preview", label: "Preview", component: PreviewStep })

  return baseSteps
}

interface ServiceWizardProps {
  serviceId?: string
}

function ServiceWizardContent({ serviceId }: ServiceWizardProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState<{ [k: number]: boolean }>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { formState, validateStep, prepareForSubmission, updateMultipleFields } = useServiceForm()

  // Get dynamic steps based on service type
  const steps = getStepsForServiceType(formState.serviceType || 'session')
  const totalSteps = steps.length
  const isLastStep = activeStep === totalSteps - 1

  // Fetch service data for editing
  const { data: serviceData, isLoading: isLoadingService } = useQuery({
    ...servicesRetrieveOptions({ path: { id: parseInt(serviceId || '0') } }),
    enabled: !!serviceId,
  })

  // Create service mutation
  const createMutation = useMutation({
    ...servicesCreateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Service Created",
        description: "Your service has been created successfully.",
      })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      router.push("/dashboard/practitioner/services")
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create service. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Update service mutation
  const updateMutation = useMutation({
    ...servicesUpdateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Service Updated",
        description: "Your service has been updated successfully.",
      })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      router.push("/dashboard/practitioner/services")
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update service. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Set edit mode and initialize form with service data
  useEffect(() => {
    if (serviceId && serviceData) {
      setIsEditMode(true)
      
      // Map service type code to our expected format
      let serviceType = serviceData.service_type_code || 'session'
      if (serviceType === 'in-person_session' || serviceType === 'online_session') {
        serviceType = 'session'
      }
      
      // Populate form with service data
      updateMultipleFields({
        serviceType: serviceType,
        serviceTypeId: serviceData.service_type,
        name: serviceData.name || '',
        title: serviceData.name || '',
        description: serviceData.description || '',
        short_description: serviceData.short_description || '',
        price: serviceData.price || '',
        price_cents: serviceData.price_cents,
        duration_minutes: serviceData.duration_minutes || 60,
        max_participants: serviceData.max_participants || 1,
        min_participants: serviceData.min_participants || 1,
        experience_level: serviceData.experience_level || 'all_levels',
        location_type: serviceData.location_type || 'virtual',
        status: serviceData.status || 'draft',
        is_active: serviceData.is_active,
        is_public: serviceData.is_public,
        is_featured: serviceData.is_featured,
        category_id: serviceData.category?.id,
        what_youll_learn: serviceData.what_youll_learn || '',
        prerequisites: serviceData.prerequisites || '',
        includes: serviceData.includes || {},
        image: serviceData.image || '',
        coverImage: serviceData.image || '',
        tags: serviceData.tags || [],
        languages: serviceData.languages || [],
        available_from: serviceData.available_from,
        available_until: serviceData.available_until,
        highlight_text: serviceData.highlight_text || '',
        terms_conditions: serviceData.terms_conditions || '',
        // Bundle specific
        sessions_included: serviceData.sessions_included || 10,
        validity_days: serviceData.validity_days || 90,
        max_per_customer: serviceData.max_per_customer,
        // Sessions
        serviceSessions: serviceData.sessions || [],
        // Child services for packages
        childServiceConfigs: serviceData.child_service_configs || [],
        // Benefits - TODO: Add to backend model
        benefits: serviceData.benefits || [],
      })
      
      // Mark all steps as completed in edit mode
      const allCompleted = steps.reduce(
        (acc, _, index) => {
          acc[index] = true
          return acc
        },
        {} as { [k: number]: boolean },
      )
      setCompleted(allCompleted)
    }
  }, [serviceId, serviceData, updateMultipleFields])

  const handleNext = () => {
    // Validate current step
    const currentStepId = steps[activeStep].id
    const isStepValid = validateStep(currentStepId)

    if (!isStepValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      })
      return
    }

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

  const handleSave = async () => {
    try {
      const data = prepareForSubmission()
      
      if (isEditMode && serviceId) {
        await updateMutation.mutateAsync({
          path: { id: parseInt(serviceId) },
          body: data
        })
      } else {
        await createMutation.mutateAsync({
          body: data
        })
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
      console.error('Error saving service:', error)
    }
  }

  const CurrentStepComponent = steps[activeStep]?.component || steps[0].component

  if (isLoadingService && serviceId) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="pb-8">
        <div className="space-y-1">
          <CardTitle className="text-3xl font-bold">{isEditMode ? "Edit Service" : "Create New Service"}</CardTitle>
          <p className="text-muted-foreground">
            {isEditMode 
              ? "Update your service details and settings"
              : "Follow the steps below to create a comprehensive service listing"}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <Stepper value={activeStep} onValueChange={handleStepClick} className="w-full">
            {steps.map((step, index) => (
              <StepperItem
                key={step.id}
                step={index}
                completed={completed[index]}
                disabled={!completed[index] && index !== activeStep && index !== Object.keys(completed).length}
                className="[&:not(:last-child)]:flex-1"
              >
                <StepperTrigger className="flex flex-col items-center gap-2">
                  <StepperIndicator className="h-10 w-10" />
                  <div className="flex flex-col items-center">
                    <StepperTitle className="text-sm font-medium">{step.label}</StepperTitle>
                  </div>
                </StepperTrigger>
                {index < steps.length - 1 && <StepperSeparator />}
              </StepperItem>
            ))}
          </Stepper>

          <div className="bg-muted/30 rounded-lg p-6 md:p-8">
            <CurrentStepComponent isEditMode={isEditMode} />
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
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
  )
}

export default function ServiceWizard({ serviceId }: ServiceWizardProps) {
  const [initialData, setInitialData] = useState<any>({})

  // Fetch service data if editing
  const { data: serviceData } = useQuery({
    ...servicesRetrieveOptions({ path: { id: parseInt(serviceId || '0') } }),
    enabled: !!serviceId,
  })

  useEffect(() => {
    if (serviceData) {
      // Convert API data to form data
      setInitialData({
        serviceType: serviceData.service_type_code || 'session',
        serviceTypeId: serviceData.service_type,
        title: serviceData.name,
        name: serviceData.name,
        description: serviceData.description,
        short_description: serviceData.short_description,
        price: serviceData.price_cents ? (serviceData.price_cents / 100).toString() : '',
        duration_minutes: serviceData.duration_minutes,
        max_participants: serviceData.max_participants,
        min_participants: serviceData.min_participants,
        experience_level: serviceData.experience_level,
        location_type: serviceData.location_type,
        what_youll_learn: serviceData.what_youll_learn,
        prerequisites: serviceData.prerequisites,
        includes: serviceData.includes,
        image: serviceData.image,
        coverImage: serviceData.image,
        tags: serviceData.tags,
        languages: serviceData.languages,
        sessions_included: serviceData.sessions_included,
        validity_days: serviceData.validity_days,
        max_per_customer: serviceData.max_per_customer,
        available_from: serviceData.available_from,
        available_until: serviceData.available_until,
        highlight_text: serviceData.highlight_text,
        terms_conditions: serviceData.terms_conditions,
        status: serviceData.status,
      })
    }
  }, [serviceData])

  return (
    <ServiceFormProvider initialData={initialData} serviceId={serviceId}>
      <ServiceWizardContent serviceId={serviceId} />
    </ServiceFormProvider>
  )
}