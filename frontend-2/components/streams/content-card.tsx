"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import type { StreamPost } from "@/types/stream"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageCircle, Share2, Bookmark, MoreHorizontal, Lock, Play, Heart } from "lucide-react"

interface ContentCardProps {
  post: StreamPost
}

export default function ContentCard({ post }: ContentCardProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState("")
  const [likeCount, setLikeCount] = useState(post.likes)

  const handleLike = () => {
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }

    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
  }

  const handleSave = () => {
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }
    setSaved(!saved)
  }

  const handleCommentToggle = () => {
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }
    setShowComments(!showComments)
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    // In a real app, this would send the comment to an API
    console.log(`Comment on post ${post.id}: ${comment}`)
    setComment("")
  }

  const handlePractitionerClick = () => {
    router.push(`/practitioners/${post.practitionerId}`)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`https://estuary.com/streams/post/${post.id}`)
    // Could add a toast notification here
  }

  // Format the date
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      {/* Card header with practitioner info */}
      <div className="flex items-center p-5">
        <Avatar 
          className="h-10 w-10 cursor-pointer ring-2 ring-gray-100" 
          onClick={handlePractitionerClick}
        >
          <AvatarImage src={post.practitionerImage || "/placeholder.svg"} alt={post.practitionerName} />
          <AvatarFallback className="bg-warm-100 text-warm-600">
            {post.practitionerName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <p 
            className="font-medium text-gray-900 cursor-pointer hover:text-primary transition-colors" 
            onClick={handlePractitionerClick}
          >
            {post.practitionerName}
          </p>
          <p className="text-sm text-gray-500">{formattedDate}</p>
        </div>
        {post.isPremium && (
          <Badge className="bg-gradient-to-r from-warm-200 to-warm-300 text-warm-800 border-0 mr-2">
            <Lock className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <CardContent className="px-5 pb-5 pt-0">
        {/* Content text */}
        <div className="mb-4 text-gray-700 leading-relaxed">
          {post.isPremium && !isAuthenticated ? (
            <>
              {post.content.substring(0, 150)}...{" "}
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => router.push("/auth/login")} 
                className="font-medium text-primary p-0 h-auto"
              >
                Subscribe to read more
              </Button>
            </>
          ) : (
            post.content
          )}
        </div>

        {/* Content media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="relative mb-4 overflow-hidden rounded-xl">
            {post.contentType === "video" ? (
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                {post.isPremium && !isAuthenticated ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full mb-3">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Premium Content</h3>
                    <p className="text-sm text-white/80 mb-4">Subscribe to watch this video</p>
                    <Button 
                      className="bg-white text-gray-900 hover:bg-gray-100"
                      onClick={() => router.push("/auth/login")}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Subscribe to Watch
                    </Button>
                  </div>
                ) : (
                  <Image
                    src={post.mediaUrls[0] || "/placeholder.svg"}
                    alt="Video thumbnail"
                    fill
                    className="object-cover"
                  />
                )}
                {(!post.isPremium || isAuthenticated) && (
                  <div className="absolute inset-0 flex items-center justify-center group cursor-pointer">
                    <div className="w-16 h-16 bg-black/50 group-hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                      <Play className="h-8 w-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Image
                  src={post.mediaUrls[0] || "/placeholder.svg"}
                  alt="Post media"
                  width={800}
                  height={450}
                  className="w-full rounded-xl object-cover"
                  style={{
                    filter: post.isPremium && !isAuthenticated ? "blur(20px)" : "none",
                  }}
                />
                {post.isPremium && !isAuthenticated && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button 
                      className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-lg"
                      onClick={() => router.push("/auth/login")}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Subscribe to View
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors px-3 py-1"
                onClick={() => router.push(`/streams?tag=${encodeURIComponent(tag)}`)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="mb-4" />

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 ${liked ? "text-rose-500" : "text-gray-600"}`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-current" : ""}`} />
              <span className="font-medium">{likeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-gray-600"
              onClick={handleCommentToggle}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              <span className="font-medium">{post.comments}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-gray-600"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={`px-3 ${saved ? "text-primary" : "text-gray-600"}`}
            onClick={handleSave}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t">
            <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
              <Input
                className="flex-1"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={!comment.trim()}>
                Post
              </Button>
            </form>
            
            {post.commentsList && post.commentsList.length > 0 ? (
              <div className="space-y-3">
                {post.commentsList.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.userImage || "/placeholder.svg"} alt={comment.userName} />
                      <AvatarFallback className="text-xs">{comment.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">{comment.userName}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500">No comments yet. Be the first to comment!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}