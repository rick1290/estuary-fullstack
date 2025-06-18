"use client"

import { createContext, useState, useEffect, type ReactNode } from "react"
import type { ServiceCreateUpdateRequestWritable, ServiceSessionRequest } from "@/src/client/types.gen"

// Extended form data that includes UI-specific fields
interface ServiceFormData extends Partial<ServiceCreateUpdateRequestWritable> {
  // Service type info
  serviceType: string
  serviceTypeId: number
  
  // Basic info (mapped to API fields)
  title: string // maps to 'name'
  
  // UI-specific fields
  sessionFormat?: string // individual/group
  sessionType?: string // single/recurring
  deliveryMethod?: string // online/in-person/hybrid
  hasPrerequisites?: boolean
  recurringFrequency?: string
  
  // Media
  coverImage?: string
  videoUrl?: string
  mediaDescription?: string
  
  // Practitioner details
  practitionerBio?: string
  credentials?: string
  yearsOfExperience?: number | string
  teachingStyle?: string
  
  // Learning goals
  learningGoals?: string[]
  
  // Location details
  locationType?: string
  meetingPlatform?: string
  meetingLink?: string
  locationNotes?: string
  
  // Availability
  availabilityBlocks?: Array<{
    id: string
    day: string
    startTime: string
    endTime: string
    recurring: boolean
  }>
  bufferTime?: number | string
  
  // Bundle/Package specific
  sessionsIncluded?: number // for bundles
  bundleValidityDays?: number // for bundles
  selectedServices?: Array<{ // for packages
    serviceId: number
    quantity: number
    discountPercentage?: number
  }>
  childServiceConfigs?: Array<{ // maps to API field
    child_service_id: number
    quantity: number
    discount_percentage?: number
  }>
  
  // Workshop/Course sessions
  serviceSessions?: ServiceSessionRequest[]
  
  // Additional fields
  tags?: string[]
  languages?: string[]
  maxPerCustomer?: number
  
  [key: string]: any
}

// Initial state
const initialFormData: ServiceFormData = {
  serviceType: "",
  serviceTypeId: 0,
  title: "",
  name: "",
  description: "",
  short_description: "",
  price: "",
  duration_minutes: 60,
  max_participants: 1,
  min_participants: 1,
  experience_level: "all_levels",
  location_type: "virtual",
  service_type_id: 0,
  status: "draft",
  hasPrerequisites: false,
  sessionsIncluded: 10,
  bundleValidityDays: 90,
  selectedServices: [],
  childServiceConfigs: [],
  serviceSessions: [],
  learningGoals: [],
  tags: [],
  languages: [],
  availabilityBlocks: [],
  bufferTime: 15,
}

// Context type
interface ServiceFormContextType {
  formState: ServiceFormData
  updateFormField: (field: keyof ServiceFormData, value: any) => void
  updateMultipleFields: (fields: Partial<ServiceFormData>) => void
  validateStep: (step: string) => boolean
  prepareForSubmission: () => ServiceCreateUpdateRequestWritable
  currentStep: number
  setCurrentStep: (step: number) => void
  isValid: boolean
  errors: Record<string, string>
}

// Create context with default values
const ServiceFormContext = createContext<ServiceFormContextType>({
  formState: initialFormData,
  updateFormField: () => {},
  updateMultipleFields: () => {},
  validateStep: () => false,
  prepareForSubmission: () => ({} as ServiceCreateUpdateRequestWritable),
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
    setFormState((prev) => {
      const updated = { ...prev, [field]: value }
      
      // Sync related fields
      if (field === 'title') {
        updated.name = value
      }
      if (field === 'serviceTypeId') {
        updated.service_type_id = value
      }
      
      return updated
    })

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const updateMultipleFields = (fields: Partial<ServiceFormData>) => {
    setFormState((prev) => ({ ...prev, ...fields }))
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
        if (formState.serviceType === 'bundle' && !formState.sessionsIncluded) {
          newErrors.sessionsIncluded = "Number of sessions is required for bundles"
          valid = false
        }
        break

      case "sessionSetup":
        if (formState.sessionFormat === "group" && !formState.max_participants) {
          newErrors.max_participants = "Maximum participants is required for group sessions"
          valid = false
        }
        if (formState.serviceType === 'workshop' || formState.serviceType === 'course') {
          if (!formState.serviceSessions || formState.serviceSessions.length === 0) {
            newErrors.serviceSessions = "At least one session is required"
            valid = false
          }
        }
        if (formState.serviceType === 'package' && (!formState.selectedServices || formState.selectedServices.length === 0)) {
          newErrors.selectedServices = "At least one service must be selected for packages"
          valid = false
        }
        break

      case "location":
        if (formState.location_type === "in_person" || formState.location_type === "hybrid") {
          if (!formState.address) {
            newErrors.address = "Address is required for in-person services"
            valid = false
          }
        }
        break

      default:
        valid = true
    }

    setErrors(newErrors)
    setIsValid(valid)
    return valid
  }

  // Prepare data for API submission
  const prepareForSubmission = (): ServiceCreateUpdateRequestWritable => {
    const baseData: ServiceCreateUpdateRequestWritable = {
      name: formState.title || formState.name || "",
      description: formState.description,
      short_description: formState.short_description,
      price: formState.price?.toString() || "0",
      duration_minutes: Number(formState.duration_minutes) || 60,
      service_type_id: formState.serviceTypeId || formState.service_type_id || 0,
      category_id: formState.category_id,
      practitioner_category_id: formState.practitioner_category_id,
      max_participants: Number(formState.max_participants) || 1,
      min_participants: Number(formState.min_participants) || 1,
      experience_level: formState.experience_level,
      age_min: formState.age_min,
      age_max: formState.age_max,
      location_type: formState.location_type,
      address: formState.address,
      what_youll_learn: formState.what_youll_learn || formState.learningGoals?.join('\n'),
      prerequisites: formState.prerequisites,
      includes: formState.includes,
      image_url: formState.image_url || formState.coverImage,
      video_url: formState.video_url || formState.videoUrl,
      tags: formState.tags,
      languages: formState.languages,
      status: formState.status,
      is_active: formState.is_active,
      is_featured: formState.is_featured,
      is_public: formState.is_public,
      validity_days: formState.validity_days || formState.bundleValidityDays,
      sessions_included: formState.sessions_included || formState.sessionsIncluded,
      max_per_customer: formState.max_per_customer || formState.maxPerCustomer,
      available_from: formState.available_from,
      available_until: formState.available_until,
      highlight_text: formState.highlight_text,
      terms_conditions: formState.terms_conditions,
      additional_practitioner_ids: formState.additional_practitioner_ids || [],
      child_service_configs: formState.childServiceConfigs || formState.selectedServices?.map(s => ({
        child_service_id: s.serviceId,
        quantity: s.quantity,
        discount_percentage: s.discountPercentage
      })) || []
    }

    return baseData
  }

  return (
    <ServiceFormContext.Provider
      value={{
        formState,
        updateFormField,
        updateMultipleFields,
        validateStep,
        prepareForSubmission,
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