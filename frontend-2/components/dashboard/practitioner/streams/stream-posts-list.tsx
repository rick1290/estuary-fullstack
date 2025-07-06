"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { MoreHorizontal, Edit, Trash2, Eye, Calendar, Users, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import EditPostDialog from "./edit-post-dialog"
import PostPreviewDialog from "./post-preview-dialog"
import type { StreamPost } from "@/types/stream-management"

interface StreamPostsListProps {
  posts: StreamPost[]
  onDeletePost: (postId: string) => void
  onUpdatePost: (post: StreamPost) => void
}

export default function StreamPostsList({ posts, onDeletePost, onUpdatePost }: StreamPostsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<StreamPost | null>(null)

  const handleDeleteClick = (post: StreamPost) => {
    setSelectedPost(post)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (post: StreamPost) => {
    setSelectedPost(post)
    setEditDialogOpen(true)
  }

  const handlePreviewClick = (post: StreamPost) => {
    setSelectedPost(post)
    setPreviewDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedPost) {
      onDeletePost(selectedPost.public_uuid || selectedPost.id)
      setDeleteDialogOpen(false)
      setSelectedPost(null)
    }
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 border-green-200"
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No posts found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first stream post to start engaging with your subscribers.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <Badge variant="outline" className={getTierColor(post.tier_level)}>
                    {post.tier_level}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(post.is_published ? 'published' : 'draft')}>
                    {post.is_published ? 'published' : 'draft'}
                  </Badge>
                </div>

                <p className="text-muted-foreground line-clamp-2">{post.content}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {post.view_count || 0} views
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {post.unique_view_count || 0} unique views
                  </div>
                  {!post.is_published && post.published_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Scheduled for {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                    </div>
                  )}
                  {post.is_published && post.published_at && (
                    <span>Published {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
                  )}
                </div>

                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePreviewClick(post)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditClick(post)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {post.media && post.media.length > 0 && (
                    <DropdownMenuItem onClick={() => handleEditClick(post)}>
                      <Image className="mr-2 h-4 w-4" />
                      Manage Media ({post.media.length})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDeleteClick(post)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          {post.media && post.media.length > 0 && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {post.media.slice(0, 4).map((media, index) => (
                  <div key={index} className="aspect-square relative rounded-md overflow-hidden bg-muted">
                    <img
                      src={media.url ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${media.url}` : "/placeholder.svg"}
                      alt={media.caption || `Post media ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                    {post.media.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium">
                        +{post.media.length - 4} more
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPost?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {selectedPost && (
        <EditPostDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          post={selectedPost}
          onUpdatePost={onUpdatePost}
        />
      )}

      {/* Preview Dialog */}
      {selectedPost && (
        <PostPreviewDialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen} post={selectedPost} />
      )}
    </div>
  )
}
