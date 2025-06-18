"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { 
  Settings, 
  Calendar as CalendarIcon,
  Users,
  AlertCircle,
  Award,
  FileText,
  Clock
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { ServiceReadable } from "@/src/client/types.gen"

interface AdvancedSectionProps {
  service: ServiceReadable
  data: {
    terms_conditions?: string
    experience_level?: string
    age_min?: number
    age_max?: number
    is_featured?: boolean
    status?: string
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

const serviceStatuses = [
  { value: "draft", label: "Draft - Not visible to customers" },
  { value: "active", label: "Active - Available for booking" },
  { value: "inactive", label: "Inactive - Temporarily unavailable" },
  { value: "archived", label: "Archived - No longer offered" },
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
      {/* Service Status */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h3 className="font-medium">Service Status & Visibility</h3>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="status">Service Status</Label>
              <Select
                value={localData.status || "draft"}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="featured" className="text-base">Featured Service</Label>
                <p className="text-sm text-muted-foreground">
                  Display this service prominently in listings
                </p>
              </div>
              <Switch
                id="featured"
                checked={localData.is_featured || false}
                onCheckedChange={(checked) => handleChange('is_featured', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

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
        <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Archiving this service
            </p>
            <p className="text-amber-800 dark:text-amber-200 mt-1">
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