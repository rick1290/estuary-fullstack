"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ChevronLeft, Calendar, DollarSign, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { servicesCreate } from "@/src/client/sdk.gen"

interface Step3Data {
  name: string
  description: string
  service_type: string
  duration_minutes: number
  price_cents: number
  location_type: string
}

interface Step3FirstServiceProps {
  initialData?: Partial<Step3Data>
  onComplete: (data: Step3Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step3FirstService({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step3FirstServiceProps) {
  const [formData, setFormData] = useState<Step3Data>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    service_type: initialData?.service_type || "session",
    duration_minutes: initialData?.duration_minutes || 60,
    price_cents: initialData?.price_cents || 0,
    location_type: initialData?.location_type || "virtual"
  })

  const [errors, setErrors] = useState<Partial<Record<keyof Step3Data, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const priceInDollars = formData.price_cents / 100

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Step3Data, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Service name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    } else if (formData.description.length < 100) {
      newErrors.description = "Description must be at least 100 characters"
    }

    if (formData.price_cents <= 0) {
      newErrors.price_cents = "Price must be greater than $0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Convert price_cents to dollars (backend expects decimal price, not cents)
      const priceInDollars = formData.price_cents / 100

      // Map service_type code to ID
      // session=1, workshop=2, course=3, package=4, bundle=5
      const serviceTypeMap: Record<string, number> = {
        'session': 1,
        'workshop': 2,
        'course': 3,
        'package': 4,
        'bundle': 5
      }

      const { error } = await servicesCreate({
        body: {
          name: formData.name,
          description: formData.description,
          price: priceInDollars,
          service_type_id: serviceTypeMap[formData.service_type] || 1,
          duration_minutes: formData.duration_minutes,
          location_type: formData.location_type,
          is_active: false // Not active until approved
        }
      })

      if (error) {
        throw new Error('Failed to create service')
      }

      onComplete(formData)
    } catch (error: any) {
      console.error('Error creating service:', error)
      setErrors({ name: error.message || 'Failed to create service. Please try again.' })
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Create Your First Service</CardTitle>
        <CardDescription className="text-olive-600">
          What would you like to offer? You can add more services later.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-3">
            <Label>Service Type *</Label>
            <RadioGroup
              value={formData.service_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="session" id="session" />
                <Label htmlFor="session" className="cursor-pointer flex-1">
                  <div className="font-medium">1-on-1 Session</div>
                  <div className="text-xs text-olive-600">Individual appointments with clients</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="workshop" id="workshop" />
                <Label htmlFor="workshop" className="cursor-pointer flex-1">
                  <div className="font-medium">Workshop</div>
                  <div className="text-xs text-olive-600">Group events with specific dates</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="course" id="course" />
                <Label htmlFor="course" className="cursor-pointer flex-1">
                  <div className="font-medium">Course</div>
                  <div className="text-xs text-olive-600">Multi-session learning programs</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Service Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 60-Minute Mindfulness Session"
              className={cn(errors.name && "border-terracotta-500")}
            />
            {errors.name && (
              <p className="text-sm text-terracotta-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what clients can expect from this service..."
              rows={4}
              className={cn(errors.description && "border-terracotta-500")}
            />
            <div className="flex justify-between text-xs">
              {errors.description ? (
                <p className="text-terracotta-600">{errors.description}</p>
              ) : (
                <p className="text-olive-500">Minimum 100 characters</p>
              )}
              <p className={cn(
                formData.description.length < 100 && "text-terracotta-600",
                formData.description.length >= 100 && "text-sage-600"
              )}>
                {formData.description.length} characters
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sage-600" />
              Duration *
            </Label>
            <Select
              value={formData.duration_minutes.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-sage-600" />
              Price *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-600">$</span>
              <Input
                id="price"
                type="number"
                min="1"
                step="1"
                value={priceInDollars || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value) * 100) }))}
                placeholder="85"
                className={cn("pl-7", errors.price_cents && "border-terracotta-500")}
              />
            </div>
            {errors.price_cents && (
              <p className="text-sm text-terracotta-600">{errors.price_cents}</p>
            )}
          </div>

          {/* Location Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sage-600" />
              Location Type *
            </Label>
            <RadioGroup
              value={formData.location_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, location_type: value }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="virtual" id="virtual" />
                <Label htmlFor="virtual" className="cursor-pointer">Virtual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in_person" id="in_person" />
                <Label htmlFor="in_person" className="cursor-pointer">In-Person</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hybrid" id="hybrid" />
                <Label htmlFor="hybrid" className="cursor-pointer">Hybrid</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Note */}
          <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
            <p className="text-sm text-olive-700">
              Don't worry about perfection! You can edit this service or add more from your dashboard later.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-sage-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-olive-600"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Service...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
