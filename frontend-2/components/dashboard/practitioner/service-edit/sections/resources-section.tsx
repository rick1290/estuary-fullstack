"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, 
  Link2, 
  Download, 
  Plus, 
  X,
  Upload,
  Video,
  File,
  ExternalLink
} from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface ResourcesSectionProps {
  service: ServiceReadable
  data: {
    resources?: Array<{
      id: string
      title: string
      description: string
      resource_type: string
      file_url?: string
      external_url?: string
      access_level: string
    }>
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

const resourceTypes = [
  { value: "document", label: "Document", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "link", label: "External Link", icon: ExternalLink },
  { value: "download", label: "Downloadable File", icon: Download },
]

const accessLevels = [
  { value: "public", label: "Public - Anyone can access" },
  { value: "registered", label: "Registered - Only logged in users" },
  { value: "participants", label: "Participants - Only those who booked" },
]

export function ResourcesSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: ResourcesSectionProps) {
  const [localData, setLocalData] = useState(data)
  const [isAddingResource, setIsAddingResource] = useState(false)
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    resource_type: "document",
    access_level: "participants",
    external_url: "",
  })

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const addResource = () => {
    if (newResource.title && (newResource.external_url || newResource.resource_type !== 'link')) {
      const currentResources = localData.resources || []
      const resource = {
        id: Date.now().toString(),
        ...newResource,
      }
      handleChange('resources', [...currentResources, resource])
      setNewResource({
        title: "",
        description: "",
        resource_type: "document",
        access_level: "participants",
        external_url: "",
      })
      setIsAddingResource(false)
    }
  }

  const removeResource = (id: string) => {
    const currentResources = localData.resources || []
    handleChange('resources', currentResources.filter(r => r.id !== id))
  }

  const getResourceIcon = (type: string) => {
    const resourceType = resourceTypes.find(rt => rt.value === type)
    const Icon = resourceType?.icon || File
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Resources List */}
      <div className="space-y-4">
        <div>
          <Label>Service Resources</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Add helpful materials, guides, or links for participants
          </p>
        </div>

        {(localData.resources || []).length > 0 ? (
          <div className="space-y-3">
            {localData.resources?.map((resource) => (
              <Card key={resource.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="mt-1">
                      {getResourceIcon(resource.resource_type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{resource.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {resourceTypes.find(rt => rt.value === resource.resource_type)?.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {accessLevels.find(al => al.value === resource.access_level)?.label.split(' - ')[0]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                      {resource.external_url && (
                        <a 
                          href={resource.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Link2 className="h-3 w-3" />
                          {resource.external_url}
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResource(resource.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No resources added yet
            </p>
          </Card>
        )}

        {/* Add Resource Form */}
        {isAddingResource ? (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="resource-title">Title*</Label>
                  <Input
                    id="resource-title"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Resource title"
                  />
                </div>

                <div>
                  <Label htmlFor="resource-description">Description</Label>
                  <Textarea
                    id="resource-description"
                    value={newResource.description}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                    placeholder="Brief description of this resource"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resource-type">Type</Label>
                    <Select
                      value={newResource.resource_type}
                      onValueChange={(value) => setNewResource({ ...newResource, resource_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {getResourceIcon(type.value)}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="access-level">Access Level</Label>
                    <Select
                      value={newResource.access_level}
                      onValueChange={(value) => setNewResource({ ...newResource, access_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accessLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label.split(' - ')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newResource.resource_type === 'link' && (
                  <div>
                    <Label htmlFor="external-url">External URL*</Label>
                    <Input
                      id="external-url"
                      type="url"
                      value={newResource.external_url}
                      onChange={(e) => setNewResource({ ...newResource, external_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}

                {(newResource.resource_type === 'document' || newResource.resource_type === 'download') && (
                  <div>
                    <Label htmlFor="file-upload">Upload File</Label>
                    <Card className="border-dashed">
                      <label className="flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            // Handle file upload
                            console.log('File upload:', e.target.files?.[0])
                          }}
                        />
                        <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
                        <span className="text-sm font-medium">Choose file</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, or other files up to 50MB
                        </span>
                      </label>
                    </Card>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingResource(false)
                    setNewResource({
                      title: "",
                      description: "",
                      resource_type: "document",
                      access_level: "participants",
                      external_url: "",
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={addResource}
                  disabled={!newResource.title || (newResource.resource_type === 'link' && !newResource.external_url)}
                >
                  Add Resource
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddingResource(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        )}
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