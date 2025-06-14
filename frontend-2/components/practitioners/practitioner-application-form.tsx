"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Upload, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data for form options
const SPECIALIZATIONS = [
  "Meditation",
  "Yoga",
  "Nutrition",
  "Life Coaching",
  "Fitness",
  "Therapy",
  "Mindfulness",
  "Spiritual Guidance",
  "Energy Healing",
  "Breathwork",
]

const SERVICE_TYPES = ["One-on-One Sessions", "Group Workshops", "Courses", "Packages", "Events", "Retreats"]

const EXPERIENCE_LEVELS = ["Less than 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"]

interface PractitionerApplicationFormProps {
  isOnboarding?: boolean
  selectedTier?: string
}

export default function PractitionerApplicationForm({
  isOnboarding = false,
  selectedTier = "flow",
}: PractitionerApplicationFormProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    professionalTitle: "",
    bio: "",
    specializations: [] as string[],
    serviceTypes: [] as string[],
    experienceLevel: "",
    hasInsurance: "",
    website: "",
    socialMedia: "",
    referralSource: "",
    certifications: "",
    additionalInfo: "",
    agreeToTerms: false,
    tier: selectedTier,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Update tier if it changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, tier: selectedTier }))
  }, [selectedTier])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreeToTerms: checked }))
  }

  const handleRadioChange = (value: string) => {
    setFormData((prev) => ({ ...prev, hasInsurance: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMultiSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const currentValues = prev[name as keyof typeof prev] as string[]
      if (Array.isArray(currentValues)) {
        if (currentValues.includes(value)) {
          return { ...prev, [name]: currentValues.filter((item) => item !== value) }
        } else {
          return { ...prev, [name]: [...currentValues, value] }
        }
      }
      return prev
    })
  }

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate personal information
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        setError("Please fill in all required fields")
        return
      }
      setError(null)
    } else if (activeStep === 1) {
      // Validate professional information
      if (!formData.professionalTitle || !formData.bio || formData.specializations.length === 0) {
        setError("Please fill in all required fields")
        return
      }
      setError(null)
    } else if (activeStep === 2) {
      // Validate additional information
      if (formData.hasInsurance === "" || !formData.agreeToTerms) {
        setError(formData.agreeToTerms ? "Please indicate if you have insurance" : "Please agree to the terms")
        return
      }
      setError(null)
    }

    if (activeStep === 2) {
      // Submit form
      handleSubmit()
    } else {
      setActiveStep((prevStep) => prevStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
    setError(null)
  }

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log("Form submitted:", formData)
    setSuccess(true)
  }

  const steps = ["Personal Information", "Professional Details", "Additional Information"]

  return (
    <div className="w-full">
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                activeStep >= index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </div>
            <span className={cn("text-sm", activeStep >= index ? "text-foreground" : "text-muted-foreground")}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success ? (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <Check className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Your application has been submitted successfully! We'll review your information and get back to you within
            3-5 business days.
          </AlertDescription>
        </Alert>
      ) : (
        <form className="space-y-6">
          {activeStep === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website (if applicable)</Label>
                <Input id="website" name="website" value={formData.website} onChange={handleChange} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="socialMedia">Social Media Profiles (if applicable)</Label>
                <Input id="socialMedia" name="socialMedia" value={formData.socialMedia} onChange={handleChange} />
                <p className="text-sm text-muted-foreground">
                  Please provide links to your professional social media profiles
                </p>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="professionalTitle">Professional Title *</Label>
                <Input
                  id="professionalTitle"
                  name="professionalTitle"
                  value={formData.professionalTitle}
                  onChange={handleChange}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  E.g., Certified Yoga Instructor, Nutritional Therapist, Life Coach
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Professional Bio *</Label>
                <Textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} rows={4} required />
                <p className="text-sm text-muted-foreground">
                  Tell us about your background, approach, and what clients can expect from working with you
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Specializations *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SPECIALIZATIONS.map((specialization) => (
                    <Badge
                      key={specialization}
                      variant={formData.specializations.includes(specialization) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleMultiSelectChange("specializations", specialization)}
                    >
                      {specialization}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Service Types *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SERVICE_TYPES.map((serviceType) => (
                    <Badge
                      key={serviceType}
                      variant={formData.serviceTypes.includes(serviceType) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleMultiSelectChange("serviceTypes", serviceType)}
                    >
                      {serviceType}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">What types of services do you plan to offer?</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="experienceLevel">Experience Level *</Label>
                <Select
                  onValueChange={(value) => handleSelectChange("experienceLevel", value)}
                  value={formData.experienceLevel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="certifications">Certifications & Credentials</Label>
                <Textarea
                  id="certifications"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  List your relevant certifications, degrees, and credentials
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="border border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                  <Button variant="outline" className="mb-4" type="button">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Certification Documents
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Upload copies of your certifications, insurance, and other relevant documents (PDF, JPG, PNG)
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <Label>Do you have professional liability insurance? *</Label>
                <RadioGroup value={formData.hasInsurance} onValueChange={handleRadioChange} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="insurance-yes" />
                    <Label htmlFor="insurance-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="insurance-no" />
                    <Label htmlFor="insurance-no">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not-sure" id="insurance-not-sure" />
                    <Label htmlFor="insurance-not-sure">Not Sure</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralSource">How did you hear about us?</Label>
                <Input
                  id="referralSource"
                  name="referralSource"
                  value={formData.referralSource}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Any other information you'd like to share about your practice or experience"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox id="agreeToTerms" checked={formData.agreeToTerms} onCheckedChange={handleCheckboxChange} />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="agreeToTerms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the <span className="text-primary cursor-pointer">Terms of Service</span> and{" "}
                    <span className="text-primary cursor-pointer">Privacy Policy</span>
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button type="button" variant="outline" onClick={handleBack} disabled={activeStep === 0}>
              Back
            </Button>
            <Button type="button" onClick={handleNext}>
              {activeStep === 2 ? "Submit Application" : "Next"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
