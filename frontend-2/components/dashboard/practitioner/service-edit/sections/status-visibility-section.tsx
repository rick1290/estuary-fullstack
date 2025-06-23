"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, AlertCircle, Sparkles, Globe, FileText, Archive, Power } from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface StatusVisibilitySectionProps {
  service: ServiceReadable
  data: {
    status?: string
    is_featured?: boolean
    is_active?: boolean
    is_public?: boolean
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

const statusOptions = [
  { 
    value: "draft", 
    label: "Draft", 
    description: "Not visible to customers",
    icon: FileText,
    color: "bg-gray-100 text-gray-700"
  },
  { 
    value: "active", 
    label: "Active", 
    description: "Visible and bookable",
    icon: Power,
    color: "bg-green-100 text-green-700"
  },
  { 
    value: "inactive", 
    label: "Inactive", 
    description: "Visible but not bookable",
    icon: EyeOff,
    color: "bg-yellow-100 text-yellow-700"
  },
  { 
    value: "archived", 
    label: "Archived", 
    description: "Hidden from all views",
    icon: Archive,
    color: "bg-red-100 text-red-700"
  },
]

export function StatusVisibilitySection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: StatusVisibilitySectionProps) {
  const [localData, setLocalData] = useState(data)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    
    // Auto-update related fields based on status
    if (field === 'status') {
      if (value === 'active') {
        newData.is_active = true
        newData.is_public = true
      } else if (value === 'draft' || value === 'archived') {
        newData.is_active = false
        newData.is_public = false
      } else if (value === 'inactive') {
        newData.is_active = false
        newData.is_public = true
      }
    }
    
    setLocalData(newData)
    onChange(newData)
  }

  const currentStatus = statusOptions.find(s => s.value === localData.status) || statusOptions[0]

  return (
    <div className="space-y-6">
      {/* Status Alert based on current status */}
      {localData.status === 'draft' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Service is in Draft Mode</AlertTitle>
          <AlertDescription>
            This service is not visible to customers. When you're ready, change the status to "Active" to make it available for booking.
          </AlertDescription>
        </Alert>
      )}
      
      {localData.status === 'inactive' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <EyeOff className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">Service is Inactive</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Customers can see this service but cannot book it. This is useful for services that are temporarily unavailable.
          </AlertDescription>
        </Alert>
      )}
      
      {localData.status === 'archived' && (
        <Alert className="border-red-200 bg-red-50">
          <Archive className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900">Service is Archived</AlertTitle>
          <AlertDescription className="text-red-700">
            This service is completely hidden from customers and cannot be booked. You can restore it by changing the status.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Service Status */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="status" className="text-base font-semibold flex items-center gap-2">
              <currentStatus.icon className="h-4 w-4" />
              Service Status
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Control how your service appears to customers
            </p>
          </div>
          
          <div className="grid gap-3">
            {statusOptions.map((option) => {
              const Icon = option.icon
              const isSelected = localData.status === option.value
              
              return (
                <div
                  key={option.value}
                  className={`relative flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleChange("status", option.value)}
                >
                  <div className="flex h-5 items-center">
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) => handleChange("status", e.target.value)}
                      className="h-4 w-4 text-primary"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{option.label}</span>
                      <Badge variant="secondary" className={`text-xs ${option.color}`}>
                        {option.value}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Featured Service */}
        <div className="border rounded-lg p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="featured" className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Featured Service
              </Label>
              <p className="text-sm text-muted-foreground">
                Featured services appear prominently in search results and on your profile
              </p>
            </div>
            <Switch
              id="featured"
              checked={localData.is_featured || false}
              onCheckedChange={(checked) => handleChange("is_featured", checked)}
              disabled={localData.status === 'draft' || localData.status === 'archived'}
            />
          </div>
          {(localData.status === 'draft' || localData.status === 'archived') && (
            <p className="text-xs text-amber-700 mt-2">
              Service must be active or inactive to be featured
            </p>
          )}
        </div>

        {/* Visibility Summary */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Visibility Summary
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${localData.is_public ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>
                {localData.is_public ? 'Visible in marketplace' : 'Hidden from marketplace'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${localData.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>
                {localData.is_active ? 'Available for booking' : 'Not available for booking'}
              </span>
            </div>
            {localData.is_featured && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Featured in search results</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Status & Visibility"}
          </Button>
        </div>
      )}
    </div>
  )
}