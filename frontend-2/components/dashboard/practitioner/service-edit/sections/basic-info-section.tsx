"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Tag } from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"
import { useQuery } from "@tanstack/react-query"
import {
  modalitiesListOptions,
  practitionerCategoriesListOptions
} from "@/src/client/@tanstack/react-query.gen"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CompactCategoryManager from "../../categories/compact-category-manager"

interface BasicInfoSectionProps {
  service: ServiceReadable
  data: {
    name?: string
    title?: string
    description?: string
    short_description?: string
    modality_ids?: number[]
    practitioner_category_id?: number
    tags?: string[]
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function BasicInfoSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: BasicInfoSectionProps) {
  const [localData, setLocalData] = useState(data)
  const [tagInput, setTagInput] = useState("")
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)

  // Fetch modalities and practitioner categories
  const { data: modalities } = useQuery({
    ...modalitiesListOptions({}),
  })

  const { data: practitionerCategories, refetch: refetchPractitionerCategories } = useQuery({
    ...practitionerCategoriesListOptions({}),
  })

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = localData.tags || []
      if (!currentTags.includes(tagInput.trim())) {
        handleChange("tags", [...currentTags, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = localData.tags || []
    handleChange("tags", currentTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Service Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Service Name*</Label>
          <Input
            id="name"
            value={localData.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g., Morning Yoga Flow"
            className="max-w-2xl"
          />
          <p className="text-sm text-muted-foreground">
            This is how your service will appear in listings
          </p>
        </div>

        {/* Short Description */}
        <div className="space-y-2">
          <Label htmlFor="short_description">Short Description</Label>
          <Textarea
            id="short_description"
            value={localData.short_description || ""}
            onChange={(e) => handleChange("short_description", e.target.value)}
            placeholder="A brief summary of your service (max 160 characters)"
            maxLength={160}
            rows={2}
            className="max-w-2xl"
          />
          <p className="text-sm text-muted-foreground">
            {localData.short_description?.length || 0}/160 characters
          </p>
        </div>

        {/* Full Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Full Description*</Label>
          <Textarea
            id="description"
            value={localData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Provide a detailed description of your service"
            rows={6}
            className="max-w-2xl"
          />
          <p className="text-sm text-muted-foreground">
            Be specific about what participants can expect
          </p>
        </div>

        {/* Modality */}
        <div className="space-y-2">
          <Label htmlFor="modality" className="flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            Modality
          </Label>
          <Select
            value={localData.modality_ids?.[0]?.toString() || "none"}
            onValueChange={(value) => handleChange("modality_ids", value === "none" ? [] : [parseInt(value)])}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a modality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No modality</SelectItem>
              {modalities?.results?.map((modality) => (
                <SelectItem key={modality.id} value={modality.id.toString()}>
                  {modality.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            The primary practice modality for this service (e.g., Yoga, Meditation)
          </p>
        </div>

        {/* Practitioner Category */}
        <div className="space-y-2">
          <div className="flex items-center justify-between max-w-md">
            <Label htmlFor="practitioner_category" className="flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Your Category (Optional)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCategoryDialog(true)}
              className="text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </div>
          <Select
            value={localData.practitioner_category_id?.toString() || "none"}
            onValueChange={(value) => handleChange("practitioner_category_id", value === "none" ? undefined : parseInt(value))}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select your category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {practitionerCategories?.results?.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color || '#9CAF88' }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Your personal categories help you organize your services
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2 max-w-md">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="e.g., beginner-friendly, stress-relief"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
            >
              Add
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add keywords to help clients find your service. Examples: relaxation, weight-loss, anxiety, couples, prenatal
          </p>
          {localData.tags && localData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {localData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="pl-2">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(open) => {
        setShowCategoryDialog(open)
        // Refetch practitioner categories when dialog closes
        if (!open) {
          refetchPractitionerCategories()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Your Categories</DialogTitle>
            <DialogDescription>
              Create and organize your personal service categories
            </DialogDescription>
          </DialogHeader>
          <CompactCategoryManager onCategoryChange={() => {
            refetchPractitionerCategories()
          }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}