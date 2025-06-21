"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Calendar, Users, Package, Clock, Target, AlertCircle } from "lucide-react"
import { useState } from "react"
import { WorkshopSessionsStep } from "./workshop-sessions-step"
import { PackageBuilderStep } from "./package-builder-step"

// Shared demographics section for all service types
function DemographicsSection() {
  const { formState, updateFormField, errors } = useServiceForm()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Demographics & Targeting
        </CardTitle>
        <CardDescription>
          Define who this service is appropriate for
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Experience Level */}
        <div className="space-y-2">
          <Label htmlFor="experience-level">Experience Level Required</Label>
          <Select
            value={formState.experience_level || "all_levels"}
            onValueChange={(value) => updateFormField("experience_level", value)}
          >
            <SelectTrigger id="experience-level" className={errors.experience_level ? "border-destructive" : ""}>
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_levels">All Levels (No experience needed)</SelectItem>
              <SelectItem value="beginner">Beginner (Some basic knowledge helpful)</SelectItem>
              <SelectItem value="intermediate">Intermediate (Moderate experience required)</SelectItem>
              <SelectItem value="advanced">Advanced (Extensive experience required)</SelectItem>
              <SelectItem value="expert">Expert (Professional level only)</SelectItem>
            </SelectContent>
          </Select>
          {errors.experience_level && <p className="text-sm text-destructive">{errors.experience_level}</p>}
        </div>

        {/* Age Restrictions */}
        <div className="space-y-4">
          <Label>Age Restrictions</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age-min" className="text-sm">Minimum Age</Label>
              <Select
                value={formState.age_min?.toString() || "none"}
                onValueChange={(value) => updateFormField("age_min", value && value !== "none" ? parseInt(value) : undefined)}
              >
                <SelectTrigger id="age-min" className={errors.age_min ? "border-destructive" : ""}>
                  <SelectValue placeholder="No minimum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No minimum age</SelectItem>
                  <SelectItem value="13">13+ (Teen-friendly)</SelectItem>
                  <SelectItem value="16">16+ (Young adult)</SelectItem>
                  <SelectItem value="18">18+ (Adult only)</SelectItem>
                  <SelectItem value="21">21+ (Mature adult)</SelectItem>
                  <SelectItem value="30">30+ (Mid-life)</SelectItem>
                  <SelectItem value="50">50+ (Senior-friendly)</SelectItem>
                  <SelectItem value="65">65+ (Senior-focused)</SelectItem>
                </SelectContent>
              </Select>
              {errors.age_min && <p className="text-sm text-destructive">{errors.age_min}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="age-max" className="text-sm">Maximum Age</Label>
              <Select
                value={formState.age_max?.toString() || "none"}
                onValueChange={(value) => updateFormField("age_max", value && value !== "none" ? parseInt(value) : undefined)}
              >
                <SelectTrigger id="age-max" className={errors.age_max ? "border-destructive" : ""}>
                  <SelectValue placeholder="No maximum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No maximum age</SelectItem>
                  <SelectItem value="25">Up to 25 (Young adult focus)</SelectItem>
                  <SelectItem value="35">Up to 35 (Early career)</SelectItem>
                  <SelectItem value="50">Up to 50 (Mid-career)</SelectItem>
                  <SelectItem value="65">Up to 65 (Pre-retirement)</SelectItem>
                  <SelectItem value="80">Up to 80 (Active senior)</SelectItem>
                </SelectContent>
              </Select>
              {errors.age_max && <p className="text-sm text-destructive">{errors.age_max}</p>}
            </div>
          </div>
          
          {formState.age_min && formState.age_max && formState.age_min >= formState.age_max && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                Maximum age must be greater than minimum age
              </p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Setting age restrictions helps ensure your service is appropriate for participants
          </p>
        </div>

        {/* Participant Limits */}
        <div className="space-y-4">
          <Label>Participant Limits</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-participants" className="text-sm">Minimum Participants</Label>
              <Input
                id="min-participants"
                type="number"
                min="1"
                value={formState.min_participants || 1}
                onChange={(e) => updateFormField("min_participants", parseInt(e.target.value) || 1)}
                className={errors.min_participants ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Minimum needed to run the service
              </p>
              {errors.min_participants && <p className="text-sm text-destructive">{errors.min_participants}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-participants" className="text-sm">Maximum Participants</Label>
              <Input
                id="max-participants"
                type="number"
                min="1"
                value={formState.max_participants || (formState.serviceType === 'session' ? 1 : 10)}
                onChange={(e) => updateFormField("max_participants", parseInt(e.target.value) || 1)}
                className={errors.max_participants ? "border-destructive" : ""}
                disabled={formState.serviceType === 'session'}
              />
              <p className="text-xs text-muted-foreground">
                {formState.serviceType === 'session' 
                  ? 'Sessions are always 1-on-1'
                  : 'Maximum people who can participate'
                }
              </p>
              {errors.max_participants && <p className="text-sm text-destructive">{errors.max_participants}</p>}
            </div>
          </div>

          {formState.min_participants && formState.max_participants && 
           formState.min_participants > formState.max_participants && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                Maximum participants must be greater than or equal to minimum participants
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Bundle-specific component
function BundleSetup() {
  const { formState, updateFormField, errors } = useServiceForm()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bundle Configuration
        </CardTitle>
        <CardDescription>
          Configure your session bundle offering with credits that can be used for multiple appointments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core Bundle Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sessionsIncluded" className="flex items-center">
              Sessions Included
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="sessionsIncluded"
              type="number"
              min="2"
              value={formState.sessionsIncluded || formState.sessions_included || 10}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0
                updateFormField("sessionsIncluded", value)
                updateFormField("sessions_included", value)
              }}
              placeholder="e.g., 10"
              className={errors.sessionsIncluded ? "border-destructive" : ""}
            />
            <p className="text-sm text-muted-foreground">
              How many sessions are included in this bundle?
            </p>
            {errors.sessionsIncluded && (
              <p className="text-sm text-destructive">{errors.sessionsIncluded}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonusSessions">Bonus Sessions</Label>
            <Input
              id="bonusSessions"
              type="number"
              min="0"
              value={formState.bonus_sessions || 0}
              onChange={(e) => updateFormField("bonus_sessions", parseInt(e.target.value) || 0)}
              placeholder="e.g., 1"
            />
            <p className="text-sm text-muted-foreground">
              Extra sessions included as a bonus (e.g., "Buy 10, Get 1 Free")
            </p>
          </div>
        </div>

        {/* Validity and Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bundleValidityDays" className="flex items-center">
              Validity Period (Days)
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={formState.bundleValidityDays?.toString() || formState.validity_days?.toString() || "90"}
              onValueChange={(value) => {
                const days = parseInt(value)
                updateFormField("bundleValidityDays", days)
                updateFormField("validity_days", days)
              }}
            >
              <SelectTrigger id="bundleValidityDays">
                <SelectValue placeholder="Select validity period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days (1 month)</SelectItem>
                <SelectItem value="60">60 days (2 months)</SelectItem>
                <SelectItem value="90">90 days (3 months)</SelectItem>
                <SelectItem value="180">180 days (6 months)</SelectItem>
                <SelectItem value="365">365 days (1 year)</SelectItem>
                <SelectItem value="730">730 days (2 years)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How long clients have to use all sessions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPerCustomer">Purchase Limit per Customer</Label>
            <Input
              id="maxPerCustomer"
              type="number"
              min="1"
              value={formState.maxPerCustomer || formState.max_per_customer || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value) || undefined
                updateFormField("maxPerCustomer", value)
                updateFormField("max_per_customer", value)
              }}
              placeholder="No limit"
            />
            <p className="text-sm text-muted-foreground">
              Maximum bundles a customer can purchase (leave empty for no limit)
            </p>
          </div>
        </div>

        {/* Transfer and Sharing Options */}
        <div className="space-y-4">
          <Label>Bundle Sharing Options</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="isTransferable" className="text-sm font-medium">
                  Transferable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customers can transfer remaining sessions to others
                </p>
              </div>
              <Switch
                id="isTransferable"
                checked={formState.is_transferable || false}
                onCheckedChange={(checked) => updateFormField("is_transferable", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="isShareable" className="text-sm font-medium">
                  Shareable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Family/friends can use sessions from the same bundle
                </p>
              </div>
              <Switch
                id="isShareable"
                checked={formState.is_shareable || false}
                onCheckedChange={(checked) => updateFormField("is_shareable", checked)}
              />
            </div>
          </div>
        </div>

        {/* Highlight Text */}
        <div className="space-y-2">
          <Label htmlFor="highlightText">Promotional Badge (Optional)</Label>
          <Input
            id="highlightText"
            value={formState.highlight_text || ''}
            onChange={(e) => updateFormField("highlight_text", e.target.value)}
            placeholder="e.g., BEST VALUE, POPULAR, SAVE 20%"
            maxLength={20}
          />
          <p className="text-sm text-muted-foreground">
            Short text to highlight this bundle (will appear as a badge)
          </p>
        </div>

        {/* Bundle Preview */}
        {formState.sessionsIncluded && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-medium text-primary mb-2">Bundle Summary</h4>
            <div className="text-sm space-y-1">
              <p>
                <strong>Total Sessions:</strong> {formState.sessionsIncluded}
                {formState.bonus_sessions > 0 && ` + ${formState.bonus_sessions} bonus`}
              </p>
              <p>
                <strong>Valid for:</strong> {formState.bundleValidityDays || formState.validity_days || 90} days
              </p>
              {formState.is_transferable && <p className="text-green-600">✓ Transferable to others</p>}
              {formState.is_shareable && <p className="text-green-600">✓ Shareable with family/friends</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
        return <PackageBuilderStep />
      case 'workshop':
      case 'course':
        return <WorkshopSessionsStep />
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

      {/* Demographics section for all service types */}
      <DemographicsSection />

      {renderServiceTypeContent()}
    </div>
  )
}

// Regular session setup for individual appointments
function RegularSessionSetup() {
  const { formState, updateFormField } = useServiceForm()

  return (
    <div className="space-y-6">
      {/* Prerequisites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Prerequisites & Requirements
          </CardTitle>
          <CardDescription>
            Let participants know what they need before joining
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  )
}