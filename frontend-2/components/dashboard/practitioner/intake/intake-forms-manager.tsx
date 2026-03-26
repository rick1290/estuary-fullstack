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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  GripVertical,
  Library,
  Link as LinkIcon,
  X,
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
}

// ─── Question Type Display Helpers ───────────────────────────────────────────

const QUESTION_TYPE_OPTIONS = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "single_choice", label: "Single Choice" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "yes_no", label: "Yes / No" },
  { value: "scale", label: "Scale (1-10)" },
  { value: "date", label: "Date" },
]

function questionTypeLabel(type: string) {
  return QUESTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
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
            Browse Platform Templates
          </Button>
        </div>

        {/* ─── Template Cards ─────────────────────────────────────────── */}
        {!templates || templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-olive-300 mb-4" />
              <p className="text-olive-700 font-medium mb-1">No form templates yet</p>
              <p className="text-sm text-olive-500 mb-6 max-w-sm">
                Create a new intake or consent form template, or browse platform
                templates to get started.
              </p>
              <div className="flex gap-3">
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlatformBrowserOpen(true)}
                >
                  <Library className="mr-2 h-4 w-4" />
                  Browse Platform Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const isIntake = template.form_type === "intake"
              const isSelected = selectedTemplateId === template.id
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    isSelected ? "ring-2 ring-sage-400" : ""
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 rounded-md p-2 ${
                            isIntake
                              ? "bg-sage-100 text-sage-700"
                              : "bg-terracotta-100 text-terracotta-700"
                          }`}
                        >
                          {isIntake ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
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
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
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

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Attach to service"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAttachTemplateId(template.id)
                            setAttachDialogOpen(true)
                          }}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
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
                        {isSelected ? (
                          <ChevronDown className="h-4 w-4 text-olive-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-olive-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* ─── Template Editor (inline below cards) ───────────────────── */}
        {selectedTemplate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium text-olive-900">
                Editing: {selectedTemplate.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTemplate.form_type === "intake" ? (
                /* ── Intake Question Editor ──────────────────────────── */
                <div className="space-y-4">
                  {selectedTemplate.questions && selectedTemplate.questions.length > 0 ? (
                    <div className="space-y-2">
                      {[...selectedTemplate.questions]
                        .sort((a, b) => a.order - b.order)
                        .map((q) => (
                          <div
                            key={q.id}
                            className="flex items-center gap-3 rounded-lg border border-sage-200/60 bg-cream-50 px-4 py-3"
                          >
                            <GripVertical className="h-4 w-4 text-olive-300 shrink-0 cursor-grab" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-olive-900 truncate">
                                  {q.label}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {questionTypeLabel(q.question_type)}
                                </Badge>
                                {q.required && (
                                  <Badge className="text-xs bg-terracotta-100 text-terracotta-700">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              {q.help_text && (
                                <p className="text-xs text-olive-400 mt-0.5 truncate">
                                  {q.help_text}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
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
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-olive-500 py-4 text-center">
                      No questions yet. Add your first question below.
                    </p>
                  )}

                  {addQuestionOpen ? (
                    <Card className="border-sage-300">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={qType} onValueChange={setQType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {QUESTION_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                  <div className="space-y-2">
                    <Label htmlFor="consent-text">Legal / Consent Text</Label>
                    <Textarea
                      id="consent-text"
                      className="min-h-[200px] font-mono text-sm"
                      value={consentText}
                      onChange={(e) => {
                        setConsentText(e.target.value)
                        setConsentDirty(true)
                      }}
                      placeholder="Enter the consent or legal agreement text that clients must acknowledge..."
                    />
                  </div>

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
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Create Template Dialog ─────────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Form Template</DialogTitle>
            <DialogDescription>
              Set up a new intake or consent form template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-title">Title</Label>
              <Input
                id="tpl-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. New Client Intake Form"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as "intake" | "consent")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="consent">Consent</SelectItem>
                </SelectContent>
              </Select>
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
        </DialogContent>
      </Dialog>

      {/* ─── Platform Templates Browser Dialog ──────────────────────────── */}
      <Dialog open={platformBrowserOpen} onOpenChange={setPlatformBrowserOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platform Templates</DialogTitle>
            <DialogDescription>
              Browse pre-built templates and clone them to your library.
            </DialogDescription>
          </DialogHeader>

          {platformLoading ? (
            <LoadingSpinner />
          ) : !platformTemplates || platformTemplates.length === 0 ? (
            <p className="text-sm text-olive-500 py-8 text-center">
              No platform templates available yet.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              {platformTemplates.map((pt) => (
                <Card key={pt.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {pt.form_type === "intake" ? (
                          <FileText className="h-4 w-4 text-sage-600 shrink-0" />
                        ) : (
                          <Shield className="h-4 w-4 text-terracotta-600 shrink-0" />
                        )}
                        <span className="font-medium text-sm text-olive-900 truncate">
                          {pt.title}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {pt.form_type === "intake" ? "Intake" : "Consent"}
                        </Badge>
                      </div>
                      {pt.description && (
                        <p className="text-xs text-olive-500 mt-1 line-clamp-2">
                          {pt.description}
                        </p>
                      )}
                      <span className="text-xs text-olive-400 mt-1 block">
                        {pt.question_count} question
                        {pt.question_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cloneMutation.isPending}
                      onClick={() => cloneMutation.mutate(pt.id)}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Use This Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Attach to Service Dialog ───────────────────────────────────── */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Attach to Service</DialogTitle>
            <DialogDescription>
              Choose a service to attach this form template to.
            </DialogDescription>
          </DialogHeader>

          {!services || services.length === 0 ? (
            <p className="text-sm text-olive-500 py-6 text-center">
              No services found. Create a service first.
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {services.map((svc) => (
                <Button
                  key={svc.id}
                  variant="outline"
                  className="w-full justify-start"
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
                  {svc.name}
                </Button>
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
