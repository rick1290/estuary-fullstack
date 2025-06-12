"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function SessionSetupStep() {
  const { formState, updateFormField, validateStep } = useServiceForm()

  const handleChange = (field: string, value: any) => {
    updateFormField(field, value)
    validateStep(field)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Session Setup</h2>
        <p className="text-muted-foreground">Configure the details of your service sessions</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sessionFormat">Session Format</Label>
              <RadioGroup
                value={formState.sessionFormat || "individual"}
                onValueChange={(value) => handleChange("sessionFormat", value)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual">Individual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="group" />
                  <Label htmlFor="group">Group</Label>
                </div>
              </RadioGroup>
            </div>

            {formState.sessionFormat === "group" && (
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={formState.maxParticipants || ""}
                  onChange={(e) => handleChange("maxParticipants", e.target.value)}
                  placeholder="Enter maximum number of participants"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type</Label>
              <RadioGroup
                value={formState.sessionType || "single"}
                onValueChange={(value) => handleChange("sessionType", value)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single">Single Session</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring">Recurring Sessions</Label>
                </div>
              </RadioGroup>
            </div>

            {formState.sessionType === "recurring" && (
              <div className="space-y-2">
                <Label htmlFor="recurringFrequency">Recurring Frequency</Label>
                <Select
                  value={formState.recurringFrequency || ""}
                  onValueChange={(value) => handleChange("recurringFrequency", value)}
                >
                  <SelectTrigger id="recurringFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="deliveryMethod">Delivery Method</Label>
              <RadioGroup
                value={formState.deliveryMethod || "online"}
                onValueChange={(value) => handleChange("deliveryMethod", value)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online">Online</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inPerson" id="inPerson" />
                  <Label htmlFor="inPerson">In Person</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" id="hybrid" />
                  <Label htmlFor="hybrid">Hybrid</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="prerequisites"
                checked={formState.hasPrerequisites || false}
                onCheckedChange={(checked) => handleChange("hasPrerequisites", checked)}
              />
              <Label htmlFor="prerequisites">This service has prerequisites</Label>
            </div>

            {formState.hasPrerequisites && (
              <div className="space-y-2">
                <Label htmlFor="prerequisitesDescription">Prerequisites Description</Label>
                <Textarea
                  id="prerequisitesDescription"
                  value={formState.prerequisitesDescription || ""}
                  onChange={(e) => handleChange("prerequisitesDescription", e.target.value)}
                  placeholder="Describe any prerequisites for this service"
                  rows={3}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
