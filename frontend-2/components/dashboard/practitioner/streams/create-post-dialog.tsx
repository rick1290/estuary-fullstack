"use client"

import type React from "react"

import { useState } from "react"
import { Upload, X, Tag } from "lucide-react"
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
import type { CreatePostFormData } from "@/types/stream-management"

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePost: (postData: CreatePostFormData) => void
  streamId?: string | number
}

export default function CreatePostDialog({ open, onOpenChange, onCreatePost, streamId }: CreatePostDialogProps) {
  const [formData, setFormData] = useState<CreatePostFormData>({
    title: "",
    content: "",
    tier: "free",
    mediaFiles: [],
    attachments: [],
    tags: [],
    status: "published",
  })
  const [mediaCaptions, setMediaCaptions] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // In a real app, you would upload files and create the post via API
      const postData = {
        ...formData,
        streamId,
        mediaCaptions,
      }

      onCreatePost(postData)

      // Reset form
      setFormData({
        title: "",
        content: "",
        tier: "free",
        mediaFiles: [],
        attachments: [],
        tags: [],
        status: "published",
      })
      setMediaCaptions([])
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
    // Add empty captions for new files
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

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Media Files</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <div className="mt-4">
                  <Label htmlFor="media-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                      Upload images or videos
                    </span>
                    <Input
                      id="media-upload"
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, MP4 up to 10MB each</p>
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

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
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
              <div className="mt-2">
                <Label htmlFor="scheduled-date">Schedule Date & Time</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={formData.scheduledAt || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                />
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
