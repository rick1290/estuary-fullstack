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

    // Auto-include any in-progress entry the user typed but didn't click "Add"
    const finalCerts = [...certifications]
    if (currentCert.certificate.trim() && currentCert.institution.trim()) {
      finalCerts.push(currentCert)
    }
    const finalEdus = [...educations]
    if (currentEdu.degree.trim() && currentEdu.educational_institute.trim()) {
      finalEdus.push(currentEdu)
    }

    setIsSubmitting(true)
    setError(null)

    try {
      for (const cert of finalCerts) {
        await createCertificationMutation.mutateAsync({
          path: { id: practitionerId },
          body: cert
        })
      }

      for (const edu of finalEdus) {
        await createEducationMutation.mutateAsync({
          path: { id: practitionerId },
          body: edu
        })
      }

      onComplete({ certifications: finalCerts, educations: finalEdus })
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
    <>
    <Card className="border-0 shadow-xl pb-20">
      <CardHeader>
        <CardTitle className="text-2xl text-olive-900">Credentials & Education (Optional)</CardTitle>
        <CardDescription className="text-olive-600">
          Build trust by adding your professional credentials and education. You can skip this and add them later from your dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form id="step-4-form" onSubmit={handleSubmit} className="space-y-8">
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

        </form>
      </CardContent>
    </Card>

    {/* Fixed bottom bar — outside the Card */}
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-sage-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
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

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>

          <Button
            type="submit"
            form="step-4-form"
            disabled={isSubmitting}
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
    </div>
    </>
  )
}
