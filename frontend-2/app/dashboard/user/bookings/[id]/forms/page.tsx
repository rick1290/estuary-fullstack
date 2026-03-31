"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Upload,
  Pencil,
  Eye,
} from "lucide-react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import Link from "next/link"

// ----- Types -----

interface ConsentForm {
  id: string
  title: string
  legal_text: string
  is_signed: boolean
  signed_at?: string
  signer_name?: string
  consent_document_id?: number | string
}

interface QuestionOption {
  id: string
  label: string
  value: string
}

interface IntakeQuestion {
  id: string
  question_text: string
  question_type:
    | "short_text"
    | "long_text"
    | "single_choice"
    | "multiple_choice"
    | "yes_no"
    | "scale"
    | "date"
    | "file_upload"
  is_required: boolean
  options?: QuestionOption[]
  scale_min?: number
  scale_max?: number
  previous_response?: string | string[] | number
}

interface IntakeCompletedResponse {
  responses: Record<string, any>
  submitted_at?: string
}

interface BookingFormsData {
  consent_form?: ConsentForm
  intake_questions: IntakeQuestion[]
  intake_template_id?: number | string
  intake_completed_response?: IntakeCompletedResponse
  booking_id: string
  service_name?: string
  practitioner_name?: string
}

// ----- Helpers -----

// ----- Component -----

export default function BookingFormsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formsData, setFormsData] = useState<BookingFormsData | null>(null)

  // Consent state
  const [consentAgreed, setConsentAgreed] = useState(false)
  const [signerName, setSignerName] = useState("")
  const [consentSigned, setConsentSigned] = useState(false)
  const [isSigningConsent, setIsSigningConsent] = useState(false)

  // Intake state
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false)
  const [intakeSubmitted, setIntakeSubmitted] = useState(false)
  const [isEditingIntake, setIsEditingIntake] = useState(false)

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  // ----- Fetch forms -----

  const fetchForms = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { intakeBookingsFormsRetrieve } = await import("@/src/client/sdk.gen")
      const apiRes = await intakeBookingsFormsRetrieve({
        path: { booking_uuid: id },
      })
      const raw = apiRes.data as any
      if (!raw) {
        throw new Error("Failed to load forms")
      }
      // Handle wrapped response
      const apiData = raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw

      // Transform API response (forms array) into the shape the page expects
      let data: BookingFormsData
      if (apiData.forms && Array.isArray(apiData.forms)) {
        // New API format: { has_forms, forms: [...] }
        let consentForm: ConsentForm | undefined
        const intakeQuestions: IntakeQuestion[] = []
        let intakeTemplateId: number | string | undefined
        let intakeCompletedResponse: IntakeCompletedResponse | undefined

        for (const f of apiData.forms) {
          const tpl = f.template || {}
          if (tpl.form_type === 'consent') {
            consentForm = {
              id: tpl.id?.toString() || '',
              title: tpl.title || 'Consent Form',
              legal_text: tpl.latest_consent?.legal_text || tpl.description || '',
              is_signed: f.signed || false,
              signer_name: f.signature?.signer_name || '',
              consent_document_id: tpl.latest_consent?.id,
            }
          } else if (tpl.form_type === 'intake' && tpl.questions) {
            // Capture the template ID for submission
            intakeTemplateId = tpl.id

            // Capture completed response data if form was already submitted
            if (f.completed && f.response) {
              intakeCompletedResponse = {
                responses: f.response.responses || {},
                submitted_at: f.response.submitted_at,
              }
            }

            for (const q of tpl.questions) {
              // If already completed, use the saved responses; otherwise use previous_responses for pre-fill
              const savedResponse = f.completed && f.response?.responses
                ? f.response.responses[q.id?.toString()] ?? undefined
                : undefined
              const prefillResponse = f.previous_responses?.[q.id?.toString()] ?? undefined

              intakeQuestions.push({
                id: q.id?.toString() || q.text,
                question_text: q.text || q.label || q.question_text || '',
                question_type: q.question_type || 'short_text',
                is_required: q.is_required ?? false,
                options: q.options?.map((o: any) => typeof o === 'string' ? { id: o, label: o, value: o } : { id: o.id || o.value, label: o.label || o.text, value: o.value || o.id }),
                scale_min: q.scale_min,
                scale_max: q.scale_max,
                previous_response: savedResponse ?? prefillResponse,
              })
            }
          }
        }

        data = {
          consent_form: consentForm,
          intake_questions: intakeQuestions,
          intake_template_id: intakeTemplateId,
          intake_completed_response: intakeCompletedResponse,
          booking_id: apiData.booking_id || id,
          service_name: apiData.service_name,
          practitioner_name: apiData.practitioner_name,
        }
      } else {
        // Already in expected format
        data = apiData as BookingFormsData
      }

      setFormsData(data)

      // Pre-fill consent
      if (data.consent_form?.is_signed) {
        setConsentSigned(true)
        setConsentAgreed(true)
        setSignerName(data.consent_form.signer_name || "")
      }

      // Mark intake as already submitted if the API says so
      if (data.intake_completed_response) {
        setIntakeSubmitted(true)
        setIsEditingIntake(false)
      }

      // Pre-fill intake responses (from completed data or previous responses)
      const prefilled: Record<string, any> = {}
      data.intake_questions?.forEach((q) => {
        if (q.previous_response !== undefined && q.previous_response !== null) {
          prefilled[q.id] = q.previous_response
        }
      })
      setResponses(prefilled)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  // ----- Consent submission -----

  const handleSignConsent = async () => {
    if (!consentAgreed) {
      toast.error("Please agree to the consent form before signing.")
      return
    }
    if (!signerName.trim()) {
      toast.error("Please type your full name to sign.")
      return
    }

    setIsSigningConsent(true)
    try {
      const { intakeConsentSignaturesCreate } = await import("@/src/client/sdk.gen")
      const res = await intakeConsentSignaturesCreate({
        body: {
          booking_uuid: id,
          consent_document: Number(formsData?.consent_form?.consent_document_id || formsData?.consent_form?.id),
          signer_name: signerName.trim(),
        } as any,
      })
      if (!res.data && !res.response?.ok) {
        throw new Error("Failed to sign consent form")
      }
      setConsentSigned(true)
      toast.success("Consent form signed successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to sign consent form.")
    } finally {
      setIsSigningConsent(false)
    }
  }

  // ----- Intake validation -----

  const validateIntake = (): boolean => {
    const errors: Record<string, string> = {}
    formsData?.intake_questions?.forEach((q) => {
      if (q.is_required) {
        const val = responses[q.id]
        if (val === undefined || val === null || val === "") {
          errors[q.id] = "This field is required"
        } else if (
          q.question_type === "multiple_choice" &&
          Array.isArray(val) &&
          val.length === 0
        ) {
          errors[q.id] = "Please select at least one option"
        }
      }
    })
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ----- Intake submission -----

  const handleSubmitIntake = async () => {
    if (!validateIntake()) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsSubmittingIntake(true)
    try {
      const { intakeResponsesCreate } = await import("@/src/client/sdk.gen")
      const res = await intakeResponsesCreate({
        body: {
          booking_uuid: id,
          form_template: Number(formsData?.intake_template_id),
          responses,
        } as any,
      })
      if (!res.data) {
        throw new Error("Failed to submit intake form")
      }
      setIntakeSubmitted(true)
      toast.success("Intake form submitted successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to submit intake form.")
    } finally {
      setIsSubmittingIntake(false)
    }
  }

  // ----- Combined submit -----

  const handleSubmitAll = async () => {
    // Sign consent first if needed
    if (formsData?.consent_form && !consentSigned) {
      if (!consentAgreed) {
        toast.error("Please agree to the consent form before submitting.")
        return
      }
      if (!signerName.trim()) {
        toast.error("Please type your full name to sign the consent form.")
        return
      }
      await handleSignConsent()
    }

    // Then submit intake if there are questions (or re-submit if editing)
    if (
      formsData?.intake_questions &&
      formsData.intake_questions.length > 0 &&
      (!intakeSubmitted || isEditingIntake)
    ) {
      // When editing, temporarily mark as not submitted so handleSubmitIntake works
      if (isEditingIntake) {
        setIntakeSubmitted(false)
      }
      await handleSubmitIntake()
      setIsEditingIntake(false)
    }

    // Redirect back
    toast.success("All forms submitted! Redirecting to your booking...")
    setTimeout(() => {
      router.push(`/dashboard/user/journeys/${id}`)
    }, 1000)
  }

  // ----- Response updater -----

  const updateResponse = (questionId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
    // Clear validation error on change
    if (validationErrors[questionId]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
    }
  }

  // ----- Question renderer -----

  const renderQuestion = (question: IntakeQuestion) => {
    const value = responses[question.id]
    const hasError = !!validationErrors[question.id]

    switch (question.question_type) {
      case "short_text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Your answer"
            className={hasError ? "border-red-500" : ""}
          />
        )

      case "long_text":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Your answer"
            rows={4}
            className={hasError ? "border-red-500" : ""}
          />
        )

      case "single_choice":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(v) => updateResponse(question.id, v)}
          >
            {question.options?.map((opt) => (
              <div key={opt.id || opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
                <Label
                  htmlFor={`${question.id}-${opt.value}`}
                  className="font-normal cursor-pointer"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "multiple_choice": {
        const selected: string[] = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {question.options?.map((opt) => {
              const checked = selected.includes(opt.value)
              return (
                <div key={opt.id || opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${opt.value}`}
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const next = isChecked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value)
                      updateResponse(question.id, next)
                    }}
                  />
                  <Label
                    htmlFor={`${question.id}-${opt.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                </div>
              )
            })}
          </div>
        )
      }

      case "yes_no":
        return (
          <div className="flex gap-3">
            <Button
              type="button"
              variant={value === "yes" ? "default" : "outline"}
              onClick={() => updateResponse(question.id, "yes")}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={value === "no" ? "default" : "outline"}
              onClick={() => updateResponse(question.id, "no")}
              className="flex-1"
            >
              No
            </Button>
          </div>
        )

      case "scale": {
        const min = question.scale_min ?? 1
        const max = question.scale_max ?? 10
        const current = typeof value === "number" ? value : min
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{min}</span>
              <Slider
                value={[current]}
                onValueChange={([v]) => updateResponse(question.id, v)}
                min={min}
                max={max}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">{max}</span>
            </div>
            <p className="text-center text-sm font-medium">
              {value !== undefined && value !== null ? value : "—"}
            </p>
          </div>
        )
      }

      case "date":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            className={hasError ? "border-red-500" : ""}
          />
        )

      case "file_upload":
        return (
          <div className="space-y-2">
            <label
              htmlFor={`file-${question.id}`}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors ${
                hasError ? "border-red-500" : "border-muted-foreground/25"
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {value ? (value as File).name || "File selected" : "Click to upload a file"}
              </span>
              <input
                id={`file-${question.id}`}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) updateResponse(question.id, file)
                }}
              />
            </label>
          </div>
        )

      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder="Your answer"
          />
        )
    }
  }

  // ----- Read-only answer renderer -----

  const renderReadOnlyAnswer = (question: IntakeQuestion, answer: any) => {
    if (answer === undefined || answer === null || answer === "") {
      return <span className="italic text-muted-foreground/60">No response</span>
    }

    switch (question.question_type) {
      case "multiple_choice": {
        const selected: string[] = Array.isArray(answer) ? answer : [answer]
        if (selected.length === 0) {
          return <span className="italic text-muted-foreground/60">No response</span>
        }
        // Map values back to labels if options are available
        const labels = selected.map((val) => {
          const opt = question.options?.find((o) => o.value === val)
          return opt?.label || val
        })
        return <span>{labels.join(", ")}</span>
      }

      case "single_choice": {
        const opt = question.options?.find((o) => o.value === answer)
        return <span>{opt?.label || answer}</span>
      }

      case "yes_no":
        return <span className="capitalize">{answer}</span>

      case "scale":
        return (
          <span>
            {answer}
            {question.scale_min !== undefined && question.scale_max !== undefined && (
              <span className="text-muted-foreground/60 ml-1">
                (out of {question.scale_max})
              </span>
            )}
          </span>
        )

      case "date":
        try {
          return (
            <span>
              {new Date(answer).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )
        } catch {
          return <span>{answer}</span>
        }

      case "file_upload":
        return <span className="italic">File uploaded</span>

      default:
        return <span className="whitespace-pre-wrap">{String(answer)}</span>
    }
  }

  // ----- Loading state -----

  if (isLoading) {
    return (
      <UserDashboardLayout title="Pre-Session Forms">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </UserDashboardLayout>
    )
  }

  // ----- Error state -----

  if (error) {
    return (
      <UserDashboardLayout title="Pre-Session Forms">
        <div className="max-w-2xl mx-auto space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/user/journeys/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Booking
            </Link>
          </Button>
        </div>
      </UserDashboardLayout>
    )
  }

  // ----- No forms required -----

  const hasConsent = !!formsData?.consent_form
  const hasIntake =
    formsData?.intake_questions && formsData.intake_questions.length > 0
  const allDone =
    (!hasConsent || consentSigned) && (!hasIntake || (intakeSubmitted && !isEditingIntake))

  if (!hasConsent && !hasIntake) {
    return (
      <UserDashboardLayout title="Pre-Session Forms">
        <div className="max-w-2xl mx-auto space-y-6">
          <Button
            variant="ghost"
            className="flex items-center gap-2 pl-0 hover:pl-2 transition-all"
            asChild
          >
            <Link href={`/dashboard/user/journeys/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Journey
            </Link>
          </Button>

          <Card className="border border-sage-200/60 bg-white text-center">
            <CardContent className="py-12">
              <CheckCircle className="h-12 w-12 text-sage-400 mx-auto mb-4" />
              <h2 className="font-serif text-xl font-normal text-olive-900 mb-2">
                No Pre-Session Forms
              </h2>
              <p className="text-muted-foreground mb-6">
                Your practitioner hasn&apos;t set up any forms for this session.
                No action needed — you&apos;re all set!
              </p>
              <Button asChild>
                <Link href={`/dashboard/user/journeys/${id}`}>
                  Back to Journey
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </UserDashboardLayout>
    )
  }

  // ----- Main form view -----

  return (
    <UserDashboardLayout title="Pre-Session Forms">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 pl-0 hover:pl-2 transition-all"
          asChild
        >
          <Link href={`/dashboard/user/journeys/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Booking
          </Link>
        </Button>

        {/* Page header */}
        <div>
          <h1 className="font-serif text-2xl font-normal text-olive-900">
            Pre-Session Forms
          </h1>
          {(formsData?.service_name || formsData?.practitioner_name) && (
            <p className="text-muted-foreground mt-1">
              {formsData.service_name}
              {formsData.practitioner_name &&
                ` with ${formsData.practitioner_name}`}
            </p>
          )}
        </div>

        {/* All done banner */}
        {allDone && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All forms have been completed. You can return to your booking.
            </AlertDescription>
          </Alert>
        )}

        {/* ===== Consent Form ===== */}
        {hasConsent && formsData.consent_form && (
          <Card className="border border-sage-200/60 bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="font-serif text-lg font-normal text-olive-900">
                  {formsData.consent_form.title || "Consent Form"}
                </CardTitle>
                {consentSigned && (
                  <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                )}
              </div>
              <CardDescription>
                Please read and sign the consent form below before your session.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Legal text */}
              <div className="max-h-64 overflow-y-auto rounded-md border border-sage-100 bg-sage-50/30 p-4 text-sm leading-relaxed text-olive-800 whitespace-pre-wrap">
                {formsData.consent_form.legal_text}
              </div>

              {consentSigned ? (
                <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Signed by {formsData.consent_form.signer_name || signerName}
                    </p>
                    {formsData.consent_form.signed_at && (
                      <p className="text-xs text-green-600">
                        {new Date(
                          formsData.consent_form.signed_at
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Agreement checkbox */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-agree"
                      checked={consentAgreed}
                      onCheckedChange={(checked) =>
                        setConsentAgreed(checked === true)
                      }
                    />
                    <Label
                      htmlFor="consent-agree"
                      className="font-normal leading-snug cursor-pointer"
                    >
                      I have read and agree to the above
                    </Label>
                  </div>

                  {/* Signer name */}
                  <div className="space-y-2">
                    <Label htmlFor="signer-name">
                      Full Name (as signature) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="signer-name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Type your full legal name"
                    />
                  </div>

                  {/* Sign button */}
                  <Button
                    onClick={handleSignConsent}
                    disabled={
                      !consentAgreed || !signerName.trim() || isSigningConsent
                    }
                    className="w-full"
                  >
                    {isSigningConsent ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Sign Consent Form
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== Intake Questions ===== */}
        {hasIntake && formsData.intake_questions && (
          <Card className="border border-sage-200/60 bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="font-serif text-lg font-normal text-olive-900">
                  Intake Questionnaire
                </CardTitle>
                {intakeSubmitted && !isEditingIntake && (
                  <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                )}
              </div>
              {intakeSubmitted && !isEditingIntake ? (
                <CardDescription>
                  Your responses have been submitted.
                  {formsData.intake_completed_response?.submitted_at && (
                    <span className="block mt-1 text-xs text-muted-foreground">
                      Submitted on{" "}
                      {new Date(formsData.intake_completed_response.submitted_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </CardDescription>
              ) : (
                <CardDescription>
                  Please answer the following questions to help your practitioner
                  prepare for your session.
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {intakeSubmitted && !isEditingIntake ? (
                <>
                  {/* Read-only view of submitted responses */}
                  {formsData.intake_questions.map((question, index) => {
                    const answer = responses[question.id]
                    return (
                      <div key={question.id} className="space-y-1">
                        {index > 0 && <Separator className="mb-4" />}
                        <p className="text-sm font-medium text-olive-900 leading-snug">
                          {question.question_text}
                        </p>
                        <div className="text-sm text-muted-foreground bg-sage-50/40 rounded-md px-3 py-2">
                          {renderReadOnlyAnswer(question, answer)}
                        </div>
                      </div>
                    )
                  })}

                  {/* Edit Responses button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingIntake(true)}
                      className="w-full"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Responses
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {isEditingIntake && (
                    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 mb-2">
                      <p className="text-sm text-amber-800">
                        You are editing your previously submitted responses.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingIntake(false)}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Only
                      </Button>
                    </div>
                  )}
                  {formsData.intake_questions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      {index > 0 && <Separator className="mb-4" />}
                      <Label className="text-sm font-medium leading-snug">
                        {question.question_text}
                        {question.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      {renderQuestion(question)}
                      {validationErrors[question.id] && (
                        <p className="text-xs text-red-500">
                          {validationErrors[question.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== Submit All Button ===== */}
        {!allDone && (
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/user/journeys/${id}`}>Cancel</Link>
            </Button>
            <Button
              onClick={handleSubmitAll}
              disabled={isSigningConsent || isSubmittingIntake}
              size="lg"
            >
              {isSigningConsent || isSubmittingIntake ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : isEditingIntake ? (
                "Update Responses"
              ) : (
                "Submit Forms"
              )}
            </Button>
          </div>
        )}

        {/* Return link when all done */}
        {allDone && (
          <div className="flex justify-center pb-8">
            <Button asChild>
              <Link href={`/dashboard/user/journeys/${id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Booking
              </Link>
            </Button>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  )
}
