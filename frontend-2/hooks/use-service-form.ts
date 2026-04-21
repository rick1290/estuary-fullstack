"use client"

import { useContext } from "react"
import { ServiceFormContext } from "@/contexts/service-form-context"

export function useServiceForm() {
  return useContext(ServiceFormContext)
}
