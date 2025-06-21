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
import { X } from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface BasicInfoSectionProps {
  service: ServiceReadable
  data: {
    name?: string
    title?: string
    description?: string
    short_description?: string
    category_id?: number
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

  // Mock categories - replace with actual API call
  const categories = [
    { id: 1, name: "Yoga" },
    { id: 2, name: "Meditation" },
    { id: 3, name: "Fitness" },
    { id: 4, name: "Therapy" },
    { id: 5, name: "Coaching" },
  ]

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

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category*</Label>
          <Select
            value={localData.category_id?.toString() || ""}
            onValueChange={(value) => handleChange("category_id", parseInt(value))}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              placeholder="Add tags (press Enter)"
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
    </div>
  )
}