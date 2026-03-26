"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
// Select components retained for potential future use
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Plus,
  FileText,
  Shield,
  Copy,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Library,
  Link as LinkIcon,
  X,
  AlignLeft,
  AlignJustify,
  CircleDot,
  ListChecks,
  ToggleLeft,
  Hash,
  Calendar,
  Eye,
} from "lucide-react"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { PractitionerPageHeader } from "../practitioner-page-header"
import {
  intakeTemplatesList,
  intakeTemplatesCreate,
  intakeTemplatesDestroy,
  intakeTemplatesAddQuestionCreate,
  intakeTemplatesUpdateConsentTextCreate,
  intakeTemplatesCloneCreate,
  intakePlatformTemplatesList,
  intakeServicesFormsCreate,
} from "@/src/client/sdk.gen"

// ─── Types ───────────────────────────────────────────────────────────────────

interface TemplateQuestion {
  id: number
  label: string
  question_type: string
  help_text: string
  required: boolean
  options: string[]
  order: number
}

interface FormTemplate {
  id: number
  title: string
  form_type: "intake" | "consent"
  description: string
  is_active: boolean
  question_count: number
  questions: TemplateQuestion[]
  consent_text?: string
  consent_versions?: { version: number; created_at: string }[]
  created_at: string
  updated_at: string
}

interface PlatformTemplate {
  id: number
  title: string
  form_type: "intake" | "consent"
  description: string
  question_count: number
}

interface PractitionerService {
  id: number
  name: string
  service_type?: string
  price?: string | number
}

// ─── Question Type Display Helpers ───────────────────────────────────────────

const QUESTION_TYPE_OPTIONS = [
  { value: "short_text", label: "Short Text", icon: AlignLeft },
  { value: "long_text", label: "Long Text", icon: AlignJustify },
  { value: "single_choice", label: "Single Choice", icon: CircleDot },
  { value: "multiple_choice", label: "Multiple Choice", icon: ListChecks },
  { value: "yes_no", label: "Yes / No", icon: ToggleLeft },
  { value: "scale", label: "Scale (1-10)", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
]

function questionTypeLabel(type: string) {
  return QUESTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

function questionTypeIcon(type: string) {
  const opt = QUESTION_TYPE_OPTIONS.find((o) => o.value === type)
  return opt?.icon || AlignLeft
}

const isChoiceType = (type: string) =>
  type === "single_choice" || type === "multiple_choice"

// ─── API Helpers ─────────────────────────────────────────────────────────────
// Uses generated OpenAPI client (handles auth automatically via interceptors)

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IntakeFormsManager() {
  const queryClient = useQueryClient()

  // ── State ────────────────────────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [platformBrowserOpen, setPlatformBrowserOpen] = useState(false)
  const [attachDialogOpen, setAttachDialogOpen] = useState(false)
  const [attachTemplateId, setAttachTemplateId] = useState<number | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [addQuestionOpen, setAddQuestionOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)

  // Create form state
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState<"intake" | "consent">("intake")
  const [newDescription, setNewDescription] = useState("")

  // Question form state
  const [qLabel, setQLabel] = useState("")
  const [qType, setQType] = useState("short_text")
  const [qHelpText, setQHelpText] = useState("")
  const [qRequired, setQRequired] = useState(false)
  const [qOptions, setQOptions] = useState("")

  // Consent text state
  const [consentText, setConsentText] = useState("")
  const [consentDirty, setConsentDirty] = useState(false)

  // Consent preview toggle
  const [consentPreview, setConsentPreview] = useState(false)

  // Create dialog step: "pick-type" | "details"
  const [createStep, setCreateStep] = useState<"pick-type" | "details">("pick-type")

  // ── Queries ──────────────────────────────────────────────────────────────

  const {
    data: templatesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["intake-templates"],
    queryFn: async () => {
      const res = await intakeTemplatesList()
      return res.data
    },
  })
  const templates = (templatesData as any)?.results || templatesData || []

  const { data: platformTemplatesData, isLoading: platformLoading } = useQuery({
    queryKey: ["intake-platform-templates"],
    queryFn: async () => {
      const res = await intakePlatformTemplatesList()
      return res.data
    },
    enabled: platformBrowserOpen,
  })
  const platformTemplates = (platformTemplatesData as any)?.results || platformTemplatesData || []

  const { data: servicesData } = useQuery({
    queryKey: ["practitioner-services-for-attach"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${baseUrl}/api/v1/services/?mine=true`, { credentials: "include" })
      if (!res.ok) return []
      const data = await res.json()
      return data?.data?.results || data?.results || []
    },
    enabled: attachDialogOpen,
  })
  const services = servicesData || []

  const selectedTemplate = (templates as any[])?.find((t: any) => t.id === selectedTemplateId)

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (body: { title: string; form_type: string; description: string }) => {
      const res = await intakeTemplatesCreate({ body: body as any })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-templates"] })
      setCreateDialogOpen(false)
      resetCreateForm()
      toast.success("Template created")
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't create template"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await intakeTemplatesDestroy({ path: { id } })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-templates"] })
      if (selectedTemplateId) setSelectedTemplateId(null)
      toast.success("Template deleted")
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't delete template"),
  })

  const cloneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await intakeTemplatesCloneCreate({ path: { id } })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-templates"] })
      setPlatformBrowserOpen(false)
      toast.success("Template cloned to your library")
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't clone template"),
  })

  const addQuestionMutation = useMutation({
    mutationFn: async (body: {
      templateId: number
      label: string
      question_type: string
      help_text: string
      required: boolean
      options: string[]
    }) => {
      const { templateId, ...rest } = body
      const res = await intakeTemplatesAddQuestionCreate({
        path: { id: templateId },
        body: rest as any,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-templates"] })
      setAddQuestionOpen(false)
      resetQuestionForm()
      toast.success("Question added")
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't add question"),
  })

  const deleteQuestionMutation = useMutation({
    mutationFn: async ({ templateId, questionId }: { templateId: number; questionId: number }) => {
      // Question delete not in generated client yet — use SDK base
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${baseUrl}/api/v1/intake/templates/${templateId}/questions/${questionId}/`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete question")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-templates"] })
      toast.success("Question removed")
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't remove question"),
  })

  const updateConsentMutation = useMutation({
    mutationFn: async ({ templateId, text }: { templateId: number; text: string }) => {
      const res = await intakeTemplatesUpdateConsentTextCreate({
        path: { id: templateId },
        body: { legal_text: text } as any,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-templates"] })
      setConsentDirty(false)
      toast.success("Consent text saved")
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't save consent text"),
  })

  const attachMutation = useMutation({
    mutationFn: async ({ serviceId, templateId }: { serviceId: number; templateId: number }) => {
      const res = await intakeServicesFormsCreate({
        path: { service_pk: serviceId } as any,
        body: { form_template: templateId, service: serviceId } as any,
      })
      return res.data
    },
    onSuccess: () => {
      setAttachDialogOpen(false)
      setAttachTemplateId(null)
      toast.success("Template attached to service")
    },
    onError: (err: Error) => toast.error(err.message || "Failed to attach template"),
  })

  // ── Helpers ──────────────────────────────────────────────────────────────

  function resetCreateForm() {
    setNewTitle("")
    setNewType("intake")
    setNewDescription("")
    setCreateStep("pick-type")
  }

  function resetQuestionForm() {
    setQLabel("")
    setQType("short_text")
    setQHelpText("")
    setQRequired(false)
    setQOptions("")
  }

  function handleSelectTemplate(template: FormTemplate) {
    if (selectedTemplateId === template.id) {
      setSelectedTemplateId(null)
    } else {
      setSelectedTemplateId(template.id)
      if (template.form_type === "consent") {
        setConsentText(template.consent_text || "")
        setConsentDirty(false)
      }
    }
  }

  function openCreateWithType(type: "intake" | "consent") {
    setNewType(type)
    setCreateStep("details")
    setCreateDialogOpen(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-12 text-center">
        <p className="text-olive-600">Failed to load intake form templates.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["intake-templates"] })}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      <PractitionerPageHeader
        title="Intake Forms"
        action={{
          label: "Create Template",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setCreateDialogOpen(true),
        }}
      />

      <div className="px-4 sm:px-6 py-4 space-y-6">
        {/* Secondary action row */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlatformBrowserOpen(true)}
          >
            <Library className="mr-2 h-4 w-4" />
            Browse Templates
          </Button>
        </div>

        {/* ─── Empty State: Two side-by-side cards ───────────────────── */}
        {!templates || templates.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Intake card */}
            <Card
              className="border-dashed border-2 border-sage-200 rounded-xl cursor-pointer hover:shadow-md hover:border-sage-400 transition-all group"
              onClick={() => openCreateWithType("intake")}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-sage-100 to-sage-200/60 p-4 mb-4 group-hover:from-sage-200 group-hover:to-sage-300/60 transition-colors">
                  <FileText className="h-8 w-8 text-sage-700" />
                </div>
                <h3 className="font-medium text-olive-900 mb-1">Create Intake Form</h3>
                <p className="text-sm text-olive-500 max-w-[220px]">
                  Ask clients questions before their session
                </p>
              </CardContent>
            </Card>

            {/* Consent card */}
            <Card
              className="border-dashed border-2 border-terracotta-200 rounded-xl cursor-pointer hover:shadow-md hover:border-terracotta-400 transition-all group"
              onClick={() => openCreateWithType("consent")}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-terracotta-100 to-terracotta-200/60 p-4 mb-4 group-hover:from-terracotta-200 group-hover:to-terracotta-300/60 transition-colors">
                  <Shield className="h-8 w-8 text-terracotta-700" />
                </div>
                <h3 className="font-medium text-olive-900 mb-1">Create Consent Form</h3>
                <p className="text-sm text-olive-500 max-w-[220px]">
                  Get signed consent before sessions
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ─── Template Cards ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template: FormTemplate) => {
              const isIntake = template.form_type === "intake"
              const isSelected = selectedTemplateId === template.id
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer rounded-xl border-l-4 transition-all hover:shadow-md ${
                    isIntake
                      ? "border-l-sage-400 hover:border-l-sage-500"
                      : "border-l-terracotta-400 hover:border-l-terracotta-500"
                  } ${isSelected ? "ring-2 ring-sage-400 shadow-md" : ""}`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Bigger icon area with gradient */}
                        <div
                          className={`mt-0.5 rounded-xl p-3 shrink-0 ${
                            isIntake
                              ? "bg-gradient-to-br from-sage-100 to-sage-200/60 text-sage-700"
                              : "bg-gradient-to-br from-terracotta-100 to-terracotta-200/60 text-terracotta-700"
                          }`}
                        >
                          {isIntake ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <Shield className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-olive-900 truncate">
                            {template.title}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-olive-500 line-clamp-2 mt-0.5">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                isIntake
                                  ? "bg-sage-100 text-sage-700"
                                  : "bg-terracotta-100 text-terracotta-700"
                              }`}
                            >
                              {isIntake ? "Intake" : "Consent"}
                            </Badge>
                            <Badge
                              variant={template.is_active ? "default" : "outline"}
                              className="text-xs"
                            >
                              {template.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-olive-400">
                              {template.question_count} question
                              {template.question_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-olive-600 hover:text-olive-900"
                            title="Attach to service"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachTemplateId(template.id)
                              setAttachDialogOpen(true)
                            }}
                          >
                            <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                            Attach
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-olive-400 hover:text-destructive"
                            title="Delete template"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm("Delete this template? This cannot be undone.")) {
                                deleteMutation.mutate(template.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="pr-1">
                          {isSelected ? (
                            <ChevronDown className="h-4 w-4 text-olive-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-olive-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* ─── Template Editor (inline slide-down) ───────────────────── */}
        {selectedTemplate && (
          <div className="rounded-xl bg-sage-50/50 border border-sage-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-sage-200/60">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    selectedTemplate.form_type === "intake"
                      ? "bg-sage-200/60 text-sage-700"
                      : "bg-terracotta-200/60 text-terracotta-700"
                  }`}
                >
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-olive-900">
                    Editing: {selectedTemplate.title}
                  </h3>
                  <p className="text-xs text-olive-500 mt-0.5">
                    {selectedTemplate.form_type === "intake"
                      ? "Manage questions below"
                      : "Edit consent text below"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {selectedTemplate.form_type === "intake" ? (
                /* ── Intake Question Editor ──────────────────────────── */
                <div className="space-y-4">
                  {selectedTemplate.questions && selectedTemplate.questions.length > 0 ? (
                    <div className="space-y-3">
                      {[...selectedTemplate.questions]
                        .sort((a: TemplateQuestion, b: TemplateQuestion) => a.order - b.order)
                        .map((q: TemplateQuestion, index: number) => {
                          const QIcon = questionTypeIcon(q.question_type)
                          return (
                            <div
                              key={q.id}
                              className="flex items-start gap-3 rounded-xl border border-sage-200/60 bg-white px-4 py-3.5"
                            >
                              {/* Number circle */}
                              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-sage-200/70 text-sage-800 text-xs font-semibold shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm text-olive-900">
                                    {q.label}
                                  </span>
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <QIcon className="h-3 w-3" />
                                    {questionTypeLabel(q.question_type)}
                                  </Badge>
                                  {q.required && (
                                    <Badge className="text-xs bg-terracotta-100 text-terracotta-700 border-0">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                {q.help_text && (
                                  <p className="text-xs text-olive-400 mt-1">
                                    {q.help_text}
                                  </p>
                                )}
                                {q.options && q.options.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {q.options.map((opt: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-olive-100 text-olive-600 px-2 py-0.5 rounded-full"
                                      >
                                        {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-olive-400 hover:text-sage-700"
                                  title="Edit question"
                                  onClick={() => {
                                    setEditingQuestionId(editingQuestionId === q.id ? null : q.id)
                                    if (editingQuestionId !== q.id) {
                                      setQLabel(q.label)
                                      setQType(q.question_type)
                                      setQHelpText(q.help_text || "")
                                      setQRequired(q.required)
                                      setQOptions(q.options ? q.options.join(", ") : "")
                                    }
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-olive-400 hover:text-destructive"
                                  title="Delete question"
                                  onClick={() =>
                                    deleteQuestionMutation.mutate({
                                      templateId: selectedTemplate.id,
                                      questionId: q.id,
                                    })
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {/* Inline edit form */}
                              {editingQuestionId === q.id && (
                                <div className="mt-3 p-4 rounded-lg bg-sage-50 border border-sage-200/60 space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Question Label</Label>
                                    <Input
                                      value={qLabel}
                                      onChange={(e) => setQLabel(e.target.value)}
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs">Help Text</Label>
                                      <Input
                                        value={qHelpText}
                                        onChange={(e) => setQHelpText(e.target.value)}
                                        className="h-9 text-sm"
                                        placeholder="Optional"
                                      />
                                    </div>
                                    <div className="flex items-end gap-3 pb-0.5">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          id={`q-req-${q.id}`}
                                          checked={qRequired}
                                          onCheckedChange={(v) => setQRequired(v === true)}
                                        />
                                        <Label htmlFor={`q-req-${q.id}`} className="text-xs font-normal">Required</Label>
                                      </div>
                                    </div>
                                  </div>
                                  {isChoiceType(q.question_type) && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">Options (comma-separated)</Label>
                                      <Input
                                        value={qOptions}
                                        onChange={(e) => setQOptions(e.target.value)}
                                        className="h-9 text-sm"
                                      />
                                    </div>
                                  )}
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      className="text-xs h-8"
                                      disabled={!qLabel.trim() || addQuestionMutation.isPending}
                                      onClick={() => {
                                        // Delete old question and re-add with updated data
                                        deleteQuestionMutation.mutate(
                                          { templateId: selectedTemplate.id, questionId: q.id },
                                          {
                                            onSuccess: () => {
                                              addQuestionMutation.mutate({
                                                templateId: selectedTemplate.id,
                                                label: qLabel.trim(),
                                                question_type: q.question_type,
                                                help_text: qHelpText.trim(),
                                                required: qRequired,
                                                options: isChoiceType(q.question_type)
                                                  ? qOptions.split(",").map((s) => s.trim()).filter(Boolean)
                                                  : [],
                                              })
                                              setEditingQuestionId(null)
                                            },
                                          }
                                        )
                                      }}
                                    >
                                      Save Changes
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-8"
                                      onClick={() => setEditingQuestionId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="rounded-2xl bg-sage-100/60 p-3 inline-block mb-3">
                        <FileText className="h-6 w-6 text-sage-500" />
                      </div>
                      <p className="text-sm text-olive-500">
                        No questions yet. Add your first question below.
                      </p>
                    </div>
                  )}

                  {addQuestionOpen ? (
                    <Card className="border-sage-300 rounded-xl overflow-hidden">
                      <div className="bg-sage-50 px-4 py-3 border-b border-sage-200/60">
                        <h4 className="text-sm font-medium text-olive-800">New Question</h4>
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="q-label">Question Label</Label>
                          <Input
                            id="q-label"
                            value={qLabel}
                            onChange={(e) => setQLabel(e.target.value)}
                            placeholder="e.g. Do you have any allergies?"
                          />
                        </div>

                        {/* Question type as icon pills */}
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <div className="flex flex-wrap gap-2">
                            {QUESTION_TYPE_OPTIONS.map((opt) => {
                              const Icon = opt.icon
                              const isActive = qType === opt.value
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setQType(opt.value)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                                    isActive
                                      ? "bg-sage-100 border-sage-400 text-sage-800 shadow-sm"
                                      : "bg-white border-olive-200 text-olive-600 hover:border-olive-300 hover:bg-olive-50"
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="q-help">Help Text (optional)</Label>
                          <Input
                            id="q-help"
                            value={qHelpText}
                            onChange={(e) => setQHelpText(e.target.value)}
                            placeholder="Additional context for the client"
                          />
                        </div>

                        {isChoiceType(qType) && (
                          <div className="space-y-2">
                            <Label htmlFor="q-options">
                              Options (comma-separated)
                            </Label>
                            <Input
                              id="q-options"
                              value={qOptions}
                              onChange={(e) => setQOptions(e.target.value)}
                              placeholder="Option A, Option B, Option C"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="q-required"
                            checked={qRequired}
                            onCheckedChange={(v) => setQRequired(v === true)}
                          />
                          <Label htmlFor="q-required" className="text-sm font-normal">
                            Required
                          </Label>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            disabled={!qLabel.trim() || addQuestionMutation.isPending}
                            onClick={() =>
                              addQuestionMutation.mutate({
                                templateId: selectedTemplate.id,
                                label: qLabel.trim(),
                                question_type: qType,
                                help_text: qHelpText.trim(),
                                required: qRequired,
                                options: isChoiceType(qType)
                                  ? qOptions
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  : [],
                              })
                            }
                          >
                            {addQuestionMutation.isPending
                              ? "Saving..."
                              : "Save Question"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAddQuestionOpen(false)
                              resetQuestionForm()
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setAddQuestionOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  )}
                </div>
              ) : (
                /* ── Consent Text Editor ─────────────────────────────── */
                <div className="space-y-4">
                  {/* Preview toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="consent-text" className="text-sm font-medium text-olive-800">
                      Legal / Consent Text
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setConsentPreview(!consentPreview)}
                    >
                      {consentPreview ? (
                        <>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>

                  {consentPreview ? (
                    <div className="rounded-xl border border-sage-200/60 bg-white p-5 min-h-[200px]">
                      {consentText ? (
                        <div className="prose prose-sm prose-olive max-w-none whitespace-pre-wrap">
                          {consentText}
                        </div>
                      ) : (
                        <p className="text-sm text-olive-400 italic">
                          No consent text written yet.
                        </p>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      id="consent-text"
                      className="min-h-[200px] font-mono text-sm rounded-xl"
                      value={consentText}
                      onChange={(e) => {
                        setConsentText(e.target.value)
                        setConsentDirty(true)
                      }}
                      placeholder="Enter the consent or legal agreement text that clients must acknowledge..."
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      disabled={!consentDirty || updateConsentMutation.isPending}
                      onClick={() =>
                        updateConsentMutation.mutate({
                          templateId: selectedTemplate.id,
                          text: consentText,
                        })
                      }
                    >
                      {updateConsentMutation.isPending
                        ? "Saving..."
                        : "Save Consent Text"}
                    </Button>

                    {selectedTemplate.consent_versions &&
                      selectedTemplate.consent_versions.length > 0 && (
                        <div className="text-xs text-olive-400">
                          {selectedTemplate.consent_versions.length} version
                          {selectedTemplate.consent_versions.length !== 1 ? "s" : ""}{" "}
                          &mdash; latest: v
                          {selectedTemplate.consent_versions[0]?.version}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Create Template Dialog ─────────────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) resetCreateForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createStep === "pick-type" ? "What would you like to create?" : "Template Details"}
            </DialogTitle>
            <DialogDescription>
              {createStep === "pick-type"
                ? "Choose the type of form template."
                : `Set up your new ${newType === "intake" ? "intake questionnaire" : "consent form"}.`}
            </DialogDescription>
          </DialogHeader>

          {createStep === "pick-type" ? (
            /* ── Type picker: two large cards ─── */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <button
                type="button"
                onClick={() => {
                  setNewType("intake")
                  setCreateStep("details")
                }}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-sage-200 bg-white p-6 text-center transition-all hover:border-sage-400 hover:shadow-md hover:bg-sage-50/30 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <div className="rounded-2xl bg-gradient-to-br from-sage-100 to-sage-200/60 p-4">
                  <FileText className="h-7 w-7 text-sage-700" />
                </div>
                <div>
                  <h3 className="font-medium text-olive-900">Intake Questionnaire</h3>
                  <p className="text-xs text-olive-500 mt-1">
                    Ask clients questions before their session begins
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewType("consent")
                  setCreateStep("details")
                }}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-terracotta-200 bg-white p-6 text-center transition-all hover:border-terracotta-400 hover:shadow-md hover:bg-terracotta-50/30 focus:outline-none focus:ring-2 focus:ring-terracotta-400"
              >
                <div className="rounded-2xl bg-gradient-to-br from-terracotta-100 to-terracotta-200/60 p-4">
                  <Shield className="h-7 w-7 text-terracotta-700" />
                </div>
                <div>
                  <h3 className="font-medium text-olive-900">Consent Form</h3>
                  <p className="text-xs text-olive-500 mt-1">
                    Get signed consent and acknowledgment before sessions
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* ── Detail fields ─── */
            <div className="space-y-4 py-2">
              {/* Selected type indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-lg p-2 ${
                    newType === "intake"
                      ? "bg-sage-100 text-sage-700"
                      : "bg-terracotta-100 text-terracotta-700"
                  }`}
                >
                  {newType === "intake" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    newType === "intake"
                      ? "bg-sage-100 text-sage-700"
                      : "bg-terracotta-100 text-terracotta-700"
                  }`}
                >
                  {newType === "intake" ? "Intake Questionnaire" : "Consent Form"}
                </Badge>
                <button
                  type="button"
                  className="text-xs text-olive-500 hover:text-olive-700 underline ml-auto"
                  onClick={() => setCreateStep("pick-type")}
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpl-title">Title</Label>
                <Input
                  id="tpl-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={
                    newType === "intake"
                      ? "e.g. New Client Intake Form"
                      : "e.g. Session Consent Agreement"
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpl-desc">Description (optional)</Label>
                <Textarea
                  id="tpl-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of what this form collects"
                  rows={3}
                />
              </div>
            </div>
          )}

          {createStep === "details" && (
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateDialogOpen(false)
                  resetCreateForm()
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    title: newTitle.trim(),
                    form_type: newType,
                    description: newDescription.trim(),
                  })
                }
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Platform Templates Browser Dialog ──────────────────────────── */}
      <Dialog open={platformBrowserOpen} onOpenChange={setPlatformBrowserOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platform Templates</DialogTitle>
            <DialogDescription>
              Browse pre-built templates and clone them to your library.
            </DialogDescription>
          </DialogHeader>

          {platformLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-olive-200/60 p-4 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-olive-200" />
                    <div className="h-4 w-24 rounded bg-olive-200" />
                  </div>
                  <div className="h-3 w-full rounded bg-olive-100" />
                  <div className="h-3 w-2/3 rounded bg-olive-100" />
                  <div className="h-8 w-28 rounded bg-olive-100 mt-2" />
                </div>
              ))}
            </div>
          ) : !platformTemplates || platformTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-2xl bg-olive-100/60 p-3 inline-block mb-3">
                <Library className="h-6 w-6 text-olive-400" />
              </div>
              <p className="text-sm text-olive-500">
                No platform templates available yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {platformTemplates.map((pt: PlatformTemplate) => {
                const isIntake = pt.form_type === "intake"
                return (
                  <Card key={pt.id} className="rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-medium text-sm text-olive-900 truncate">
                            {pt.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              isIntake
                                ? "bg-sage-100 text-sage-700"
                                : "bg-terracotta-100 text-terracotta-700"
                            }`}
                          >
                            {isIntake ? (
                              <FileText className="mr-1 h-3 w-3" />
                            ) : (
                              <Shield className="mr-1 h-3 w-3" />
                            )}
                            {isIntake ? "Intake" : "Consent"}
                          </Badge>
                          <span className="text-xs text-olive-400">
                            {pt.question_count} question
                            {pt.question_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {pt.description && (
                          <p className="text-xs text-olive-500 line-clamp-2">
                            {pt.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-lg mt-auto"
                        disabled={cloneMutation.isPending}
                        onClick={() => cloneMutation.mutate(pt.id)}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Use This
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Attach to Service Dialog ───────────────────────────────────── */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach to Service</DialogTitle>
            <DialogDescription>
              Choose a service to attach this form template to.
            </DialogDescription>
          </DialogHeader>

          {!services || services.length === 0 ? (
            <div className="text-center py-8">
              <div className="rounded-2xl bg-olive-100/60 p-3 inline-block mb-3">
                <LinkIcon className="h-6 w-6 text-olive-400" />
              </div>
              <p className="text-sm text-olive-500">
                No services found. Create a service first.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {services.map((svc: PractitionerService) => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-olive-200/60 bg-white px-4 py-3 hover:border-sage-300 hover:bg-sage-50/30 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-olive-900 truncate">
                      {svc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {svc.service_type && (
                        <Badge variant="outline" className="text-xs">
                          {svc.service_type}
                        </Badge>
                      )}
                      {svc.price && (
                        <span className="text-xs text-olive-400">
                          ${typeof svc.price === "number" ? svc.price.toFixed(2) : svc.price}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-lg"
                    disabled={attachMutation.isPending}
                    onClick={() => {
                      if (attachTemplateId) {
                        attachMutation.mutate({
                          serviceId: svc.id,
                          templateId: attachTemplateId,
                        })
                      }
                    }}
                  >
                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    Attach
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAttachDialogOpen(false)
                setAttachTemplateId(null)
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
