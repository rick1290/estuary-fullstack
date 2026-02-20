"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronLeft, Plus, X, Award, GraduationCap } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { practitionersCertificationsCreateMutation, practitionersEducationsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Certification {
  certificate: string
  institution: string
  year_obtained?: string
}

interface Education {
  degree: string
  educational_institute: string
  year_graduated?: string
}

interface Step4Data {
  certifications: Certification[]
  educations: Education[]
}

interface Step4CredentialsProps {
  initialData?: Partial<Step4Data>
  onComplete: (data: Step4Data) => void
  onBack: () => void
  practitionerId: string | null
}

export default function Step4Credentials({
  initialData,
  onComplete,
  onBack,
  practitionerId
}: Step4CredentialsProps) {
  const [certifications, setCertifications] = useState<Certification[]>(initialData?.certifications || [])
  const [educations, setEducations] = useState<Education[]>(initialData?.educations || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current form states
  const [currentCert, setCurrentCert] = useState<Certification>({ certificate: "", institution: "", year_obtained: "" })
  const [currentEdu, setCurrentEdu] = useState<Education>({ degree: "", educational_institute: "", year_graduated: "" })

  const createCertificationMutation = useMutation({
    ...practitionersCertificationsCreateMutation()
  })

  const createEducationMutation = useMutation({
    ...practitionersEducationsCreateMutation()
  })

  const addCertification = () => {
    if (currentCert.certificate && currentCert.institution) {
      setCertifications([...certifications, currentCert])
      setCurrentCert({ certificate: "", institution: "", year_obtained: "" })
    }
  }

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index))
  }

  const addEducation = () => {
    if (currentEdu.degree && currentEdu.educational_institute) {
      setEducations([...educations, currentEdu])
      setCurrentEdu({ degree: "", educational_institute: "", year_graduated: "" })
    }
  }

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!practitionerId) {
      setError("No practitioner profile found. Please complete previous steps first.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Submit certifications
      for (const cert of certifications) {
        await createCertificationMutation.mutateAsync({
          path: { id: practitionerId },
          body: cert
        })
      }

      // Submit educations
      for (const edu of educations) {
        await createEducationMutation.mutateAsync({
          path: { id: practitionerId },
          body: edu
        })
      }

      onComplete({ certifications, educations })
    } catch (error: any) {
      console.error('Error saving credentials:', error)
      setError('Failed to save credentials. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onComplete({ certifications: [], educations: [] })
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Credentials & Education (Optional)</CardTitle>
        <CardDescription className="text-olive-600">
          Build trust by adding your professional credentials and education
        </CardDescription>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-sage-600 hover:text-sage-700 hover:underline mt-2"
        >
          Skip this step →
        </button>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Certifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-terracotta-600" />
              <h3 className="text-lg font-medium text-olive-900">Certifications</h3>
            </div>

            {/* Added Certifications */}
            {certifications.length > 0 && (
              <div className="space-y-2 mb-4">
                {certifications.map((cert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-sage-50 rounded-lg border border-sage-200">
                    <Award className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-olive-900">{cert.certificate}</p>
                      <p className="text-sm text-olive-600">{cert.institution}</p>
                      {cert.year_obtained && <p className="text-sm text-olive-500">{cert.year_obtained}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCertification(index)}
                      className="text-terracotta-600 hover:text-terracotta-700 hover:bg-terracotta-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Certification Form */}
            <div className="space-y-3 p-4 bg-white rounded-lg border border-sage-200">
              <div>
                <Label htmlFor="certificate">Certificate/License Name</Label>
                <Input
                  id="certificate"
                  value={currentCert.certificate}
                  onChange={(e) => setCurrentCert({ ...currentCert, certificate: e.target.value })}
                  placeholder="e.g., Certified Yoga Instructor (RYT-200)"
                />
              </div>
              <div>
                <Label htmlFor="cert-institution">Issuing Organization</Label>
                <Input
                  id="cert-institution"
                  value={currentCert.institution}
                  onChange={(e) => setCurrentCert({ ...currentCert, institution: e.target.value })}
                  placeholder="e.g., Yoga Alliance"
                />
              </div>
              <div>
                <Label htmlFor="cert-year">Year Obtained (Optional)</Label>
                <Input
                  id="cert-year"
                  value={currentCert.year_obtained}
                  onChange={(e) => setCurrentCert({ ...currentCert, year_obtained: e.target.value })}
                  placeholder="e.g., 2020"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addCertification}
                disabled={!currentCert.certificate || !currentCert.institution}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Certification
              </Button>
            </div>
          </div>

          {/* Education Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-terracotta-600" />
              <h3 className="text-lg font-medium text-olive-900">Education</h3>
            </div>

            {/* Added Education */}
            {educations.length > 0 && (
              <div className="space-y-2 mb-4">
                {educations.map((edu, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-sage-50 rounded-lg border border-sage-200">
                    <GraduationCap className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-olive-900">{edu.degree}</p>
                      <p className="text-sm text-olive-600">{edu.educational_institute}</p>
                      {edu.year_graduated && <p className="text-sm text-olive-500">{edu.year_graduated}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEducation(index)}
                      className="text-terracotta-600 hover:text-terracotta-700 hover:bg-terracotta-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Education Form */}
            <div className="space-y-3 p-4 bg-white rounded-lg border border-sage-200">
              <div>
                <Label htmlFor="degree">Degree/Qualification</Label>
                <Input
                  id="degree"
                  value={currentEdu.degree}
                  onChange={(e) => setCurrentEdu({ ...currentEdu, degree: e.target.value })}
                  placeholder="e.g., Bachelor of Science in Psychology"
                />
              </div>
              <div>
                <Label htmlFor="edu-institution">Institution</Label>
                <Input
                  id="edu-institution"
                  value={currentEdu.educational_institute}
                  onChange={(e) => setCurrentEdu({ ...currentEdu, educational_institute: e.target.value })}
                  placeholder="e.g., University of California"
                />
              </div>
              <div>
                <Label htmlFor="edu-year">Year Graduated (Optional)</Label>
                <Input
                  id="edu-year"
                  value={currentEdu.year_graduated}
                  onChange={(e) => setCurrentEdu({ ...currentEdu, year_graduated: e.target.value })}
                  placeholder="e.g., 2015"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addEducation}
                disabled={!currentEdu.degree || !currentEdu.educational_institute}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Education
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Skip Info */}
          <div className="p-4 bg-terracotta-50 rounded-lg border border-terracotta-200">
            <p className="text-sm text-olive-700 text-center">
              <span className="font-medium">Not ready to add credentials?</span> You can skip this step and add them later from your dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-sage-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-olive-600"
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="px-6"
              >
                Skip for Now
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || (certifications.length === 0 && educations.length === 0)}
                className="px-8 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
