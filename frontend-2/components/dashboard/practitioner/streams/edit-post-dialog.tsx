"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Tag, Upload, Image, GripVertical } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { streamPostsUploadMediaCreateMutation, streamPostsMediaDestroyMutation, streamPostsReorderMediaCreateMutation } from "@/src/client/@tanstack/react-query.gen"
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
import type { StreamPost } from "@/types/stream-management"

interface EditPostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: StreamPost
  onUpdatePost: (post: StreamPost) => void
}

export default function EditPostDialog({ open, onOpenChange, post, onUpdatePost }: EditPostDialogProps) {
  const [formData, setFormData] = useState({
    title: post.title || "",
    content: post.content || "",
    tier: post.tier_level || "free",
    tags: post.tags || [],
    status: post.is_published ? "published" : "draft",
    scheduledAt: post.published_at || "",
  })
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([])
  const [newMediaCaptions, setNewMediaCaptions] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  
  const queryClient = useQueryClient()

  // Media upload mutation
  const uploadMediaMutation = useMutation({
    ...streamPostsUploadMediaCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Media uploaded!",
        description: "Your media has been added to the post.",
      })
      setNewMediaFiles([])
      setNewMediaCaptions([])
      setUploadingMedia(false)
      // Refresh the post data
      queryClient.invalidateQueries({ queryKey: ["stream-posts"] })
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error?.body?.detail || "Failed to upload media",
        variant: "destructive",
      })
      setUploadingMedia(false)
    }
  })

  // Media delete mutation
  const deleteMediaMutation = useMutation({
    ...streamPostsMediaDestroyMutation(),
    onSuccess: () => {
      toast({
        title: "Media deleted",
        description: "The media item has been removed.",
      })
      queryClient.invalidateQueries({ queryKey: ["stream-posts"] })
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error?.body?.detail || "Failed to delete media",
        variant: "destructive",
      })
    }
  })

  // Media reorder mutation
  const reorderMediaMutation = useMutation({
    ...streamPostsReorderMediaCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Media reordered",
        description: "Media items have been reordered.",
      })
      queryClient.invalidateQueries({ queryKey: ["stream-posts"] })
    },
    onError: (error: any) => {
      toast({
        title: "Reorder failed",
        description: error?.body?.detail || "Failed to reorder media",
        variant: "destructive",
      })
    }
  })

  useEffect(() => {
    setFormData({
      title: post.title || "",
      content: post.content || "",
      tier: post.tier_level || "free",
      tags: post.tags || [],
      status: post.is_published ? "published" : "draft",
      scheduledAt: post.published_at || "",
    })
  }, [post])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updatedPost: any = {
        ...post,
        title: formData.title,
        content: formData.content,
        tier_level: formData.tier,
        tags: formData.tags,
        is_published: formData.status === "published",
        published_at: formData.scheduledAt || (formData.status === "published" ? new Date().toISOString() : null),
        updated_at: new Date().toISOString(),
      }

      onUpdatePost(updatedPost)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating post:", error)
    } finally {
      setLoading(false)
    }
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

  const handleNewMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewMediaFiles((prev) => [...prev, ...files])
    setNewMediaCaptions((prev) => [...prev, ...new Array(files.length).fill('')])
  }

  const removeNewMediaFile = (index: number) => {
    setNewMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setNewMediaCaptions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUploadNewMedia = async () => {
    if (newMediaFiles.length === 0) return

    setUploadingMedia(true)
    
    try {
      // Prepare the body object as expected by the OpenAPI client
      const body: any = {}
      newMediaFiles.forEach((file, index) => {
        body[`media_${index}`] = file
        if (newMediaCaptions[index]) {
          body[`caption_${index}`] = newMediaCaptions[index]
        }
      })

      console.log('Upload body keys:', Object.keys(body))
      console.log('Files being uploaded:', newMediaFiles.map(f => f.name))

      // Use the properly generated OpenAPI client
      await uploadMediaMutation.mutateAsync({
        path: { public_uuid: post.public_uuid },
        body: body,
      })
      
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: error?.body?.detail || error.message || "Failed to upload media",
        variant: "destructive",
      })
      setUploadingMedia(false)
    }
  }

  const handleDeleteMedia = (mediaId: string) => {
    deleteMediaMutation.mutate({
      path: { 
        public_uuid: post.public_uuid,
        media_id: mediaId
      }
    })
  }

  const handleReorderMedia = (newOrder: string[]) => {
    reorderMediaMutation.mutate({
      path: { public_uuid: post.public_uuid },
      body: { media_ids: newOrder }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Stream Post</DialogTitle>
          <DialogDescription>Update your post content and settings.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              rows={4}
              required
            />
          </div>

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
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Existing Media */}
          {post.media && post.media.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Current Media ({post.media.length})</Label>
                {post.media.length > 1 && (
                  <span className="text-xs text-muted-foreground">Drag to reorder</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {post.media
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((media: any) => (
                  <div key={media.id} className="relative group">
                    {post.media.length > 1 && (
                      <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 rounded p-1 cursor-move">
                          <GripVertical className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {media.media_type === 'image' ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${media.url}`}
                          alt={media.alt_text || media.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full p-2">
                          <div className="text-center">
                            <div className="text-xs font-medium truncate">{media.filename}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {media.media_type}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMedia(media.id)}
                      disabled={deleteMediaMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {media.caption && (
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {media.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Media Upload */}
          <div className="space-y-2">
            <Label>Add New Media</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <div className="mt-2">
                  <Label htmlFor="new-media-upload" className="cursor-pointer">
                    <span className="text-sm text-primary hover:text-primary/80">
                      Upload images or videos
                    </span>
                    <Input
                      id="new-media-upload"
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleNewMediaUpload}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, MP4 up to 10MB each</p>
                </div>
              </div>
            </div>

            {/* New Media Preview */}
            {newMediaFiles.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {newMediaFiles.map((file, index) => {
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
                            onClick={() => removeNewMediaFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Add caption..."
                          value={newMediaCaptions[index] || ''}
                          onChange={(e) => {
                            const newCaptions = [...newMediaCaptions]
                            newCaptions[index] = e.target.value
                            setNewMediaCaptions(newCaptions)
                          }}
                          className="text-xs h-8"
                        />
                      </div>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  onClick={handleUploadNewMedia}
                  disabled={uploadingMedia || newMediaFiles.length === 0}
                  className="w-full"
                >
                  {uploadingMedia ? "Uploading..." : `Upload ${newMediaFiles.length} file${newMediaFiles.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
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

          <div className="space-y-2">
            <Label>Status</Label>
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
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            {formData.status === "scheduled" && (
              <div className="mt-2">
                <Label htmlFor="scheduled-date">Schedule Date & Time</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={formData.scheduledAt}
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
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
