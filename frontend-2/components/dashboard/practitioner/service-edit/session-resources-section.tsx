"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  serviceResourcesListOptions,
  serviceResourcesCreateMutation,
  serviceResourcesDestroyMutation,
  serviceResourcesPartialUpdateMutation
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
  CheckCircle2,
  Pencil,
  Check
} from "lucide-react"

interface SessionResourcesSectionProps {
  sessionId: number
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
  { value: "completed", label: "Completed - After session completion" },
]

export function SessionResourcesSection({ sessionId }: SessionResourcesSectionProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAddingResource, setIsAddingResource] = useState(false)
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    resource_type: "document",
    access_level: "enrolled",
    external_url: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState({ title: "", description: "", resource_type: "", access_level: "" })

  const listOptions = serviceResourcesListOptions({
    query: { session_id: sessionId.toString() } as any
  })

  // Fetch session resources
  const { data: resourcesData, isLoading } = useQuery(listOptions)

  const resources = resourcesData?.results || []

  const createResourceMutation = useMutation({
    ...serviceResourcesCreateMutation(),
    onSuccess: () => {
      toast({ title: "Success", description: "Resource added successfully" })
      queryClient.invalidateQueries({ queryKey: listOptions.queryKey })
      resetForm()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add resource", variant: "destructive" })
      setIsUploading(false)
    }
  })

  const deleteResourceMutation = useMutation({
    ...serviceResourcesDestroyMutation(),
    onSuccess: () => {
      toast({ title: "Success", description: "Resource deleted" })
      queryClient.invalidateQueries({ queryKey: listOptions.queryKey })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete resource", variant: "destructive" })
    }
  })

  const updateResourceMutation = useMutation({
    ...serviceResourcesPartialUpdateMutation(),
    onSuccess: () => {
      toast({ title: "Success", description: "Resource updated" })
      queryClient.invalidateQueries({ queryKey: listOptions.queryKey })
      setEditingId(null)
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update resource", variant: "destructive" })
    }
  })

  const startEditing = (resource: any) => {
    setEditingId(resource.id)
    setEditData({
      title: resource.title || "",
      description: resource.description || "",
      resource_type: resource.resource_type || "document",
      access_level: resource.access_level || "enrolled",
    })
  }

  const saveEdit = () => {
    if (!editingId || !editData.title) return
    updateResourceMutation.mutate({
      path: { id: editingId },
      body: editData as any,
    })
  }

  const resetForm = () => {
    setNewResource({ title: "", description: "", resource_type: "document", access_level: "enrolled", external_url: "" })
    setSelectedFile(null)
    setIsAddingResource(false)
    setIsUploading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 50MB", variant: "destructive" })
        return
      }
      setSelectedFile(file)
    }
  }

  const addResource = async () => {
    if (!newResource.title) {
      toast({ title: "Error", description: "Please enter a resource title", variant: "destructive" })
      return
    }
    if (newResource.resource_type === 'link' && !newResource.external_url) {
      toast({ title: "Error", description: "Please enter an external URL", variant: "destructive" })
      return
    }
    if (['document', 'audio', 'image'].includes(newResource.resource_type) && !selectedFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" })
      return
    }

    setIsUploading(true)

    try {
      const body: any = {
        title: newResource.title,
        resource_type: newResource.resource_type,
        access_level: newResource.access_level,
        attachment_level: 'session',
        service_session: sessionId,
      }
      if (newResource.description) body.description = newResource.description
      if (newResource.resource_type === 'link') body.external_url = newResource.external_url
      if (selectedFile) body.file = selectedFile

      await createResourceMutation.mutateAsync({ body })
    } catch {
      // Error handled in mutation
    }
  }

  const removeResource = async (id: number) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      await deleteResourceMutation.mutateAsync({ path: { id } })
    }
  }

  const getResourceIcon = (type: string) => {
    const rt = resourceTypes.find(r => r.value === type)
    const Icon = rt?.icon || File
    return <Icon className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {resources.length > 0 ? (
        <div className="space-y-3">
          {resources.map((resource: any) => (
            <Card key={resource.id} className="p-4">
              {editingId === resource.id ? (
                /* ── Inline Edit Mode ── */
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={2} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={editData.resource_type}
                        onValueChange={(v) => setEditData({ ...editData, resource_type: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {resourceTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Access Level</Label>
                      <Select value={editData.access_level}
                        onValueChange={(v) => setEditData({ ...editData, access_level: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {accessLevels.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label.split(' - ')[0]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={saveEdit}
                      disabled={updateResourceMutation.isPending || !editData.title}>
                      {updateResourceMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Read Mode ── */
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="mt-1">{getResourceIcon(resource.resource_type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{resource.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {resourceTypes.find(rt => rt.value === resource.resource_type)?.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {accessLevels.find(l => l.value === resource.access_level)?.label.split(' - ')[0] || resource.access_level}
                        </Badge>
                      </div>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground">{resource.description}</p>
                      )}
                      {resource.external_url && (
                        <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                          <Link2 className="h-3 w-3" />{resource.external_url}
                        </a>
                      )}
                      {resource.file_url && (
                        <div className="flex items-center gap-2">
                          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${resource.file_url}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <Download className="h-3 w-3" />{resource.file_name || 'Download'}
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
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => startEditing(resource)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeResource(resource.id)}
                      disabled={deleteResourceMutation.isPending}>
                      {deleteResourceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : !isAddingResource ? (
        <Card className="p-8 text-center border-dashed">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No resources added yet</p>
        </Card>
      ) : null}

      {isAddingResource ? (
        <Card className="p-4 border-primary">
          <div className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Title*</Label>
                <Input value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Resource title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Brief description" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={newResource.resource_type}
                    onValueChange={(v) => setNewResource({ ...newResource, resource_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {resourceTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">{getResourceIcon(t.value)}{t.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Access Level</Label>
                  <Select value={newResource.access_level}
                    onValueChange={(v) => setNewResource({ ...newResource, access_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {accessLevels.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label.split(' - ')[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newResource.resource_type === 'link' && (
                <div>
                  <Label>External URL*</Label>
                  <Input type="url" value={newResource.external_url}
                    onChange={(e) => setNewResource({ ...newResource, external_url: e.target.value })}
                    placeholder="https://..." />
                </div>
              )}

              {['document', 'audio', 'image'].includes(newResource.resource_type) && (
                <div>
                  <Label>Upload File</Label>
                  {selectedFile ? (
                    <Card className="p-4 border-green-200 bg-green-50">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <label className="flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                        <input type="file" className="hidden" onChange={handleFileChange}
                          accept={newResource.resource_type === 'image' ? 'image/*' :
                            newResource.resource_type === 'audio' ? 'audio/*' :
                              '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt'} />
                        <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
                        <span className="text-sm font-medium">Choose file</span>
                        <span className="text-xs text-muted-foreground mt-1">Up to 50MB</span>
                      </label>
                    </Card>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={addResource}
                disabled={isUploading || createResourceMutation.isPending || !newResource.title ||
                  (newResource.resource_type === 'link' && !newResource.external_url) ||
                  (['document', 'audio', 'image'].includes(newResource.resource_type) && !selectedFile)}>
                {isUploading || createResourceMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</>
                ) : "Add Resource"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setIsAddingResource(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />Add Resource
        </Button>
      )}
    </div>
  )
}
