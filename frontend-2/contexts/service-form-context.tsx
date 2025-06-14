"use client"

import { createContext, useState, useEffect, type ReactNode } from "react"

// Define a simple interface for the form data
interface ServiceFormData {
  serviceType: string
  title: string
  description: string
  price: number | string
  duration: number | string
  capacity: number | string
  sessionFormat: string
  sessionType: string
  deliveryMethod: string
  hasPrerequisites: boolean
  prerequisitesDescription: string
  maxParticipants: number | string
  recurringFrequency: string
  coverImage: string
  videoUrl: string
  mediaDescription: string
  practitionerBio: string
  credentials: string
  yearsOfExperience: number | string
  teachingStyle: string
  learningGoals: string[]
  locationType: string
  address: string
  city: string
  state: string
  zipCode: string
  meetingPlatform: string
  meetingLink: string
  locationNotes: string
  availabilityBlocks: Array<{
    id: string
    day: string
    startTime: string
    endTime: string
    recurring: boolean
  }>
  bufferTime: number | string
  [key: string]: any
}

// Initial state
const initialFormData: ServiceFormData = {
  serviceType: "session",
  title: "",
  description: "",
  price: "",
  duration: "60",
  capacity: 1,
  sessionFormat: "individual",
  sessionType: "single",
  deliveryMethod: "online",
  hasPrerequisites: false,
  prerequisitesDescription: "",
  maxParticipants: "",
  recurringFrequency: "",
  coverImage: "",
  videoUrl: "",
  mediaDescription: "",
  practitionerBio: "",
  credentials: "",
  yearsOfExperience: "",
  teachingStyle: "",
  learningGoals: [],
  locationType: "online",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  meetingPlatform: "",
  meetingLink: "",
  locationNotes: "",
  availabilityBlocks: [],
  bufferTime: "15",
}

// Context type
interface ServiceFormContextType {
  formState: ServiceFormData
  updateFormField: (field: keyof ServiceFormData, value: any) => void
  validateStep: (step: string) => boolean
  currentStep: number
  setCurrentStep: (step: number) => void
  isValid: boolean
  errors: Record<string, string>
}

// Create context with default values
const ServiceFormContext = createContext<ServiceFormContextType>({
  formState: initialFormData,
  updateFormField: () => {},
  validateStep: () => false,
  currentStep: 0,
  setCurrentStep: () => {},
  isValid: false,
  errors: {},
})

// Provider props
interface ServiceFormProviderProps {
  children: ReactNode
  initialData?: Partial<ServiceFormData>
  serviceId?: string
}

// Provider component
export function ServiceFormProvider({ children, initialData = {}, serviceId }: ServiceFormProviderProps) {
  const [formState, setFormState] = useState<ServiceFormData>({
    ...initialFormData,
    ...initialData,
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [isValid, setIsValid] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize with initial data
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormState((prev) => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateFormField = (field: keyof ServiceFormData, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Validation function
  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {}
    let valid = true

    switch (step) {
      case "serviceType":
        if (!formState.serviceType) {
          newErrors.serviceType = "Service type is required"
          valid = false
        }
        break

      case "basicInfo":
        if (!formState.title) {
          newErrors.title = "Title is required"
          valid = false
        }
        if (!formState.description) {
          newErrors.description = "Description is required"
          valid = false
        }
        if (!formState.price) {
          newErrors.price = "Price is required"
          valid = false
        }
        break

      case "sessionSetup":
        if (formState.sessionFormat === "group" && !formState.maxParticipants) {
          newErrors.maxParticipants = "Maximum participants is required for group sessions"
          valid = false
        }
        if (formState.sessionType === "recurring" && !formState.recurringFrequency) {
          newErrors.recurringFrequency = "Recurring frequency is required for recurring sessions"
          valid = false
        }
        if (formState.hasPrerequisites && !formState.prerequisitesDescription) {
          newErrors.prerequisitesDescription = "Prerequisites description is required"
          valid = false
        }
        break

      case "media":
        // Media is optional, but if videoUrl is provided, it should be a valid URL
        if (formState.videoUrl && !formState.videoUrl.startsWith("http")) {
          newErrors.videoUrl = "Video URL must be a valid URL"
          valid = false
        }
        break

      case "practitionerDetails":
        if (!formState.practitionerBio) {
          newErrors.practitionerBio = "Practitioner bio is required"
          valid = false
        }
        break

      case "learningGoals":
        if (formState.learningGoals.length === 0) {
          newErrors.learningGoals = "At least one learning goal is required"
          valid = false
        }
        break

      case "location":
        if (formState.locationType === "in_person" || formState.locationType === "hybrid") {
          if (!formState.address) {
            newErrors.address = "Address is required for in-person services"
            valid = false
          }
          if (!formState.city) {
            newErrors.city = "City is required for in-person services"
            valid = false
          }
          if (!formState.state) {
            newErrors.state = "State is required for in-person services"
            valid = false
          }
          if (!formState.zipCode) {
            newErrors.zipCode = "ZIP code is required for in-person services"
            valid = false
          }
        }

        if (formState.locationType === "online" || formState.locationType === "hybrid") {
          if (!formState.meetingPlatform) {
            newErrors.meetingPlatform = "Meeting platform is required for online services"
            valid = false
          }
        }
        break

      case "availability":
        if (formState.availabilityBlocks.length === 0) {
          newErrors.availabilityBlocks = "At least one availability block is required"
          valid = false
        }
        break

      default:
        valid = true
    }

    setErrors(newErrors)
    setIsValid(valid)
    return valid
  }

  return (
    <ServiceFormContext.Provider
      value={{
        formState,
        updateFormField,
        validateStep,
        currentStep,
        setCurrentStep,
        isValid,
        errors,
      }}
    >
      {children}
    </ServiceFormContext.Provider>
  )
}

export { ServiceFormContext }
