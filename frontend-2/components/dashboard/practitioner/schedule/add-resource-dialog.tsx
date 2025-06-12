"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  LinkIcon,
  FileImage,
  Video,
  FileArchive,
  Paperclip,
  Plus,
  Globe,
  FileCode,
  MessageSquare,
} from "lucide-react"

// Resource type definitions
const resourceTypes = [
  { id: "document", label: "Document", icon: FileText, description: "PDF, DOC, TXT, etc." },
  { id: "image", label: "Image", icon: FileImage, description: "JPG, PNG, GIF, etc." },
  { id: "video", label: "Video", icon: Video, description: "MP4, MOV, etc." },
  { id: "link", label: "External Link", icon: LinkIcon, description: "Website, article, etc." },
  { id: "post", label: "Text Post", icon: MessageSquare, description: "Notes, announcements, etc." },
  { id: "code", label: "Code Snippet", icon: FileCode, description: "Code examples, scripts, etc." },
  { id: "archive", label: "Archive", icon: FileArchive, description: "ZIP, RAR, etc." },
  { id: "other", label: "Other", icon: Paperclip, description: "Any other file type" },
]

interface AddResourceDialogProps {
  onAddResource: (resource: {
    name: string
    type: string
    file?: File | null
    url?: string
    content?: string
    description?: string
    sharedWithClients: boolean
  }) => void
  trigger?: React.ReactNode
}

export default function AddResourceDialog({ onAddResource, trigger }: AddResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const [resourceType, setResourceType] = useState("document")
  const [resource, setResource] = useState({
    name: "",
    description: "",
    file: null as File | null,
    url: "",
    content: "",
    sharedWithClients: true,
  })

  const handleSubmit = () => {
    // Validate based on active tab and resource type
    if (activeTab === "upload" && !resource.file && resourceType !== "post" && resourceType !== "link") {
      return // File required for upload tab except for post and link types
    }
    if (activeTab === "link" && !resource.url) {
      return // URL required for link tab
    }
    if (activeTab === "post" && !resource.content) {
      return // Content required for post tab
    }
    if (!resource.name) {
      return // Name is always required
    }

    onAddResource({
      ...resource,
      type: resourceType,
    })

    // Reset form
    setResource({
      name: "",
      description: "",
      file: null,
      url: "",
      content: "",
      sharedWithClients: true,
    })
    setActiveTab("upload")
    setResourceType("document")
    setOpen(false)
  }

  // Get the icon for the current resource type
  const ResourceTypeIcon = resourceTypes.find((type) => type.id === resourceType)?.icon || Paperclip

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>Upload or create materials to share with your clients.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="resource-name">Resource Name</Label>
            <Input
              id="resource-name"
              placeholder="Enter a name for this resource"
              value={resource.name}
              onChange={(e) => setResource({ ...resource, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-description">Description (Optional)</Label>
            <Textarea
              id="resource-description"
              placeholder="Enter a brief description of this resource"
              value={resource.description}
              onChange={(e) => setResource({ ...resource, description: e.target.value })}
              className="h-20"
            />
          </div>

          <div className="space-y-2">
            <Label>Resource Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {resourceTypes.map((type) => {
                const Icon = type.icon
                return (
                  <Button
                    key={type.id}
                    type="button"
                    variant={resourceType === type.id ? "default" : "outline"}
                    className={`h-auto flex flex-col items-center justify-center py-3 px-2 ${
                      resourceType === type.id ? "border-primary" : ""
                    }`}
                    onClick={() => {
                      setResourceType(type.id)
                      // Set appropriate tab based on resource type
                      if (type.id === "link") {
                        setActiveTab("link")
                      } else if (type.id === "post") {
                        setActiveTab("post")
                      } else {
                        setActiveTab("upload")
                      }
                    }}
                  >
                    <Icon className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resourceTypes.find((type) => type.id === resourceType)?.description}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="upload" disabled={resourceType === "post" || resourceType === "link"}>
                Upload File
              </TabsTrigger>
              <TabsTrigger value="link" disabled={resourceType !== "link" && resourceType !== "video"}>
                External Link
              </TabsTrigger>
              <TabsTrigger value="post" disabled={resourceType !== "post" && resourceType !== "code"}>
                Create Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="border border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <ResourceTypeIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {resourceType === "document" && "PDF, DOC, PPT, XLS, TXT (max 50MB)"}
                  {resourceType === "image" && "JPG, PNG, GIF, SVG (max 20MB)"}
                  {resourceType === "video" && "MP4, MOV, AVI, WEBM (max 500MB)"}
                  {resourceType === "archive" && "ZIP, RAR, 7Z (max 100MB)"}
                  {resourceType === "other" && "Any file type (max 100MB)"}
                </p>
                <input
                  type="file"
                  id="resource-file"
                  className="hidden"
                  onChange={(e) => setResource({ ...resource, file: e.target.files?.[0] || null })}
                  accept={
                    resourceType === "document"
                      ? ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                      : resourceType === "image"
                        ? ".jpg,.jpeg,.png,.gif,.svg"
                        : resourceType === "video"
                          ? ".mp4,.mov,.avi,.webm"
                          : resourceType === "archive"
                            ? ".zip,.rar,.7z"
                            : undefined
                  }
                />
              </div>
              {resource.file && (
                <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <ResourceTypeIcon className="h-4 w-4" />
                    <span className="text-sm truncate">{resource.file.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setResource({ ...resource, file: null })}>
                    Remove
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="resource-url">URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Globe className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="resource-url"
                      placeholder="https://example.com/resource"
                      value={resource.url}
                      onChange={(e) => setResource({ ...resource, url: e.target.value })}
                      className="pl-8"
                    />
                  </div>
                  {resource.url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(resource.url, "_blank")}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {resourceType === "link"
                    ? "Enter a URL to a website, article, or other online resource"
                    : "Enter a URL to a video (YouTube, Vimeo, etc.)"}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="post" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="resource-content">Content</Label>
                <Textarea
                  id="resource-content"
                  placeholder={
                    resourceType === "post" ? "Enter your post content here..." : "Enter your code snippet here..."
                  }
                  value={resource.content}
                  onChange={(e) => setResource({ ...resource, content: e.target.value })}
                  className="min-h-[200px] font-mono"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center space-x-2 mt-4">
            <input
              type="checkbox"
              id="share-with-clients"
              checked={resource.sharedWithClients}
              onChange={(e) => setResource({ ...resource, sharedWithClients: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="share-with-clients">Share with clients</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !resource.name ||
              (activeTab === "upload" && !resource.file && resourceType !== "post" && resourceType !== "link") ||
              (activeTab === "link" && !resource.url) ||
              (activeTab === "post" && !resource.content)
            }
          >
            Add Resource
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
