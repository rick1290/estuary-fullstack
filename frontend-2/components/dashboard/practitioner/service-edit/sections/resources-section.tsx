"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  serviceResourcesListOptions,
  serviceResourcesCreateMutation,
  serviceResourcesDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
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
  ExternalLink,
  Loader2,
  CheckCircle2
} from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface ResourcesSectionProps {
  service: ServiceReadable
}

const resourceTypes = [
  { value: "document", label: "Document", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "link", label: "External Link", icon: ExternalLink },
  { value: "audio", label: "Audio", icon: Download },
  { value: "image", label: "Image", icon: FileText },
]

const accessLevels = [
  { value: "public", label: "Public - Anyone can access" },
  { value: "registered", label: "Registered - Only logged in users" },
  { value: "enrolled", label: "Enrolled - Only those who booked" },
  { value: "completed", label: "Completed - After service completion" },
]

export function ResourcesSection({ service }: ResourcesSectionProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAddingResource, setIsAddingResource] = useState(false)
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    resource_type: "document",
    access_level: "enrolled",
    external_url: "",
    attachment_level: "service",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Fetch service resources
  const { data: resourcesData, isLoading } = useQuery({
    ...serviceResourcesListOptions({
      query: { service_id: service.id.toString() }
    })
  })
  
  const resources = resourcesData?.results || []
  
  // Create resource mutation
  const createResourceMutation = useMutation({
    ...serviceResourcesCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Resource added successfully"
      })
      // Refresh resources list
      queryClient.invalidateQueries({ 
        queryKey: serviceResourcesListOptions({
          query: { service_id: service.id.toString() }
        }).queryKey
      })
      // Reset form
      setNewResource({
        title: "",
        description: "",
        resource_type: "document",
        access_level: "enrolled",
        external_url: "",
        attachment_level: "service",
      })
      setSelectedFile(null)
      setIsAddingResource(false)
      setIsUploading(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add resource",
        variant: "destructive"
      })
      setIsUploading(false)
    }
  })
  
  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    ...serviceResourcesDestroyMutation(),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Resource deleted successfully"
      })
      queryClient.invalidateQueries({ 
        queryKey: serviceResourcesListOptions({
          query: { service_id: service.id.toString() }
        }).queryKey
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resource",
        variant: "destructive"
      })
    }
  })


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 50MB",
          variant: "destructive"
        })
        return
      }
      setSelectedFile(file)
    }
  }
  
  const addResource = async () => {
    if (!newResource.title) {
      toast({
        title: "Error",
        description: "Please enter a resource title",
        variant: "destructive"
      })
      return
    }
    
    if (newResource.resource_type === 'link' && !newResource.external_url) {
      toast({
        title: "Error",
        description: "Please enter an external URL for link resources",
        variant: "destructive"
      })
      return
    }
    
    if ((newResource.resource_type === 'document' || newResource.resource_type === 'audio' || newResource.resource_type === 'image') && !selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      // Prepare the request body - matching the pattern that works in streams/services
      const body: any = {
        title: newResource.title,
        resource_type: newResource.resource_type,
        access_level: newResource.access_level,
        attachment_level: newResource.attachment_level,
        service: service.id,
      }
      
      // Add optional fields
      if (newResource.description) {
        body.description = newResource.description
      }
      
      if (newResource.resource_type === 'link') {
        body.external_url = newResource.external_url
      }
      
      // Add file for uploads - this is the key part that needs to match the working pattern
      if (selectedFile) {
        body.file = selectedFile
      }
      
      console.log('Creating resource with body keys:', Object.keys(body))
      console.log('File being uploaded:', selectedFile?.name)
      
      await createResourceMutation.mutateAsync({
        body: body
      })
    } catch (error) {
      console.error('Resource creation error:', error)
      // Error handled in mutation
    }
  }

  const removeResource = async (id: number) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      await deleteResourceMutation.mutateAsync({
        path: { id }
      })
    }
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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : resources.length > 0 ? (
          <div className="space-y-3">
            {resources.map((resource) => (
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
                      {resource.description && (
                        <p className="text-sm text-muted-foreground">
                          {resource.description}
                        </p>
                      )}
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
                      {resource.file_url && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${resource.file_url}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            {resource.file_name || 'Download'}
                          </a>
                          {resource.file_size && (
                            <span className="text-xs text-muted-foreground">
                              ({(resource.file_size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResource(resource.id)}
                    disabled={deleteResourceMutation.isPending}
                  >
                    {deleteResourceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
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

                {(newResource.resource_type === 'document' || newResource.resource_type === 'audio' || newResource.resource_type === 'image') && (
                  <div>
                    <Label htmlFor="file-upload">Upload File</Label>
                    {selectedFile ? (
                      <Card className="p-4 border-green-200 bg-green-50">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="border-dashed">
                        <label className="flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                          <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept={newResource.resource_type === 'image' ? 'image/*' : 
                                   newResource.resource_type === 'audio' ? 'audio/*' : 
                                   '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt'}
                          />
                          <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
                          <span className="text-sm font-medium">Choose file</span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {newResource.resource_type === 'image' ? 'Images up to 50MB' :
                             newResource.resource_type === 'audio' ? 'Audio files up to 50MB' :
                             'PDF, DOC, or other files up to 50MB'}
                          </span>
                        </label>
                      </Card>
                    )}
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
                      access_level: "enrolled",
                      external_url: "",
                      attachment_level: "service",
                    })
                    setSelectedFile(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={addResource}
                  disabled={isUploading || createResourceMutation.isPending ||
                    !newResource.title || 
                    (newResource.resource_type === 'link' && !newResource.external_url) ||
                    ((newResource.resource_type === 'document' || newResource.resource_type === 'audio' || newResource.resource_type === 'image') && !selectedFile)}
                >
                  {isUploading || createResourceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    "Add Resource"
                  )}
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

    </div>
  )
}