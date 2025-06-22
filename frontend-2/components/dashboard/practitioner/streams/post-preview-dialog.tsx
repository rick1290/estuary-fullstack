"use client"

import { formatDistanceToNow } from "date-fns"
import { Lock, Eye, Heart, MessageCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import type { StreamPost } from "@/types/stream-management"

interface PostPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: StreamPost
}

export default function PostPreviewDialog({ open, onOpenChange, post }: PostPreviewDialogProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-green-100 text-green-800 border-green-200"
      case "entry":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "premium":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const isContentLocked = post.tier_level !== "free"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Preview</DialogTitle>
          <DialogDescription>This is how your post will appear to subscribers and non-subscribers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post Header */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder.svg?height=50&width=50" />
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Dr. Sarah Wilson</h3>
                <Badge variant="outline" className={getTierColor(post.tier_level)}>
                  {post.tier_level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {post.is_published && post.published_at
                  ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
                  : !post.is_published && post.published_at
                    ? `Scheduled for ${formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}`
                    : "Draft"}
              </p>
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{post.title}</h2>

            <div className="relative">
              <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>

              {/* Blur overlay for premium content preview */}
              {isContentLocked && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white flex items-end justify-center pb-4">
                  <div className="text-center">
                    <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Subscribe to {post.tier_level} tier to read full content</p>
                  </div>
                </div>
              )}
            </div>

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {post.media.slice(0, 4).map((media, index) => (
                    <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={media.media_url || "/placeholder.svg"}
                        alt={media.caption || `Post media ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>

                {isContentLocked && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <Lock className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Subscribe to unlock media</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Attachments</h4>
                {post.attachments.map((attachment) => (
                  <Card key={attachment.id} className="relative">
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          <div className="font-medium">{attachment.name}</div>
                          <div className="text-muted-foreground">{(attachment.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled={isContentLocked}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </CardContent>

                    {isContentLocked && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Engagement */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <Button variant="ghost" size="sm" className="gap-1">
                <Heart className="h-4 w-4" />
                {post.like_count || 0}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" />
                {post.comment_count || 0}
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                <Eye className="h-4 w-4" />
                {post.view_count || 0} views
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
