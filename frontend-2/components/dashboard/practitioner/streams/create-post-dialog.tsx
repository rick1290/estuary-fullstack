"use client"

import type React from "react"

import { useState } from "react"
import { format } from "date-fns"
import {
  Upload, X, Tag, FileText, Video, Headphones, ImageIcon,
  Images, LinkIcon, BarChart3, CalendarIcon, Plus, Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import type { CreatePostFormData, PostType } from "@/types/stream-management"

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "post", label: "Text", icon: FileText, description: "Rich text post" },
  { value: "video", label: "Video", icon: Video, description: "Video content" },
  { value: "audio", label: "Audio", icon: Headphones, description: "Audio/podcast" },
  { value: "image", label: "Image", icon: ImageIcon, description: "Single image" },
  { value: "gallery", label: "Gallery", icon: Images, description: "Multiple images" },
  { value: "link", label: "Link", icon: LinkIcon, description: "External link" },
  { value: "poll", label: "Poll", icon: BarChart3, description: "Interactive poll" },
]

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePost: (postData: CreatePostFormData) => void
  streamId?: string | number
}

export default function CreatePostDialog({ open, onOpenChange, onCreatePost, streamId }: CreatePostDialogProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<CreatePostFormData>({
    title: "",
    content: "",
    post_type: "post",
    tier: "free",
    mediaFiles: [],
    attachments: [],
    tags: [],
    status: "published",
    pollOptions: ["", ""],
  })
  const [mediaCaptions, setMediaCaptions] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>()
  const [scheduledTime, setScheduledTime] = useState("12:00")
  const [linkedServiceId, setLinkedServiceId] = useState<string | undefined>()

  // Fetch practitioner's services for the service picker
  const { data: servicesData } = useQuery({
    queryKey: ['practitioner-services-for-post', user?.practitionerId],
    queryFn: async () => {
      if (!user?.practitionerId) return { results: [] }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/v1/services/?practitioner=${user.practitionerId}&is_active=true`, {
        credentials: 'include',
      })
      if (!response.ok) return { results: [] }
      return response.json()
    },
    enabled: open && !!user?.practitionerId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const postData = {
        ...formData,
        streamId,
        mediaCaptions,
        linkedServiceId: linkedServiceId ? parseInt(linkedServiceId) : undefined,
        scheduledAt: formData.status === "scheduled" && scheduledDate
          ? `${format(scheduledDate, "yyyy-MM-dd")}T${scheduledTime}:00`
          : undefined,
      }

      onCreatePost(postData)

      // Reset form
      setFormData({
        title: "",
        content: "",
        post_type: "post",
        tier: "free",
        mediaFiles: [],
        attachments: [],
        tags: [],
        status: "published",
        pollOptions: ["", ""],
      })
      setMediaCaptions([])
      setScheduledDate(undefined)
      setScheduledTime("12:00")
      setLinkedServiceId(undefined)
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData((prev) => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files],
    }))
    setMediaCaptions((prev) => [...prev, ...new Array(files.length).fill('')])
  }

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }))
  }

  const removeMediaFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
    }))
    setMediaCaptions((prev) => prev.filter((_, i) => i !== index))
  }

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  const addPollOption = () => {
    setFormData((prev) => ({
      ...prev,
      pollOptions: [...(prev.pollOptions || []), ""],
    }))
  }

  const updatePollOption = (index: number, value: string) => {
    setFormData((prev) => {
      const options = [...(prev.pollOptions || [])]
      options[index] = value
      return { ...prev, pollOptions: options }
    })
  }

  const removePollOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pollOptions: (prev.pollOptions || []).filter((_, i) => i !== index),
    }))
  }

  const selectedType = POST_TYPES.find(t => t.value === formData.post_type)

  // Determine which media accept type to use
  const mediaAccept = formData.post_type === "video"
    ? "video/*"
    : formData.post_type === "audio"
    ? "audio/*"
    : formData.post_type === "image" || formData.post_type === "gallery"
    ? "image/*"
    : "image/*,video/*"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Stream Post</DialogTitle>
          <DialogDescription>
            Share content with your subscribers. Choose the appropriate tier to control access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Type Selector */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {POST_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = formData.post_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, post_type: type.value }))}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center",
                      isSelected
                        ? "border-sage-500 bg-sage-50 text-sage-800"
                        : "border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium leading-tight">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter post title..."
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Write your post content..."
              rows={4}
              required
            />
          </div>

          {/* Link URL (for link type) */}
          {formData.post_type === "link" && (
            <div className="space-y-2">
              <Label htmlFor="link-url">Link URL *</Label>
              <Input
                id="link-url"
                type="url"
                value={formData.linkUrl || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* Poll Options (for poll type) */}
          {formData.post_type === "poll" && (
            <div className="space-y-2">
              <Label>Poll Options</Label>
              <div className="space-y-2">
                {(formData.pollOptions || []).map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {(formData.pollOptions || []).length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePollOption(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {(formData.pollOptions || []).length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPollOption}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tier Selection */}
          <div className="space-y-2">
            <Label>Access Tier *</Label>
            <Select
              value={formData.tier}
              onValueChange={(value: "free" | "entry" | "premium") => setFormData((prev) => ({ ...prev, tier: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free - Visible to everyone</SelectItem>
                <SelectItem value="entry">Entry - Entry tier subscribers and above</SelectItem>
                <SelectItem value="premium">Premium - Premium tier subscribers only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Media Upload (not for poll or link types) */}
          {formData.post_type !== "poll" && formData.post_type !== "link" && (
            <div className="space-y-2">
              <Label>Media Files</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <div className="mt-4">
                    <Label htmlFor="media-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-primary hover:text-primary/80">
                        Upload {selectedType?.label.toLowerCase() || "media"} files
                      </span>
                      <Input
                        id="media-upload"
                        type="file"
                        multiple={formData.post_type === "gallery"}
                        accept={mediaAccept}
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.post_type === "video" ? "MP4, MOV up to 100MB" :
                       formData.post_type === "audio" ? "MP3, WAV, M4A up to 50MB" :
                       "PNG, JPG, GIF up to 10MB each"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Media Preview */}
              {formData.mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  {formData.mediaFiles.map((file, index) => {
                    const isImage = file.type.startsWith('image/')
                    const objectUrl = isImage ? URL.createObjectURL(file) : null

                    return (
                      <div key={index} className="space-y-2">
                        <div className="relative">
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                            {isImage && objectUrl ? (
                              <img
                                src={objectUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                onLoad={() => URL.revokeObjectURL(objectUrl)}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full p-2">
                                <div className="text-center">
                                  <div className="text-xs font-medium truncate">{file.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeMediaFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Add caption..."
                          value={mediaCaptions[index] || ''}
                          onChange={(e) => {
                            const newCaptions = [...mediaCaptions]
                            newCaptions[index] = e.target.value
                            setMediaCaptions(newCaptions)
                          }}
                          className="text-xs h-8"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>File Attachments</Label>
            <div className="border border-input rounded-lg p-4">
              <Label htmlFor="attachment-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" />
                  Add files (PDFs, documents, etc.)
                </div>
                <Input
                  id="attachment-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.zip"
                  onChange={handleAttachmentUpload}
                  className="hidden"
                />
              </Label>
            </div>

            {/* Attachments List */}
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                {formData.attachments.map((file, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachment(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Link a Service */}
          {servicesData?.results && servicesData.results.length > 0 && (
            <div className="space-y-2">
              <Label>Link a Service (optional)</Label>
              <Select
                value={linkedServiceId || "none"}
                onValueChange={(value) => setLinkedServiceId(value === "none" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service to embed..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked service</SelectItem>
                  {servicesData.results.map((service: any) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.title} — ${(service.price || 0).toFixed(0)} ({service.service_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Embed a booking card so readers can book your service directly from this post.
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Tag className="h-4 w-4" />
              </Button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 p-0 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Publishing Options */}
          <div className="space-y-2">
            <Label>Publishing</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "draft" | "scheduled" | "published") =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publish now</SelectItem>
                <SelectItem value="draft">Save as draft</SelectItem>
                <SelectItem value="scheduled">Schedule for later</SelectItem>
              </SelectContent>
            </Select>

            {formData.status === "scheduled" && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-32">
                  <Label className="text-xs text-muted-foreground mb-1 block">Time</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title || !formData.content}>
              {loading
                ? "Creating..."
                : formData.status === "published"
                  ? "Publish Post"
                  : formData.status === "scheduled"
                    ? "Schedule Post"
                    : "Save Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
