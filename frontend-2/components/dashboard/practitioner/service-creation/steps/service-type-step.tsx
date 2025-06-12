"use client"

import { useState, useEffect } from "react"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Define service type config directly in this file to avoid import issues
const serviceTypeConfig = {
  session: {
    label: "One-on-One Session",
    shortDescription: "Individual sessions with clients",
    features: ["Personalized attention", "Flexible scheduling", "Direct client interaction"],
  },
  course: {
    label: "Course",
    shortDescription: "Multi-session educational content",
    features: ["Structured curriculum", "Multiple sessions", "Group learning environment"],
  },
  workshop: {
    label: "Workshop",
    shortDescription: "Interactive group learning experience",
    features: ["Hands-on activities", "Collaborative learning", "Limited time offering"],
  },
  package: {
    label: "Package",
    shortDescription: "Bundle of services at a special rate",
    features: ["Multiple sessions", "Discounted pricing", "Comprehensive experience"],
  },
}

export function ServiceTypeStep() {
  const { formState, updateFormField, validateStep } = useServiceForm()
  const [selectedType, setSelectedType] = useState(formState.serviceType || "session")

  useEffect(() => {
    // Set default service type if not already set
    if (!formState.serviceType) {
      updateFormField("serviceType", "session")
      validateStep("serviceType")
    }
  }, [formState.serviceType, updateFormField, validateStep])

  const handleTypeChange = (value: string) => {
    setSelectedType(value)
    updateFormField("serviceType", value)
    validateStep("serviceType")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Select Service Type</h2>
        <p className="text-muted-foreground">Choose the type of service you want to offer to your clients</p>
      </div>

      <RadioGroup
        value={selectedType}
        onValueChange={handleTypeChange}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {Object.entries(serviceTypeConfig).map(([type, config]) => (
          <div key={type} className="relative">
            <RadioGroupItem value={type} id={type} className="peer sr-only" />
            <Label
              htmlFor={type}
              className="flex flex-col h-full p-4 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-lg">{config.label}</CardTitle>
                  <CardDescription>{config.shortDescription}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    {config.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
