"use client"

import { useContext } from "react"
import { ServiceFormContext } from "@/contexts/service-form-context"

export function useServiceForm() {
  const context = useContext(ServiceFormContext)

  if (!context) {
    // Return default values if context is not available
    return {
      formState: {},
      updateFormField: () => {},
      validateStep: () => true,
      isValid: true,
      currentStep: 0,
      setCurrentStep: () => {},
      errors: {},
    }
  }

  return context
}
