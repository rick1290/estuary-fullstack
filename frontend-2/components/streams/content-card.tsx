"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import type { StreamPost } from "@/types/stream"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import {
  streamPostsLikeCreateMutation,
  streamPostsSaveCreateMutation,
  streamPostsCommentsCreateMutation,
  streamPostsCommentsListOptions
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/components/ui/use-toast"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageCircle, Share2, Bookmark, MoreHorizontal, Lock, Play, Heart } from "lucide-react"
import { useAuthModal } from "@/components/auth/auth-provider"

// Helper function to validate URLs
function isValidUrl(urlString: string | undefined | null): boolean {
  if (!urlString || typeof urlString !== 'string') return false

  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

interface ContentCardProps {
  post: StreamPost
}

export default function ContentCard({ post }: ContentCardProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [liked, setLiked] = useState(post.isLiked)
  const [saved, setSaved] = useState(post.isSaved)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState("")
  const [likeCount, setLikeCount] = useState(post.likes)

  // Filter out invalid URLs from mediaUrls to prevent Image component errors
  const validMediaUrls = useMemo(() => {
    if (!post.mediaUrls || !Array.isArray(post.mediaUrls)) return []
    return post.mediaUrls.filter(isValidUrl)
  }, [post.mediaUrls])

  // Initialize liked state
  useEffect(() => {
    setLiked(post.isLiked)
    setLikeCount(post.likes)
  }, [post.isLiked, post.likes])

  // Like mutation
  const likeMutation = useMutation({
    ...streamPostsLikeCreateMutation(),
    onMutate: async () => {
      // Optimistic update
      const newLiked = !liked
      setLiked(newLiked)
      setLikeCount(newLiked ? likeCount + 1 : Math.max(0, likeCount - 1))
    },
    onSuccess: (data) => {
      // Update with server data
      if (data) {
        // The response is directly the StreamPostReadable object
        setLiked(!!data.is_liked)
        setLikeCount(data.like_count || 0)
      }
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['streamPosts'] })
    },
    onError: (error: any) => {
      // Revert optimistic update
      setLiked(!liked)
      setLikeCount(liked ? likeCount + 1 : Math.max(0, likeCount - 1))
      
      toast({
        title: "Failed to update like",
        description: error?.body?.detail || "Please try again",
        variant: "destructive",
      })
    }
  })

  const handleLike = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: window.location.pathname,
        serviceType: "stream",
        title: "Sign in to Interact",
        description: "Please sign in to like this content"
      })
      return
    }

    // Call API to toggle like
    likeMutation.mutate({
      path: {
        public_uuid: post.id
      },
      body: {} // Empty body as required by the API
    })
  }

  // Save mutation
  const saveMutation = useMutation({
    ...streamPostsSaveCreateMutation(),
    onMutate: async () => {
      // Optimistic update
      setSaved(!saved)
    },
    onSuccess: (data) => {
      // Update with server data
      if (data) {
        setSaved(!!data.is_saved)
      }
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['streamPosts'] })
    },
    onError: (error: any) => {
      // Revert optimistic update
      setSaved(!saved)
      
      toast({
        title: "Failed to save post",
        description: error?.body?.detail || "Please try again",
        variant: "destructive",
      })
    }
  })

  const handleSave = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: window.location.pathname,
        serviceType: "stream",
        title: "Sign in to Save",
        description: "Please sign in to save this content"
      })
      return
    }
    
    // Call API to toggle save
    saveMutation.mutate({
      path: {
        public_uuid: post.id
      },
      body: {} // Empty body as required by the API
    })
  }

  const handleCommentToggle = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: window.location.pathname,
        serviceType: "stream",
        title: "Sign in to Comment",
        description: "Please sign in to comment on this content"
      })
      return
    }
    setShowComments(!showComments)
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    
    // Call API to create comment
    createCommentMutation.mutate({
      path: { public_uuid: post.id },
      body: { 
        content: comment.trim()
      }
    })
  }

  // Query for comments
  const { data: commentsData, refetch: refetchComments } = useQuery({
    ...streamPostsCommentsListOptions({
      path: { public_uuid: post.id }
    }),
    enabled: showComments && !!post.id
  })

  // Comment creation mutation
  const createCommentMutation = useMutation({
    ...streamPostsCommentsCreateMutation(),
    onSuccess: (data) => {
      setComment("")
      refetchComments()
      toast({
        title: "Comment posted!",
        description: "Your comment has been added.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post comment",
        description: error?.body?.detail || "Please try again",
        variant: "destructive",
      })
    }
  })

  const handlePractitionerClick = () => {
    router.push(`/practitioners/${post.practitionerSlug || post.practitionerId}`)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`https://estuary.com/streams/post/${post.id}`)
    // Could add a toast notification here
  }

  // Format the date
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })

  return (
    <>
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm rounded-2xl">
      {/* Card header with practitioner info */}
      <div className="flex items-center p-5">
        <Avatar
          className="h-10 w-10 cursor-pointer ring-2 ring-sage-200 shadow-lg"
          onClick={handlePractitionerClick}
        >
          <AvatarImage
            src={post.practitionerImage}
            alt={post.practitionerName}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-sage-200 to-terracotta-200 text-olive-800 text-sm font-medium">
            {post.practitionerName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <p
            className="font-medium text-olive-900 cursor-pointer hover:text-sage-700 transition-colors"
            onClick={handlePractitionerClick}
          >
            {post.practitionerName}
          </p>
          <p className="text-sm text-olive-600">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {post.userSubscriptionTier && post.userSubscriptionTier !== "free" && (
            <Badge className="bg-gradient-to-r from-sage-200 to-sage-300 text-olive-800 border-0 rounded-full">
              Subscribed ({post.userSubscriptionTier})
            </Badge>
          )}
          {post.isPremium && (
            <Badge className="bg-gradient-to-r from-terracotta-200 to-blush-200 text-olive-800 border-0 rounded-full">
              <Lock className="h-3 w-3 mr-1" strokeWidth="1.5" />
              {post.tierLevel || "Premium"}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-olive-600 hover:text-olive-800 hover:bg-sage-50">
              <MoreHorizontal className="h-4 w-4" strokeWidth="1.5" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" strokeWidth="1.5" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <CardContent className="px-5 pb-5 pt-0">
        {/* Content text */}
        <div className="mb-4 text-olive-700 leading-relaxed">
          {post.isPremium && !post.hasAccess ? (
            <>
              {post.content.substring(0, 150)}...{" "}
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal({
                      defaultTab: "login",
                      redirectUrl: window.location.pathname,
                      serviceType: "stream",
                      title: "Subscribe to Premium Content",
                      description: "Sign in to access exclusive premium content"
                    })
                  } else {
                    // Redirect to stream checkout page
                    router.push(`/checkout/stream?streamId=${post.streamId}&tier=${post.tierLevel || 'entry'}`)
                  }
                }} 
                className="font-medium text-sage-700 p-0 h-auto"
              >
                {!isAuthenticated ? "Sign in to subscribe" : "Subscribe to read more"}
              </Button>
            </>
          ) : (
            post.content
          )}
        </div>

        {/* Content media */}
        {validMediaUrls.length > 0 && (
          <div className="relative mb-4 overflow-hidden rounded-xl">
            {post.contentType === "video" ? (
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                {post.isPremium && !post.hasAccess ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full mb-3">
                      <Lock className="h-8 w-8 text-white" strokeWidth="1.5" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">{post.tierLevel} Content</h3>
                    <p className="text-sm text-white/80 mb-4">Subscribe to watch this video</p>
                    <Button
                      className="bg-white text-gray-900 hover:bg-gray-100"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openAuthModal({
                            defaultTab: "login",
                            redirectUrl: window.location.pathname,
                            serviceType: "stream",
                            title: "Subscribe to Watch Video",
                            description: "Sign in to access exclusive video content"
                          })
                        } else {
                          router.push(`/checkout/stream?streamId=${post.streamId}&tier=${post.tierLevel || 'entry'}`)
                        }
                      }}
                    >
                      <Play className="mr-2 h-4 w-4" strokeWidth="1.5" />
                      {!isAuthenticated ? "Sign in to watch" : "Subscribe to Watch"}
                    </Button>
                  </div>
                ) : validMediaUrls[0] ? (
                  <Image
                    src={validMediaUrls[0]}
                    alt="Video thumbnail"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No thumbnail</span>
                  </div>
                )}
                {(!post.isPremium || post.hasAccess) && (
                  <div className="absolute inset-0 flex items-center justify-center group cursor-pointer">
                    <div className="w-16 h-16 bg-black/50 group-hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                      <Play className="h-8 w-8 text-white ml-1" fill="white" strokeWidth="1.5" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                {/* Multi-image gallery layout */}
                {validMediaUrls.length === 1 ? (
                  // Single image - full width
                  <div className="relative">
                    <Image
                      src={validMediaUrls[0]}
                      alt="Post media"
                      width={800}
                      height={450}
                      className="w-full rounded-xl object-cover"
                      style={{
                        filter: post.isPremium && !post.hasAccess ? "blur(20px)" : "none",
                      }}
                      unoptimized
                    />
                  </div>
                ) : validMediaUrls.length === 2 ? (
                  // Two images - side by side
                  <div className="grid grid-cols-2 gap-2">
                    {validMediaUrls.slice(0, 2).map((url, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={url}
                          alt={`Post media ${index + 1}`}
                          fill
                          className="rounded-xl object-cover"
                          style={{
                            filter: post.isPremium && !post.hasAccess ? "blur(20px)" : "none",
                          }}
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : validMediaUrls.length === 3 ? (
                  // Three images - first one larger, two smaller
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative aspect-square">
                      <Image
                        src={validMediaUrls[0]}
                        alt="Post media 1"
                        fill
                        className="rounded-xl object-cover"
                        style={{
                          filter: post.isPremium && !post.hasAccess ? "blur(20px)" : "none",
                        }}
                        unoptimized
                      />
                    </div>
                    <div className="grid grid-rows-2 gap-2">
                      {validMediaUrls.slice(1, 3).map((url, index) => (
                        <div key={index + 1} className="relative aspect-square">
                          <Image
                            src={url}
                            alt={`Post media ${index + 2}`}
                            fill
                            className="rounded-xl object-cover"
                            style={{
                              filter: post.isPremium && !post.hasAccess ? "blur(20px)" : "none",
                            }}
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Four or more images - 2x2 grid with "+X more" overlay
                  <div className="grid grid-cols-2 gap-2">
                    {validMediaUrls.slice(0, 3).map((url, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={url}
                          alt={`Post media ${index + 1}`}
                          fill
                          className="rounded-xl object-cover"
                          style={{
                            filter: post.isPremium && !post.hasAccess ? "blur(20px)" : "none",
                          }}
                          unoptimized
                        />
                      </div>
                    ))}
                    <div className="relative aspect-square">
                      <Image
                        src={validMediaUrls[3]}
                        alt="Post media 4"
                        fill
                        className="rounded-xl object-cover"
                        style={{
                          filter: post.isPremium && !post.hasAccess ? "blur(20px)" : "none",
                        }}
                        unoptimized
                      />
                      {validMediaUrls.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                          <span className="text-white font-semibold text-lg">
                            +{validMediaUrls.length - 4} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Premium content overlay */}
                {post.isPremium && !post.hasAccess && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                    <Button 
                      className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-lg"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openAuthModal({
                            defaultTab: "login",
                            redirectUrl: window.location.pathname,
                            serviceType: "stream",
                            title: "Subscribe to View Images",
                            description: "Sign in to access exclusive image content"
                          })
                        } else {
                          router.push(`/checkout/stream?streamId=${post.streamId}&tier=${post.tierLevel || 'entry'}`)
                        }
                      }}
                    >
                      <Lock className="mr-2 h-4 w-4" strokeWidth="1.5" />
                      {!isAuthenticated ? "Sign in to view" : "Subscribe to View"}
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
                className="bg-sage-100 text-olive-700 hover:bg-sage-200 cursor-pointer transition-colors px-3 py-1 rounded-full"
                onClick={() => router.push(`/streams?tag=${encodeURIComponent(tag)}`)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="mb-4 bg-sage-200" />

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 ${liked ? "text-rose-500" : "text-olive-600"} hover:text-rose-500 hover:bg-rose-50`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-current" : ""}`} strokeWidth="1.5" />
              <span className="font-medium">{likeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-olive-600 hover:text-sage-700 hover:bg-sage-50"
              onClick={handleCommentToggle}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" strokeWidth="1.5" />
              <span className="font-medium">{post.comments}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-olive-600 hover:text-sage-700 hover:bg-sage-50"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" strokeWidth="1.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={`px-3 ${saved ? "text-sage-600" : "text-olive-600"} hover:text-sage-700 hover:bg-sage-50`}
            onClick={handleSave}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} strokeWidth="1.5" />
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t">
            <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
              <Input
                className="flex-1 border-sage-300 focus:border-sage-500 rounded-xl"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={!comment.trim() || createCommentMutation.isPending} 
                className="bg-sage-600 hover:bg-sage-700 rounded-xl"
              >
                {createCommentMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </form>
            
            {commentsData?.results && commentsData.results.length > 0 ? (
              <div className="space-y-3">
                {commentsData.results.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user_image || "/placeholder.svg"} alt={comment.user_name} />
                      <AvatarFallback className="text-xs">{comment.user_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm text-olive-900">{comment.user_name}</span>
                        <span className="text-xs text-olive-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-olive-700 mt-0.5">{comment.content}</p>
                      {/* Show replies if any */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-8 mt-2 space-y-2">
                          {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={reply.user_image || "/placeholder.svg"} alt={reply.user_name} />
                                <AvatarFallback className="text-xs">{reply.user_name?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-medium text-xs text-olive-900">{reply.user_name}</span>
                                  <span className="text-xs text-olive-500">
                                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-xs text-olive-700 mt-0.5">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-olive-500">No comments yet. Be the first to comment!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    </>
  )
}