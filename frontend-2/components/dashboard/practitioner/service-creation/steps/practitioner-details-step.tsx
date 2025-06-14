"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

export function PractitionerDetailsStep() {
  const { formState, updateFormField, validateStep } = useServiceForm()

  const handleChange = (field: string, value: string) => {
    updateFormField(field, value)
    validateStep(field)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Practitioner Details</h2>
        <p className="text-muted-foreground">Share information about yourself as the service provider</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="practitionerBio">Your Bio for This Service</Label>
              <Textarea
                id="practitionerBio"
                value={formState.practitionerBio || ""}
                onChange={(e) => handleChange("practitionerBio", e.target.value)}
                placeholder="Describe your experience and qualifications relevant to this service"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials">Relevant Credentials</Label>
              <Textarea
                id="credentials"
                value={formState.credentials || ""}
                onChange={(e) => handleChange("credentials", e.target.value)}
                placeholder="List your certifications, degrees, or other qualifications"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                value={formState.yearsOfExperience || ""}
                onChange={(e) => handleChange("yearsOfExperience", e.target.value)}
                placeholder="Enter number of years"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teachingStyle">Teaching/Facilitation Style</Label>
              <Textarea
                id="teachingStyle"
                value={formState.teachingStyle || ""}
                onChange={(e) => handleChange("teachingStyle", e.target.value)}
                placeholder="Describe your approach to teaching or facilitating"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
