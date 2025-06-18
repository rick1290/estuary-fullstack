"use client"

import { createContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { ServiceCreateUpdateRequestWritable, ServiceSessionRequest } from "@/src/client/types.gen"

// Extended form data that includes UI-specific fields
interface ServiceFormData extends Partial<ServiceCreateUpdateRequestWritable> {
  // Service type info (IMMUTABLE after creation)
  serviceType: string
  serviceTypeId: number
  
  // Basic information
  title: string // maps to 'name'
  name: string
  description: string
  short_description: string
  price: string
  duration_minutes: number
  
  // Categorization
  category_id?: number // Global category
  practitioner_category_id?: number // Practitioner's custom category
  tags?: string[]
  
  // Participants & Demographics
  max_participants: number
  min_participants: number
  experience_level: string
  age_min?: number // NEW: Minimum age restriction
  age_max?: number // NEW: Maximum age restriction
  
  // Location & Delivery
  location_type: string
  address_id?: number // NEW: Physical address for in-person services
  locationNotes?: string
  languages?: string[]
  
  // Status & Visibility
  status: string // draft/active/inactive/archived
  is_active: boolean
  is_public: boolean
  is_featured: boolean
  
  // Content & Learning
  what_youll_learn: string
  prerequisites: string
  includes?: Record<string, any> // JSON object for what's included
  
  // Media & Presentation
  image?: string | File // New ImageField in backend
  coverImage?: string // UI preview field
  
  // Bundle/Package Specific Fields
  validity_days?: number // Days valid after purchase
  sessions_included?: number // Number of sessions (bundles)
  sessionsIncluded?: number // UI field that maps to sessions_included
  bonus_sessions?: number // NEW: Extra sessions included
  max_per_customer?: number // NEW: Purchase limit per customer
  maxPerCustomer?: number // UI field that maps to max_per_customer
  is_transferable?: boolean // NEW: Can transfer to others
  is_shareable?: boolean // NEW: Can share with family/friends
  bundleValidityDays?: number // UI field that maps to validity_days
  
  // Availability Window
  available_from?: Date // NEW: When sales start
  available_until?: Date // NEW: When sales end
  highlight_text?: string // NEW: Badge text (e.g., "BEST VALUE")
  
  // Terms & Conditions
  terms_conditions?: string // NEW: Specific terms for service
  
  // Package/Bundle Configuration
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
  
  // Workshop/Course Sessions
  serviceSessions?: ServiceSessionRequest[]
  
  // Benefits & Features (to be implemented)
  benefits?: Array<{
    id: string
    title: string
    description: string
    icon?: string
    order: number
  }>
  
  // Resources (to be implemented)
  resources?: Array<{
    id: string
    title: string
    description: string
    resource_type: string
    file_url?: string
    external_url?: string
    access_level: string
  }>
  
  // Additional Practitioners (to be implemented)
  additional_practitioner_ids?: number[]
  
  // Availability (current implementation)
  availabilityBlocks?: Array<{
    id: string
    day: string
    startTime: string
    endTime: string
    recurring: boolean
  }>
  bufferTime?: number | string
  
  // Legacy UI fields (to be cleaned up)
  sessionFormat?: string // individual/group
  sessionType?: string // single/recurring
  deliveryMethod?: string // online/in-person/hybrid
  hasPrerequisites?: boolean
  recurringFrequency?: string
  mediaDescription?: string
  practitionerBio?: string
  credentials?: string
  yearsOfExperience?: number | string
  teachingStyle?: string
  learningGoals?: string[] // Maps to what_youll_learn as array
  locationType?: string
  meetingPlatform?: string
  meetingLink?: string
  
  [key: string]: any
}

// Initial state
const initialFormData: ServiceFormData = {
  // Service type (IMMUTABLE)
  serviceType: "",
  serviceTypeId: 0,
  
  // Basic information
  title: "",
  name: "",
  description: "",
  short_description: "",
  price: "",
  duration_minutes: 60,
  
  // Categorization
  category_id: undefined,
  practitioner_category_id: undefined,
  tags: [],
  
  // Participants & Demographics
  max_participants: 1,
  min_participants: 1,
  experience_level: "all_levels",
  age_min: undefined,
  age_max: undefined,
  
  // Location & Delivery
  location_type: "virtual",
  address_id: undefined,
  languages: [],
  
  // Status & Visibility
  status: "draft",
  is_active: true,
  is_public: true,
  is_featured: false,
  
  // Content & Learning
  what_youll_learn: "",
  prerequisites: "",
  includes: {},
  
  // Media & Presentation
  image: "",
  coverImage: "",
  
  // Bundle/Package Specific
  validity_days: 90,
  sessions_included: 10,
  sessionsIncluded: 10,
  bonus_sessions: 0,
  max_per_customer: undefined,
  maxPerCustomer: undefined,
  is_transferable: false,
  is_shareable: false,
  bundleValidityDays: 90,
  
  // Availability Window
  available_from: undefined,
  available_until: undefined,
  highlight_text: "",
  
  // Terms & Conditions
  terms_conditions: "",
  
  // Configuration
  selectedServices: [],
  childServiceConfigs: [],
  serviceSessions: [],
  benefits: [],
  resources: [],
  additional_practitioner_ids: [],
  
  // Availability
  availabilityBlocks: [],
  bufferTime: 15,
  
  // Legacy fields (to be cleaned up)
  service_type_id: 0,
  hasPrerequisites: false,
  learningGoals: [],
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

  const updateMultipleFields = useCallback((fields: Partial<ServiceFormData>) => {
    setFormState((prev) => ({ ...prev, ...fields }))
  }, [])

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
        if (!formState.duration_minutes) {
          newErrors.duration_minutes = "Duration is required"
          valid = false
        }
        if (formState.serviceType === 'bundle' && !formState.sessionsIncluded) {
          newErrors.sessionsIncluded = "Number of sessions is required for bundles"
          valid = false
        }
        break

      case "sessionSetup":
        // Validate demographic fields
        if (!formState.experience_level) {
          newErrors.experience_level = "Experience level is required"
          valid = false
        }
        if (formState.age_min && formState.age_max && formState.age_min >= formState.age_max) {
          newErrors.age_max = "Maximum age must be greater than minimum age"
          valid = false
        }
        if (!formState.max_participants || formState.max_participants < 1) {
          newErrors.max_participants = "Maximum participants is required"
          valid = false
        }
        if (!formState.min_participants || formState.min_participants < 1) {
          newErrors.min_participants = "Minimum participants is required"
          valid = false
        }
        if (formState.min_participants && formState.max_participants && formState.min_participants > formState.max_participants) {
          newErrors.min_participants = "Minimum participants cannot exceed maximum participants"
          valid = false
        }
        
        // Service type specific validations
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
        if (formState.serviceType === 'bundle' && (!formState.sessionsIncluded || formState.sessionsIncluded < 2)) {
          newErrors.sessionsIncluded = "Bundle must include at least 2 sessions"
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
    const baseData: any = {
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

    // Only include image if it's a File object or a valid URL
    if (formState.image instanceof File) {
      baseData.image = formState.image
    } else if (formState.image && typeof formState.image === 'string' && formState.image.startsWith('http')) {
      // Keep existing image URL for updates
      baseData.image = formState.image
    } else if (formState.coverImage && typeof formState.coverImage === 'string' && formState.coverImage.startsWith('http')) {
      // Keep existing cover image URL for updates
      baseData.image = formState.coverImage
    }
    // Otherwise, don't include the image field at all

    return baseData as ServiceCreateUpdateRequestWritable
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