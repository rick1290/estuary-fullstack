"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon,
  Users,
  AlertCircle,
  Award,
  FileText,
  Clock,
  ClipboardList,
  Plus,
  Trash2,
  Shield,
  ExternalLink,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { ServiceDetailReadable as ServiceReadable } from "@/src/client/types.gen"
import {
  intakeServicesFormsListOptions,
  intakeServicesFormsCreateMutation,
  intakeServicesFormsDestroyMutation,
  intakeTemplatesListOptions,
} from "@/src/client/@tanstack/react-query.gen"

interface AdvancedSectionProps {
  service: ServiceReadable
  data: {
    terms_conditions?: string
    experience_level?: string
    age_min?: number
    age_max?: number
    available_from?: Date
    available_until?: Date
    max_per_customer?: number
    validity_days?: number
    is_transferable?: boolean
    is_shareable?: boolean
    highlight_text?: string
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

const experienceLevels = [
  { value: "beginner", label: "Beginner - No prior experience needed" },
  { value: "intermediate", label: "Intermediate - Some experience helpful" },
  { value: "advanced", label: "Advanced - Experienced participants only" },
  { value: "all_levels", label: "All Levels - Everyone welcome" },
]

export function AdvancedSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: AdvancedSectionProps) {
  const [localData, setLocalData] = useState(data)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const isPackageOrBundle = service.service_type_info?.type_code === 'package' || 
                           service.service_type_info?.type_code === 'bundle'

  return (
    <div className="space-y-6">
      {/* Participant Requirements */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="font-medium">Participant Requirements</h3>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Select
                value={localData.experience_level || "all_levels"}
                onValueChange={(value) => handleChange('experience_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age-min">Minimum Age</Label>
                <Input
                  id="age-min"
                  type="number"
                  min="0"
                  max="100"
                  value={localData.age_min || ""}
                  onChange={(e) => handleChange('age_min', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No minimum"
                />
              </div>
              <div>
                <Label htmlFor="age-max">Maximum Age</Label>
                <Input
                  id="age-max"
                  type="number"
                  min="0"
                  max="100"
                  value={localData.age_max || ""}
                  onChange={(e) => handleChange('age_max', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No maximum"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Booking Rules */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h3 className="font-medium">Booking Rules & Availability</h3>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="max-per-customer">Maximum Bookings Per Customer</Label>
              <Input
                id="max-per-customer"
                type="number"
                min="1"
                value={localData.max_per_customer || ""}
                onChange={(e) => handleChange('max_per_customer', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Limit how many times a single customer can book this service
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Available From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localData.available_from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localData.available_from ? (
                        format(new Date(localData.available_from), "PPP")
                      ) : (
                        <span>No start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localData.available_from ? new Date(localData.available_from) : undefined}
                      onSelect={(date) => handleChange('available_from', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Available Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localData.available_until && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localData.available_until ? (
                        format(new Date(localData.available_until), "PPP")
                      ) : (
                        <span>No end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localData.available_until ? new Date(localData.available_until) : undefined}
                      onSelect={(date) => handleChange('available_until', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Package/Bundle Specific Settings */}
      {isPackageOrBundle && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <h3 className="font-medium">Package Settings</h3>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="validity-days">Validity Period (Days)</Label>
                <Input
                  id="validity-days"
                  type="number"
                  min="1"
                  value={localData.validity_days || ""}
                  onChange={(e) => handleChange('validity_days', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No expiration"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  How long the package remains valid after purchase
                </p>
              </div>

              <div>
                <Label htmlFor="highlight-text">Highlight Badge</Label>
                <Input
                  id="highlight-text"
                  value={localData.highlight_text || ""}
                  onChange={(e) => handleChange('highlight_text', e.target.value)}
                  placeholder="e.g., BEST VALUE, LIMITED TIME"
                  maxLength={20}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optional badge to highlight this package
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="transferable">Transferable</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to transfer to someone else
                    </p>
                  </div>
                  <Switch
                    id="transferable"
                    checked={localData.is_transferable || false}
                    onCheckedChange={(checked) => handleChange('is_transferable', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="shareable">Shareable</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow sharing with family or friends
                    </p>
                  </div>
                  <Switch
                    id="shareable"
                    checked={localData.is_shareable || false}
                    onCheckedChange={(checked) => handleChange('is_shareable', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Intake Forms */}
      <IntakeFormsCard serviceId={service.id} />

      {/* Terms & Conditions */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="font-medium">Terms & Conditions</h3>
          </div>
          
          <div>
            <Label htmlFor="terms">Service-Specific Terms</Label>
            <Textarea
              id="terms"
              value={localData.terms_conditions || ""}
              onChange={(e) => handleChange('terms_conditions', e.target.value)}
              placeholder="Add any specific terms, cancellation policies, or important information..."
              rows={4}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              These will be displayed to customers before booking
            </p>
          </div>
        </div>
      </Card>

      {/* Warning for Status Changes */}
      {localData.status === 'archived' && (
        <div className="flex items-start gap-2 p-4 bg-blush-50 dark:bg-blush-50/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-terracotta-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-terracotta-900 dark:text-blush-100">
              Archiving this service
            </p>
            <p className="text-terracotta-800 dark:text-blush-200 mt-1">
              Archived services cannot be booked and won't appear in listings. 
              Existing bookings will remain valid.
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Intake Forms Sub-Component ──────────────────────────────────────────────

function IntakeFormsCard({ serviceId }: { serviceId: number | string }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const numericId = typeof serviceId === 'string' ? parseInt(serviceId) : serviceId

  // Fetch linked forms for this service
  const { data: linkedFormsData, isLoading } = useQuery({
    ...intakeServicesFormsListOptions({ path: { service_pk: numericId } }),
    enabled: !!numericId,
  })
  const linkedForms = (linkedFormsData as any)?.data?.results
    || (linkedFormsData as any)?.results
    || (linkedFormsData as any)?.data
    || linkedFormsData
    || []
  const formsList = Array.isArray(linkedForms) ? linkedForms : []

  // Fetch all practitioner templates (for the "add" dropdown)
  const { data: templatesData } = useQuery({
    ...intakeTemplatesListOptions(),
    enabled: showAdd,
  })
  const allTemplates = (() => {
    const raw = templatesData as any
    const items = raw?.data?.results || raw?.results || raw?.data || raw || []
    return Array.isArray(items) ? items : []
  })()

  // Filter out already-linked templates
  const linkedTemplateIds = new Set(formsList.map((f: any) => f.form_template || f.form_template_detail?.id))
  const availableTemplates = allTemplates.filter((t: any) => !linkedTemplateIds.has(t.id))

  // Mutations
  const attachMutation = useMutation({
    ...intakeServicesFormsCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intakeServicesFormsListOptions({ path: { service_pk: numericId } }).queryKey })
      toast.success("Form linked to service")
      setShowAdd(false)
    },
    onError: () => toast.error("Failed to link form"),
  })

  const detachMutation = useMutation({
    ...intakeServicesFormsDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intakeServicesFormsListOptions({ path: { service_pk: numericId } }).queryKey })
      toast.success("Form removed from service")
    },
    onError: () => toast.error("Failed to remove form"),
  })

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <h3 className="font-medium">Intake Forms</h3>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/practitioner/intake">
              <Button variant="ghost" size="sm" className="text-xs text-olive-500 h-7">
                Manage Templates
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAdd(!showAdd)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Form
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Clients will be asked to complete these forms when they book this service.
        </p>

        {/* Linked Forms List */}
        {isLoading ? (
          <p className="text-sm text-olive-400 py-3">Loading forms...</p>
        ) : formsList.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-sage-200 rounded-xl">
            <ClipboardList className="h-6 w-6 text-sage-300 mx-auto mb-2" />
            <p className="text-sm text-olive-400">No intake forms linked yet</p>
            <p className="text-xs text-olive-300 mt-0.5">Add a form to collect info from clients before their session</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formsList.map((sf: any) => {
              const template = sf.form_template_detail || sf.template || {}
              const formType = template.form_type || 'intake'
              return (
                <div
                  key={sf.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-sage-200/60 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "shrink-0 rounded-lg p-2",
                      formType === 'consent' ? "bg-amber-100" : "bg-sage-100"
                    )}>
                      {formType === 'consent' ? (
                        <Shield className="h-4 w-4 text-amber-600" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-sage-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-olive-900 truncate">
                        {template.title || 'Untitled Form'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4",
                            formType === 'consent'
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sage-100 text-sage-700"
                          )}
                        >
                          {formType === 'consent' ? 'Consent' : 'Intake'}
                        </Badge>
                        {sf.is_required && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-terracotta-100 text-terracotta-700">
                            Required
                          </Badge>
                        )}
                        {template.questions_count > 0 && (
                          <span className="text-[11px] text-olive-400">
                            {template.questions_count} question{template.questions_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 w-7 p-0 text-olive-400 hover:text-terracotta-600 hover:bg-terracotta-50"
                    disabled={detachMutation.isPending}
                    onClick={() => {
                      detachMutation.mutate({
                        path: { service_pk: numericId, id: sf.id },
                      })
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Form Dropdown */}
        {showAdd && (
          <div className="border border-sage-200 rounded-xl p-3 bg-sage-50/30 space-y-2">
            <p className="text-xs font-medium text-olive-600 mb-2">Select a template to link:</p>
            {availableTemplates.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-olive-400">
                  {allTemplates.length === 0 ? 'No templates created yet.' : 'All templates are already linked.'}
                </p>
                <Link href="/dashboard/practitioner/intake">
                  <Button variant="outline" size="sm" className="mt-2 text-xs">
                    {allTemplates.length === 0 ? 'Create a Template' : 'Manage Templates'}
                  </Button>
                </Link>
              </div>
            ) : (
              availableTemplates.map((template: any) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-sage-200/60 bg-white hover:border-sage-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => {
                    attachMutation.mutate({
                      path: { service_pk: numericId },
                      body: { form_template: template.id, is_required: false, service: numericId } as any,
                    })
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "shrink-0 rounded-lg p-1.5",
                      template.form_type === 'consent' ? "bg-amber-100" : "bg-sage-100"
                    )}>
                      {template.form_type === 'consent' ? (
                        <Shield className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <ClipboardList className="h-3.5 w-3.5 text-sage-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-olive-900 truncate">{template.title}</p>
                      <span className="text-[11px] text-olive-400">{template.form_type}</span>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-sage-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  )
}