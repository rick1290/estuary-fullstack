"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Upload, Loader2, User, Briefcase, FileText, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { practitionersApplyCreate } from "@/src/client/sdk.gen"

interface Step1Data {
  display_name: string
  professional_title: string
  bio: string
  years_of_experience: number
  profile_image_url?: string
}

interface Step1BasicProfileProps {
  initialData?: Partial<Step1Data>
  onComplete: (data: Step1Data) => void
  onBack: () => void
  practitionerId: string | null
  setPractitionerId: (id: string) => void
}

const EXAMPLE_BIOS = [
  "With 15 years of experience in holistic wellness, I specialize in helping clients achieve balance through mindful practices and personalized care.",
  "Licensed therapist passionate about guiding individuals through their healing journey. I combine evidence-based techniques with compassionate support.",
  "Certified yoga instructor dedicated to creating inclusive, transformative experiences for practitioners of all levels."
]

export default function Step1BasicProfile({
  initialData,
  onComplete,
  onBack,
  practitionerId,
  setPractitionerId
}: Step1BasicProfileProps) {
  const [formData, setFormData] = useState<Step1Data>({
    display_name: initialData?.display_name || "",
    professional_title: initialData?.professional_title || "",
    bio: initialData?.bio || "",
    years_of_experience: initialData?.years_of_experience || 0,
    profile_image_url: initialData?.profile_image_url || ""
  })

  const [errors, setErrors] = useState<Partial<Record<keyof Step1Data, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const bioLength = formData.bio.length
  const bioMin = 150
  const bioMax = 2000

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Step1Data, string>> = {}

    if (!formData.display_name.trim()) {
      newErrors.display_name = "Display name is required"
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = "Display name must be at least 2 characters"
    }

    if (!formData.professional_title.trim()) {
      newErrors.professional_title = "Professional title is required"
    }

    if (!formData.bio.trim()) {
      newErrors.bio = "Bio is required"
    } else if (formData.bio.length < bioMin) {
      newErrors.bio = `Bio must be at least ${bioMin} characters`
    } else if (formData.bio.length > bioMax) {
      newErrors.bio = `Bio must not exceed ${bioMax} characters`
    }

    if (!formData.years_of_experience || formData.years_of_experience < 0) {
      newErrors.years_of_experience = "Please enter valid years of experience"
    } else if (formData.years_of_experience > 100) {
      newErrors.years_of_experience = "Please enter a realistic number of years"
    }

    if (!formData.profile_image_url) {
      newErrors.profile_image_url = "Profile photo is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profile_image_url: "Please upload an image file" }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, profile_image_url: "Image must be less than 5MB" }))
      return
    }

    setUploadingImage(true)
    setErrors(prev => ({ ...prev, profile_image_url: undefined }))

    try {
      // TODO: Implement actual image upload to Cloudflare R2
      // For now, create a local preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({ ...prev, profile_image_url: previewUrl }))

      // In production, you would upload to your API:
      // const formData = new FormData()
      // formData.append('file', file)
      // const response = await fetch('/api/v1/media/upload/', {
      //   method: 'POST',
      //   body: formData,
      //   credentials: 'include'
      // })
      // const data = await response.json()
      // setFormData(prev => ({ ...prev, profile_image_url: data.url }))
    } catch (error) {
      console.error('Error uploading image:', error)
      setErrors(prev => ({ ...prev, profile_image_url: "Failed to upload image" }))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Create practitioner profile via SDK
      const { data, error } = await practitionersApplyCreate({
        body: formData
      })

      if (error) {
        // Handle field-specific errors
        if (error.errors) {
          const newErrors: any = {}
          Object.keys(error.errors).forEach(field => {
            if (error.errors[field] && Array.isArray(error.errors[field])) {
              newErrors[field] = error.errors[field][0]
            }
          })
          setErrors(newErrors)
        } else {
          throw new Error(error.message || 'Failed to create profile')
        }
        setIsSubmitting(false)
        return
      }

      if (data) {
        setPractitionerId(data.id)
        // Move to next step
        onComplete(formData)
      }
    } catch (error: any) {
      console.error('Error creating practitioner profile:', error)
      setErrors({ display_name: error.message || 'Failed to create profile. Please try again.' })
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Tell Us About Yourself</CardTitle>
        <CardDescription className="text-olive-600">
          Let's start with the basics of your professional profile
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-sage-600" />
              Professional Display Name *
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="e.g., Dr. Sarah Chen or Sarah Chen, LMFT"
              className={cn(errors.display_name && "border-terracotta-500 focus-visible:ring-terracotta-500")}
            />
            {errors.display_name && (
              <p className="text-sm text-terracotta-600">{errors.display_name}</p>
            )}
            <p className="text-xs text-olive-500">This is how clients will see your name</p>
          </div>

          {/* Professional Title */}
          <div className="space-y-2">
            <Label htmlFor="professional_title" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-sage-600" />
              Professional Title *
            </Label>
            <Input
              id="professional_title"
              value={formData.professional_title}
              onChange={(e) => setFormData(prev => ({ ...prev, professional_title: e.target.value }))}
              placeholder="e.g., Licensed Marriage & Family Therapist"
              className={cn(errors.professional_title && "border-terracotta-500 focus-visible:ring-terracotta-500")}
            />
            {errors.professional_title && (
              <p className="text-sm text-terracotta-600">{errors.professional_title}</p>
            )}
            <p className="text-xs text-olive-500">Your credentials or designation</p>
          </div>

          {/* Years of Experience */}
          <div className="space-y-2">
            <Label htmlFor="years_of_experience" className="flex items-center gap-2">
              <Award className="h-4 w-4 text-sage-600" />
              Years of Experience *
            </Label>
            <Input
              id="years_of_experience"
              type="number"
              min="0"
              max="100"
              value={formData.years_of_experience || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, years_of_experience: parseInt(e.target.value) || 0 }))}
              placeholder="15"
              className={cn(errors.years_of_experience && "border-terracotta-500 focus-visible:ring-terracotta-500")}
            />
            {errors.years_of_experience && (
              <p className="text-sm text-terracotta-600">{errors.years_of_experience}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sage-600" />
                Professional Bio *
              </Label>
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="text-xs text-sage-600 hover:text-sage-700 hover:underline"
              >
                {showExamples ? "Hide examples" : "See examples"}
              </button>
            </div>

            {showExamples && (
              <div className="space-y-2 p-4 bg-sage-50 rounded-lg border border-sage-200">
                <p className="text-xs font-medium text-olive-700 mb-2">Example bios:</p>
                {EXAMPLE_BIOS.map((example, idx) => (
                  <p key={idx} className="text-xs text-olive-600 italic">"{example}"</p>
                ))}
              </div>
            )}

            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Share your story, expertise, and what makes you unique..."
              rows={6}
              className={cn(errors.bio && "border-terracotta-500 focus-visible:ring-terracotta-500")}
            />
            <div className="flex items-center justify-between text-xs">
              <div>
                {errors.bio && (
                  <p className="text-terracotta-600">{errors.bio}</p>
                )}
              </div>
              <p className={cn(
                "font-medium",
                bioLength < bioMin && "text-terracotta-600",
                bioLength >= bioMin && bioLength <= bioMax && "text-sage-600",
                bioLength > bioMax && "text-terracotta-600"
              )}>
                {bioLength} / {bioMax} characters
                {bioLength < bioMin && ` (${bioMin - bioLength} more needed)`}
              </p>
            </div>
          </div>

          {/* Profile Photo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-sage-600" />
              Profile Photo *
            </Label>
            <div className="flex items-start gap-4">
              {formData.profile_image_url ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-sage-200">
                  <img
                    src={formData.profile_image_url}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, profile_image_url: "" }))}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm"
                  >
                    <span className="text-xs px-2">Change</span>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="profile_image"
                  className={cn(
                    "w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-sage-400 transition-colors",
                    errors.profile_image_url ? "border-terracotta-300 bg-terracotta-50" : "border-sage-300 bg-sage-50"
                  )}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 text-sage-600 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-sage-600 mb-2" />
                      <span className="text-xs text-olive-600">Upload Photo</span>
                    </>
                  )}
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-olive-700 mb-1">Professional headshot recommended</p>
                <p className="text-xs text-olive-500 mb-2">JPG, PNG or GIF. Max 5MB.</p>
                {errors.profile_image_url && (
                  <p className="text-sm text-terracotta-600">{errors.profile_image_url}</p>
                )}
              </div>
            </div>
            <input
              id="profile_image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-sage-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-olive-600"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Continue to Next Step"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
