"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Calendar, Users, Package, Clock } from "lucide-react"
import { useState } from "react"

// Bundle-specific component
function BundleSetup() {
  const { formState, updateFormField, errors } = useServiceForm()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sessionsIncluded">Number of Sessions Included</Label>
          <Input
            id="sessionsIncluded"
            type="number"
            min="2"
            value={formState.sessionsIncluded || 10}
            onChange={(e) => updateFormField("sessionsIncluded", parseInt(e.target.value) || 0)}
            placeholder="e.g., 10"
          />
          <p className="text-sm text-muted-foreground">
            How many sessions are included in this bundle?
          </p>
          {errors.sessionsIncluded && (
            <p className="text-sm text-destructive">{errors.sessionsIncluded}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bundleValidityDays">Validity Period (Days)</Label>
          <Input
            id="bundleValidityDays"
            type="number"
            min="1"
            value={formState.bundleValidityDays || 90}
            onChange={(e) => updateFormField("bundleValidityDays", parseInt(e.target.value) || 0)}
            placeholder="e.g., 90"
          />
          <p className="text-sm text-muted-foreground">
            How many days do clients have to use all sessions?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxPerCustomer">Maximum Bundles Per Customer</Label>
        <Input
          id="maxPerCustomer"
          type="number"
          min="1"
          value={formState.maxPerCustomer || ''}
          onChange={(e) => updateFormField("maxPerCustomer", parseInt(e.target.value) || null)}
          placeholder="No limit"
        />
        <p className="text-sm text-muted-foreground">
          Leave empty for no limit on how many bundles a customer can purchase
        </p>
      </div>
    </div>
  )
}

// Package-specific component
function PackageSetup() {
  const { formState, updateFormField, errors } = useServiceForm()
  const [newService, setNewService] = useState({ serviceId: '', quantity: 1, discountPercentage: 0 })

  const handleAddService = () => {
    if (newService.serviceId) {
      const currentServices = formState.selectedServices || []
      updateFormField("selectedServices", [
        ...currentServices,
        {
          serviceId: parseInt(newService.serviceId),
          quantity: newService.quantity,
          discountPercentage: newService.discountPercentage
        }
      ])
      setNewService({ serviceId: '', quantity: 1, discountPercentage: 0 })
    }
  }

  const handleRemoveService = (index: number) => {
    const currentServices = formState.selectedServices || []
    updateFormField("selectedServices", currentServices.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Package Contents</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add the services that will be included in this package
        </p>

        {errors.selectedServices && (
          <p className="text-sm text-destructive mb-2">{errors.selectedServices}</p>
        )}

        {/* Service list */}
        {formState.selectedServices && formState.selectedServices.length > 0 && (
          <div className="space-y-2 mb-4">
            {formState.selectedServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">Service ID: {service.serviceId}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    Qty: {service.quantity}
                    {service.discountPercentage > 0 && ` | ${service.discountPercentage}% off`}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveService(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add service form */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Input
                  placeholder="Service ID"
                  value={newService.serviceId}
                  onChange={(e) => setNewService({ ...newService, serviceId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newService.quantity}
                  onChange={(e) => setNewService({ ...newService, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newService.discountPercentage}
                  onChange={(e) => setNewService({ ...newService, discountPercentage: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddService}
              disabled={!newService.serviceId}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service to Package
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Workshop/Course sessions component
function SessionScheduleSetup() {
  const { formState, updateFormField, errors } = useServiceForm()
  const [sessions, setSessions] = useState(formState.serviceSessions || [])

  const addSession = () => {
    const newSession = {
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      duration: formState.duration_minutes || 60,
      max_participants: formState.max_participants || 10,
      sequence_number: sessions.length + 1,
    }
    const updatedSessions = [...sessions, newSession]
    setSessions(updatedSessions)
    updateFormField("serviceSessions", updatedSessions)
  }

  const updateSession = (index: number, field: string, value: any) => {
    const updatedSessions = [...sessions]
    updatedSessions[index] = { ...updatedSessions[index], [field]: value }
    setSessions(updatedSessions)
    updateFormField("serviceSessions", updatedSessions)
  }

  const removeSession = (index: number) => {
    const updatedSessions = sessions.filter((_, i) => i !== index)
    // Resequence remaining sessions
    updatedSessions.forEach((session, i) => {
      session.sequence_number = i + 1
    })
    setSessions(updatedSessions)
    updateFormField("serviceSessions", updatedSessions)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Session Schedule</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add the individual sessions for your {formState.serviceType}
        </p>

        {errors.serviceSessions && (
          <p className="text-sm text-destructive mb-2">{errors.serviceSessions}</p>
        )}

        {sessions.length > 0 && (
          <div className="space-y-4 mb-4">
            {sessions.map((session, index) => (
              <Card key={index}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Session {session.sequence_number}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSession(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Session Title</Label>
                    <Input
                      value={session.title || ''}
                      onChange={(e) => updateSession(index, 'title', e.target.value)}
                      placeholder="e.g., Introduction to Meditation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={session.description || ''}
                      onChange={(e) => updateSession(index, 'description', e.target.value)}
                      placeholder="What will be covered in this session?"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={session.start_time || ''}
                        onChange={(e) => updateSession(index, 'start_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        min="15"
                        value={session.duration || formState.duration_minutes}
                        onChange={(e) => updateSession(index, 'duration', parseInt(e.target.value) || 60)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button type="button" onClick={addSession} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Session
        </Button>
      </div>
    </div>
  )
}

export function SessionSetupStep() {
  const { formState, updateFormField } = useServiceForm()

  // Different content based on service type
  const renderServiceTypeContent = () => {
    switch (formState.serviceType) {
      case 'bundle':
        return <BundleSetup />
      case 'package':
        return <PackageSetup />
      case 'workshop':
      case 'course':
        return <SessionScheduleSetup />
      default:
        // Regular session setup
        return <RegularSessionSetup />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {formState.serviceType === 'bundle' ? 'Bundle Details' :
           formState.serviceType === 'package' ? 'Package Contents' :
           formState.serviceType === 'workshop' || formState.serviceType === 'course' ? 'Session Schedule' :
           'Session Details'}
        </h2>
        <p className="text-muted-foreground">
          {formState.serviceType === 'bundle' ? 'Configure your session bundle offering' :
           formState.serviceType === 'package' ? 'Select services to include in this package' :
           formState.serviceType === 'workshop' || formState.serviceType === 'course' ? 'Set up the schedule for your sessions' :
           'Configure how your sessions will be delivered'}
        </p>
      </div>

      {renderServiceTypeContent()}
    </div>
  )
}

// Regular session setup for individual appointments
function RegularSessionSetup() {
  const { formState, updateFormField } = useServiceForm()

  return (
    <div className="space-y-6">
      {/* Session Format */}
      <div className="space-y-4">
        <Label>Session Format</Label>
        <RadioGroup
          value={formState.sessionFormat || "individual"}
          onValueChange={(value) => updateFormField("sessionFormat", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="individual" id="individual" />
            <Label htmlFor="individual" className="font-normal cursor-pointer">
              Individual (One-on-one)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="group" id="group" />
            <Label htmlFor="group" className="font-normal cursor-pointer">
              Group Session
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Max participants for group sessions */}
      {formState.sessionFormat === "group" && (
        <div className="space-y-2">
          <Label htmlFor="maxParticipants">Maximum Participants</Label>
          <Input
            id="maxParticipants"
            type="number"
            min="2"
            value={formState.max_participants || ''}
            onChange={(e) => updateFormField("max_participants", parseInt(e.target.value) || 0)}
            placeholder="e.g., 10"
          />
          <p className="text-sm text-muted-foreground">
            The maximum number of people who can join this group session
          </p>
        </div>
      )}

      {/* Session Type */}
      <div className="space-y-4">
        <Label>Session Type</Label>
        <RadioGroup
          value={formState.sessionType || "single"}
          onValueChange={(value) => updateFormField("sessionType", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="font-normal cursor-pointer">
              Single Session
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="recurring" id="recurring" />
            <Label htmlFor="recurring" className="font-normal cursor-pointer">
              Recurring Sessions
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Delivery Method */}
      <div className="space-y-4">
        <Label>Delivery Method</Label>
        <RadioGroup
          value={formState.deliveryMethod || formState.location_type || "online"}
          onValueChange={(value) => {
            updateFormField("deliveryMethod", value)
            updateFormField("location_type", value === "online" ? "virtual" : value === "hybrid" ? "hybrid" : "in_person")
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="online" id="online" />
            <Label htmlFor="online" className="font-normal cursor-pointer">
              Online/Virtual
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in-person" id="in-person" />
            <Label htmlFor="in-person" className="font-normal cursor-pointer">
              In-Person
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hybrid" id="hybrid" />
            <Label htmlFor="hybrid" className="font-normal cursor-pointer">
              Hybrid (Both Online & In-Person)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Prerequisites */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="hasPrerequisites">Prerequisites Required</Label>
          <Switch
            id="hasPrerequisites"
            checked={formState.hasPrerequisites || false}
            onCheckedChange={(checked) => updateFormField("hasPrerequisites", checked)}
          />
        </div>
        {formState.hasPrerequisites && (
          <div className="space-y-2">
            <Label htmlFor="prerequisitesDescription">Describe Prerequisites</Label>
            <Textarea
              id="prerequisitesDescription"
              value={formState.prerequisitesDescription || formState.prerequisites || ''}
              onChange={(e) => {
                updateFormField("prerequisitesDescription", e.target.value)
                updateFormField("prerequisites", e.target.value)
              }}
              placeholder="What should participants know or have before joining?"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  )
}