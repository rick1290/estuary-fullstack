"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import ServicePreview from "../service-preview"

export default function PreviewStep() {
  const { formState } = useServiceForm()

  // Ensure formState is not undefined before passing to ServicePreview
  const safeFormState = formState || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Preview Your Service</h2>
        <p className="text-muted-foreground">Review how your service will appear to potential clients</p>
      </div>

      <ServicePreview data={safeFormState} />
    </div>
  )
}
