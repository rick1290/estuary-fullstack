"use client"

import { useState, useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuidv4 } from 'uuid'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Video, 
  FileAudio, 
  Download,
  Link,
  Upload,
  Trash2,
  Eye,
  Lock,
  Globe,
  Users,
  AlertCircle,
  File,
  ExternalLink,
  Plus,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { serviceResourcesCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import type { ServiceResourceRequest } from "@/src/client/types.gen"
import { AuthService } from "@/lib/auth-service"

interface Resource {
  id: string
  title: string
  description: string
  resource_type: 'document' | 'video' | 'audio' | 'link' | 'other'
  file_url?: string
  external_url?: string
  file_name?: string
  file_size?: number
  access_level: 'public' | 'registered' | 'customers' | 'private'
  is_downloadable?: boolean
  attachment_level?: 'preview' | 'included' | 'bonus'
  order?: number
}

interface UploadState {
  isUploading: boolean
  progress: number
  error?: string
}

const resourceTypeIcons = {
  document: FileText,
  video: Video,
  audio: FileAudio,
  link: ExternalLink,
  other: File
}

const accessLevelInfo = {
  public: { label: "Public", icon: Globe, description: "Anyone can access" },
  registered: { label: "Registered Users", icon: Users, description: "Any logged-in user" },
  customers: { label: "Customers Only", icon: Lock, description: "Only who purchased this service" },
  private: { label: "Private", icon: Eye, description: "Only you can see" }
}

interface ResourcesStepProps {
  serviceId?: string
  servicePublicUuid?: string
}

export function ResourcesStep({ serviceId, servicePublicUuid }: ResourcesStepProps = {}) {
  const { formState, updateFormField } = useServiceForm()
  const { toast } = useToast()
  const [resources, setResources] = useState<Resource[]>(formState.resources || [])
  const [activeTab, setActiveTab] = useState("list")
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({})
  
  // Form state for new/edit resource
  const [editingResource, setEditingResource] = useState<Partial<Resource>>({
    title: "",
    description: "",
    resource_type: "document",
    access_level: "customers",
    is_downloadable: true,
    attachment_level: "included"
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  const updateResources = (newResources: Resource[]) => {
    setResources(newResources)
    updateFormField("resources", newResources)
  }

  const handleFileUpload = useCallback(async (file: File, resourceId: string) => {
    setUploadStates(prev => ({
      ...prev,
      [resourceId]: { isUploading: true, progress: 0 }
    }))

    // Simulate upload progress for UX
    const progressInterval = setInterval(() => {
      setUploadStates(prev => ({
        ...prev,
        [resourceId]: {
          ...prev[resourceId],
          progress: Math.min((prev[resourceId]?.progress || 0) + 10, 90)
        }
      }))
    }, 300)

    try {
      // Get the access token
      const token = AuthService.getAccessToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Step 1: Request pre-signed upload URL from backend
      const presignedFormData = new FormData()
      presignedFormData.append('filename', file.name)
      presignedFormData.append('content_type', file.type || 'application/octet-stream')
      presignedFormData.append('file_size', file.size.toString())
      presignedFormData.append('entity_type', 'service')
      // Use the service's public UUID for media association
      // If no public UUID yet (new service), generate a temporary one
      const entityId = servicePublicUuid || uuidv4()
      presignedFormData.append('entity_id', entityId)
      
      const uploadUrlResponse = await fetch(`${apiUrl}/api/v1/media/presigned_upload/`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: presignedFormData,
        credentials: 'include',
      })
      
      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json()
        throw new Error(error.detail || error.message || 'Failed to get upload URL')
      }
      
      const uploadData = await uploadUrlResponse.json()
      
      // Handle wrapped response if needed
      const responseData = uploadData.data || uploadData
      const { upload_url, upload_headers, media_id, storage_key, expires_at } = responseData
      const upload_id = media_id || responseData.upload_id
      
      // Step 2: Upload file directly to R2 using pre-signed URL
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          ...(upload_headers || {}),
        },
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage')
      }
      
      // Step 3: Confirm upload completion with backend
      const confirmUrl = `${apiUrl}/api/v1/media/${upload_id}/confirm_upload/`
      const confirmFormData = new FormData()
      confirmFormData.append('file_size', file.size.toString())
      
      const completeResponse = await fetch(confirmUrl, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: confirmFormData,
        credentials: 'include',
      })
      
      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(error.detail || error.message || 'Failed to complete upload')
      }
      
      clearInterval(progressInterval)
      setUploadStates(prev => ({
        ...prev,
        [resourceId]: { isUploading: false, progress: 100 }
      }))
      
      // Step 4: Get the final file URL from R2
      // The complete response should include the public URL
      const completeData = await completeResponse.json()
      const fileUrl = completeData.url || `${apiUrl}/api/v1/media/${upload_id}`
      
      // Update resource with file info
      if (editingId === resourceId) {
        setEditingResource(prev => ({
          ...prev,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size
        }))
      }
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded to cloud storage.`
      })
      
      return {
        url: fileUrl,
        filename: file.name,
        file_size: file.size,
        upload_id
      }
    } catch (error: any) {
      clearInterval(progressInterval)
      setUploadStates(prev => ({
        ...prev,
        [resourceId]: { isUploading: false, progress: 0, error: error.message || "Upload failed" }
      }))
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }, [editingId, formState.id, toast])

  const handleAddResource = () => {
    if (!editingResource.title?.trim()) return

    const newResource: Resource = {
      id: editingId || Date.now().toString(),
      title: editingResource.title,
      description: editingResource.description || "",
      resource_type: editingResource.resource_type || "document",
      file_url: editingResource.file_url,
      external_url: editingResource.external_url,
      file_name: editingResource.file_name,
      file_size: editingResource.file_size,
      access_level: editingResource.access_level || "customers",
      is_downloadable: editingResource.is_downloadable ?? true,
      attachment_level: editingResource.attachment_level || "included",
      order: editingId ? resources.find(r => r.id === editingId)?.order : resources.length
    }

    let updated = [...resources]
    if (editingId) {
      updated = updated.map(r => r.id === editingId ? newResource : r)
    } else {
      updated.push(newResource)
    }

    updateResources(updated)
    resetForm()
    setActiveTab("list")
  }

  const handleEditResource = (resource: Resource) => {
    setEditingResource({
      title: resource.title,
      description: resource.description,
      resource_type: resource.resource_type,
      file_url: resource.file_url,
      external_url: resource.external_url,
      file_name: resource.file_name,
      file_size: resource.file_size,
      access_level: resource.access_level,
      is_downloadable: resource.is_downloadable,
      attachment_level: resource.attachment_level
    })
    setEditingId(resource.id)
    setActiveTab("add")
  }

  const handleRemoveResource = (id: string) => {
    const updated = resources.filter(r => r.id !== id)
    // Reorder
    updated.forEach((resource, index) => {
      resource.order = index
    })
    updateResources(updated)
  }

  const resetForm = () => {
    setEditingResource({
      title: "",
      description: "",
      resource_type: "document",
      access_level: "customers",
      is_downloadable: true,
      attachment_level: "included"
    })
    setEditingId(null)
  }

  const moveResource = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= resources.length) return

    const updated = [...resources]
    const [movedResource] = updated.splice(index, 1)
    updated.splice(newIndex, 0, movedResource)
    
    // Update order
    updated.forEach((resource, i) => {
      resource.order = i
    })
    updateResources(updated)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getAcceptedFileTypes = (resourceType?: string) => {
    switch (resourceType) {
      case 'document':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf'
      case 'video':
        return '.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm'
      case 'audio':
        return '.mp3,.wav,.ogg,.m4a,.aac,.flac'
      case 'link':
        return '' // No file upload for links
      default:
        return '*' // Accept all files for 'other'
    }
  }

  const getMediaTypeFromMimeType = (mimeType?: string) => {
    if (!mimeType) return 'document'
    
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'document'
    if (mimeType.includes('document') || mimeType.includes('text')) return 'document'
    
    return 'document' // Default to document
  }

  const resourcesByType = resources.reduce((acc, resource) => {
    const type = resource.resource_type
    if (!acc[type]) acc[type] = []
    acc[type].push(resource)
    return acc
  }, {} as Record<string, Resource[]>)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Resources</h2>
        <p className="text-muted-foreground">
          Add downloadable files, videos, documents, and links that customers can access after purchasing your service.
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(resourceTypeIcons).map(([type, Icon]) => {
              const count = resourcesByType[type]?.length || 0
              return (
                <div key={type} className="text-center">
                  <div className="p-3 bg-muted rounded-lg inline-block mb-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-semibold">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{type}s</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">
            Resources ({resources.length})
          </TabsTrigger>
          <TabsTrigger value="add">
            {editingId ? "Edit Resource" : "Add Resource"}
          </TabsTrigger>
        </TabsList>

        {/* Resources List */}
        <TabsContent value="list" className="space-y-4">
          {resources.length > 0 ? (
            <div className="space-y-4">
              {resources.map((resource, index) => {
                const Icon = resourceTypeIcons[resource.resource_type]
                const accessInfo = accessLevelInfo[resource.access_level]
                const uploadState = uploadStates[resource.id]

                return (
                  <Card key={resource.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{resource.title}</CardTitle>
                            {resource.description && (
                              <CardDescription className="mt-1">
                                {resource.description}
                              </CardDescription>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <accessInfo.icon className="mr-1 h-3 w-3" />
                                {accessInfo.label}
                              </Badge>
                              {resource.attachment_level && (
                                <Badge variant="outline" className="text-xs">
                                  {resource.attachment_level}
                                </Badge>
                              )}
                              {resource.is_downloadable && (
                                <Badge variant="outline" className="text-xs">
                                  <Download className="mr-1 h-3 w-3" />
                                  Downloadable
                                </Badge>
                              )}
                              {resource.file_size && (
                                <Badge variant="outline" className="text-xs">
                                  {formatFileSize(resource.file_size)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveResource(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveResource(index, 'down')}
                            disabled={index === resources.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditResource(resource)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveResource(resource.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {uploadState?.isUploading && (
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Uploading...</span>
                            <span>{uploadState.progress}%</span>
                          </div>
                          <Progress value={uploadState.progress} className="h-2" />
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Resources Added</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add resources to enhance your service offering
                </p>
                <Button 
                  type="button" 
                  onClick={() => setActiveTab("add")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Resource
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Add/Edit Resource Form */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit Resource" : "Add New Resource"}</CardTitle>
              <CardDescription>
                Upload files or add links to external resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resource Type */}
              <div className="space-y-2">
                <Label htmlFor="resource-type">Resource Type</Label>
                <Select
                  value={editingResource.resource_type}
                  onValueChange={(value: Resource['resource_type']) => 
                    setEditingResource({ ...editingResource, resource_type: value })
                  }
                >
                  <SelectTrigger id="resource-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Document (PDF, DOC, etc.)
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video
                      </div>
                    </SelectItem>
                    <SelectItem value="audio">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4" />
                        Audio
                      </div>
                    </SelectItem>
                    <SelectItem value="link">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        External Link
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4" />
                        Other
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <Label htmlFor="resource-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="resource-title"
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  placeholder="e.g., Course Workbook, Meditation Guide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource-description">Description</Label>
                <Textarea
                  id="resource-description"
                  value={editingResource.description}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  placeholder="Brief description of this resource..."
                  rows={2}
                />
              </div>

              {/* File Upload or URL */}
              {editingResource.resource_type === 'link' ? (
                <div className="space-y-2">
                  <Label htmlFor="external-url">External URL</Label>
                  <Input
                    id="external-url"
                    type="url"
                    value={editingResource.external_url || ""}
                    onChange={(e) => setEditingResource({ ...editingResource, external_url: e.target.value })}
                    placeholder="https://example.com/resource"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>File Upload</Label>
                  {editingResource.file_url ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{editingResource.file_name}</span>
                        {editingResource.file_size && (
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(editingResource.file_size)}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingResource({ 
                          ...editingResource, 
                          file_url: undefined,
                          file_name: undefined,
                          file_size: undefined
                        })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Input
                        id={`file-upload-${editingId || 'new'}`}
                        type="file"
                        className="hidden"
                        accept={getAcceptedFileTypes(editingResource.resource_type)}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            // Validate file size (100MB max)
                            if (file.size > 100 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Maximum file size is 100MB",
                                variant: "destructive"
                              })
                              return
                            }
                            handleFileUpload(file, editingId || 'new')
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById(`file-upload-${editingId || 'new'}`)?.click()}
                        disabled={uploadStates[editingId || 'new']?.isUploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadStates[editingId || 'new']?.isUploading ? "Uploading..." : "Upload File"}
                      </Button>
                      {uploadStates[editingId || 'new']?.error && (
                        <p className="text-sm text-destructive mt-2">
                          {uploadStates[editingId || 'new']?.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Access Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="access-level">Access Level</Label>
                  <Select
                    value={editingResource.access_level}
                    onValueChange={(value: Resource['access_level']) => 
                      setEditingResource({ ...editingResource, access_level: value })
                    }
                  >
                    <SelectTrigger id="access-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accessLevelInfo).map(([value, info]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <info.icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{info.label}</div>
                              <div className="text-xs text-muted-foreground">{info.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachment-level">Attachment Level</Label>
                  <Select
                    value={editingResource.attachment_level}
                    onValueChange={(value) => 
                      setEditingResource({ ...editingResource, attachment_level: value })
                    }
                  >
                    <SelectTrigger id="attachment-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preview">Preview (Before purchase)</SelectItem>
                      <SelectItem value="included">Included (With purchase)</SelectItem>
                      <SelectItem value="bonus">Bonus (Extra value)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Download Option */}
              {editingResource.resource_type !== 'link' && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="is-downloadable" className="text-sm font-medium">
                      Allow Download
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Users can download this file to their device
                    </p>
                  </div>
                  <Switch
                    id="is-downloadable"
                    checked={editingResource.is_downloadable}
                    onCheckedChange={(checked) => 
                      setEditingResource({ ...editingResource, is_downloadable: checked })
                    }
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleAddResource}
                  disabled={!editingResource.title?.trim() || 
                    (editingResource.resource_type === 'link' ? !editingResource.external_url : false)
                  }
                >
                  {editingId ? "Update Resource" : "Add Resource"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setActiveTab("list")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Resource Management Tips:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Files are securely uploaded to Cloudflare R2 storage</li>
            <li>• Maximum file size: 100MB per file</li>
            <li>• Supported formats: PDF, DOC, MP4, MP3, JPG, PNG, and more</li>
            <li>• Set appropriate access levels (preview materials can attract buyers)</li>
            <li>• Organize resources in logical order for the best learning experience</li>
            <li>• Resources will be available to customers based on access level settings</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}