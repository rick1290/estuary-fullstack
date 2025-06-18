"use client"

import { useState, useEffect } from "react"
import { useServiceForm } from "@/hooks/use-service-form"
import { useServiceTypes } from "@/hooks/use-service-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface ServiceTypeStepProps {
  isEditMode?: boolean
}

export function ServiceTypeStep({ isEditMode = false }: ServiceTypeStepProps) {
  const { formState, updateFormField, validateStep } = useServiceForm()
  const { data: serviceTypes, isLoading, error } = useServiceTypes()
  const [selectedType, setSelectedType] = useState(formState.serviceType || "")

  useEffect(() => {
    // Set default service type if not already set
    if (!formState.serviceType && serviceTypes && serviceTypes.length > 0) {
      const defaultType = serviceTypes[0]
      updateFormField("serviceType", defaultType.code)
      updateFormField("serviceTypeId", defaultType.id)
      setSelectedType(defaultType.code)
      validateStep("serviceType")
    }
  }, [formState.serviceType, serviceTypes, updateFormField, validateStep])

  const handleTypeChange = (value: string) => {
    const selectedServiceType = serviceTypes?.find(type => type.code === value)
    if (selectedServiceType) {
      setSelectedType(value)
      updateFormField("serviceType", value)
      updateFormField("serviceTypeId", selectedServiceType.id)
      validateStep("serviceType")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        <p>Error loading service types. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {isEditMode ? "Service Type" : "Select Service Type"}
        </h2>
        <p className="text-muted-foreground">
          {isEditMode 
            ? "Service type cannot be changed after creation. To change the type, create a new service."
            : "Choose the type of service you want to offer to your clients"
          }
        </p>
        {isEditMode && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 mt-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Note:</strong> Service type is locked after creation to maintain booking integrity.
            </p>
          </div>
        )}
      </div>

      <RadioGroup
        value={selectedType}
        onValueChange={isEditMode ? undefined : handleTypeChange}
        disabled={isEditMode}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {serviceTypes?.map((type) => (
          <div key={type.code} className="relative">
            <RadioGroupItem value={type.code} id={type.code} className="peer sr-only" />
            <Label
              htmlFor={type.code}
              className={`flex flex-col h-full p-4 border rounded-lg transition-colors ${
                isEditMode 
                  ? 'cursor-not-allowed opacity-60' 
                  : 'cursor-pointer hover:bg-muted/50'
              } peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5`}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{type.label}</CardTitle>
                    {type.code === 'bundle' && <Badge variant="secondary">Popular</Badge>}
                    {type.code === 'package' && <Badge variant="secondary">Value</Badge>}
                  </div>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    {type.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {selectedType === 'bundle' && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Bundle:</strong> You'll create a package of multiple sessions of the same service. 
            For example, "10-Class Yoga Pass" or "5-Session Massage Package".
          </p>
        </div>
      )}

      {selectedType === 'package' && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <strong>Package:</strong> Combine different services into one offering. 
            For example, "Wellness Journey" with consultation + massage + yoga sessions.
          </p>
        </div>
      )}

      {selectedType === 'workshop' && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Workshop:</strong> Create a scheduled group event with specific dates and times. 
            You'll be able to add multiple sessions if needed.
          </p>
        </div>
      )}

      {selectedType === 'course' && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <strong>Course:</strong> Design a comprehensive program with multiple sessions over time. 
            Perfect for teaching skills progressively.
          </p>
        </div>
      )}
    </div>
  )
}