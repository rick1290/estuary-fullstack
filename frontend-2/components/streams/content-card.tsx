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
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageCircle, Share2, Bookmark, MoreHorizontal, Lock, Play, Heart, DollarSign } from "lucide-react"
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
      body: {} as any
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
      body: {} as any
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
      } as any
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
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/streams/post/${post.id}`
      : `/streams/post/${post.id}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied!",
      description: "Post link has been copied to your clipboard.",
    })
  }

  // Format the date
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })

  return (
    <>
      <Card className="relative overflow-hidden border border-sage-200/60 hover:shadow-sm transition-all duration-300 bg-white rounded-2xl">
        {/* Compact header with avatar, name, date, badges, and menu inline */}
        <div className="flex items-center px-4 py-3">
          <Avatar
            className="h-9 w-9 cursor-pointer ring-2 ring-sage-200/60"
            onClick={handlePractitionerClick}
          >
            <AvatarImage
              src={post.practitionerImage}
              alt={post.practitionerName}
              className="object-cover"
            />
            <AvatarFallback className="bg-sage-100 text-olive-800 text-xs font-medium">
              {post.practitionerName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="ml-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="font-semibold text-sm text-olive-900 cursor-pointer hover:text-sage-700 transition-colors truncate"
                onClick={handlePractitionerClick}
              >
                {post.practitionerName}
              </p>
              <span className="text-xs text-olive-500">
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => router.push(`/streams/post/${post.id}`)}
                >
                  {formattedDate}
                </span>
              </span>
              {post.streamTitle && post.streamId && (
                <span
                  className="text-xs text-sage-600 hover:text-sage-700 cursor-pointer transition-colors truncate"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/streams/${post.streamId}`)
                  }}
                >
                  {post.streamTitle}
                </span>
              )}
              {post.userSubscriptionTier && post.userSubscriptionTier !== "free" && (
                <Badge className="bg-sage-100 text-olive-800 border-0 rounded-full text-[10px] px-2 py-0">
                  {post.userSubscriptionTier}
                </Badge>
              )}
              {post.isPremium && (
                <Badge className="bg-terracotta-100 text-olive-800 border-0 rounded-full text-[10px] px-2 py-0">
                  <Lock className="h-2.5 w-2.5 mr-0.5" strokeWidth="1.5" />
                  {post.tierLevel || "Premium"}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-olive-500 hover:text-olive-800 hover:bg-sage-50 ml-1 shrink-0">
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

        {/* Media FIRST -- edge-to-edge, no padding, no rounded corners on media */}
        {validMediaUrls.length > 0 && (
          <div className="relative overflow-hidden">
            {post.contentType === "video" ? (
              <div className="relative aspect-video bg-black overflow-hidden">
                {post.isPremium && !post.hasAccess ? (
                  <>
                    {/* Blurred preview background */}
                    {validMediaUrls[0] && (
                      <Image
                        src={validMediaUrls[0]}
                        alt="Video thumbnail"
                        fill
                        className="object-cover rounded-none"
                        style={{ filter: "blur(24px)", transform: "scale(1.1)" }}
                        unoptimized
                      />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                    {/* Lock content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                      <div className="p-4 bg-white/10 backdrop-blur-md rounded-full mb-4">
                        <Lock className="h-10 w-10 text-white" strokeWidth="1.5" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-1">{post.tierLevel || "Premium"} Content</h3>
                      <p className="text-sm text-white/70 mb-5">Subscribe to watch this video</p>
                      <Button
                        size="lg"
                        className="bg-white text-olive-900 hover:bg-cream-50 font-semibold px-8 shadow-lg"
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
                        <Play className="mr-2 h-5 w-5" strokeWidth="1.5" />
                        {!isAuthenticated ? "Sign in to watch" : "Subscribe to Unlock"}
                      </Button>
                    </div>
                  </>
                ) : validMediaUrls[0] ? (
                  <Image
                    src={validMediaUrls[0]}
                    alt="Video thumbnail"
                    fill
                    className="object-cover rounded-none"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-sage-100 flex items-center justify-center">
                    <span className="text-olive-400">No thumbnail</span>
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
                {/* Multi-image gallery layout -- edge-to-edge, no rounding */}
                {validMediaUrls.length === 1 ? (
                  <div className="relative">
                    <Image
                      src={validMediaUrls[0]}
                      alt="Post media"
                      width={800}
                      height={450}
                      className="w-full rounded-none object-cover"
                      style={{
                        filter: post.isPremium && !post.hasAccess ? "blur(24px)" : "none",
                        transform: post.isPremium && !post.hasAccess ? "scale(1.1)" : "none",
                      }}
                      unoptimized
                    />
                  </div>
                ) : validMediaUrls.length === 2 ? (
                  <div className="grid grid-cols-2 gap-0.5">
                    {validMediaUrls.slice(0, 2).map((url, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={url}
                          alt={`Post media ${index + 1}`}
                          fill
                          className="rounded-none object-cover"
                          style={{
                            filter: post.isPremium && !post.hasAccess ? "blur(24px)" : "none",
                            transform: post.isPremium && !post.hasAccess ? "scale(1.1)" : "none",
                          }}
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : validMediaUrls.length === 3 ? (
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="relative aspect-square">
                      <Image
                        src={validMediaUrls[0]}
                        alt="Post media 1"
                        fill
                        className="rounded-none object-cover"
                        style={{
                          filter: post.isPremium && !post.hasAccess ? "blur(24px)" : "none",
                          transform: post.isPremium && !post.hasAccess ? "scale(1.1)" : "none",
                        }}
                        unoptimized
                      />
                    </div>
                    <div className="grid grid-rows-2 gap-0.5">
                      {validMediaUrls.slice(1, 3).map((url, index) => (
                        <div key={index + 1} className="relative aspect-square overflow-hidden">
                          <Image
                            src={url}
                            alt={`Post media ${index + 2}`}
                            fill
                            className="rounded-none object-cover"
                            style={{
                              filter: post.isPremium && !post.hasAccess ? "blur(24px)" : "none",
                              transform: post.isPremium && !post.hasAccess ? "scale(1.1)" : "none",
                            }}
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-0.5">
                    {validMediaUrls.slice(0, 3).map((url, index) => (
                      <div key={index} className="relative aspect-square overflow-hidden">
                        <Image
                          src={url}
                          alt={`Post media ${index + 1}`}
                          fill
                          className="rounded-none object-cover"
                          style={{
                            filter: post.isPremium && !post.hasAccess ? "blur(24px)" : "none",
                            transform: post.isPremium && !post.hasAccess ? "scale(1.1)" : "none",
                          }}
                          unoptimized
                        />
                      </div>
                    ))}
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={validMediaUrls[3]}
                        alt="Post media 4"
                        fill
                        className="rounded-none object-cover"
                        style={{
                          filter: post.isPremium && !post.hasAccess ? "blur(24px)" : "none",
                          transform: post.isPremium && !post.hasAccess ? "scale(1.1)" : "none",
                        }}
                        unoptimized
                      />
                      {validMediaUrls.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            +{validMediaUrls.length - 4} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Locked content overlay for images -- gradient + lock + subscribe CTA */}
                {post.isPremium && !post.hasAccess && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="relative flex flex-col items-center px-6">
                      <div className="p-4 bg-white/10 backdrop-blur-md rounded-full mb-4">
                        <Lock className="h-10 w-10 text-white" strokeWidth="1.5" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-1">{post.tierLevel || "Premium"} Content</h3>
                      <p className="text-sm text-white/70 mb-5">Subscribe to see this content</p>
                      <Button
                        size="lg"
                        className="bg-white text-olive-900 hover:bg-cream-50 font-semibold px-8 shadow-lg"
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
                        <Lock className="mr-2 h-5 w-5" strokeWidth="1.5" />
                        {!isAuthenticated ? "Sign in to unlock" : "Subscribe to Unlock"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text content below media */}
        <CardContent className="px-4 pb-0 pt-3">
          {/* Content text */}
          <div className="text-olive-700 leading-relaxed text-[15px]">
            {post.isPremium && !post.hasAccess ? (
              <>
                {post.teaserText || post.content.substring(0, 150)}...{" "}
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
              <>
                <span
                  className="cursor-pointer"
                  onClick={() => router.push(`/streams/post/${post.id}`)}
                >
                  {post.content.length > 300 ? `${post.content.substring(0, 300)}... ` : post.content}
                </span>
                {post.content.length > 300 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push(`/streams/post/${post.id}`)}
                    className="font-medium text-sage-700 p-0 h-auto"
                  >
                    Read more
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Linked Service Booking Card */}
          {post.linkedService && (
            <div className="mt-3 p-4 rounded-xl border border-sage-200/60 bg-sage-50/50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sage-600 font-medium uppercase tracking-wide mb-1">
                    {post.linkedService.serviceType === 'session' ? 'Book a Session' :
                     post.linkedService.serviceType === 'workshop' ? 'Join Workshop' :
                     post.linkedService.serviceType === 'course' ? 'Enroll in Course' : 'Book Now'}
                  </p>
                  <h4 className="font-medium text-olive-900 truncate">{post.linkedService.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-olive-600">
                    <span className="font-semibold text-olive-800">${post.linkedService.price.toFixed(0)}</span>
                    {post.linkedService.duration && (
                      <span>{post.linkedService.duration} min</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-sage-700 hover:bg-sage-800 text-white ml-4"
                  onClick={() => router.push(`/services/${post.linkedService!.slug || post.linkedService!.id}`)}
                >
                  Book Now
                </Button>
              </div>
            </div>
          )}

          {/* Tags -- smaller and more subtle, above engagement bar */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-sage-50 text-olive-500 hover:bg-sage-100 cursor-pointer transition-colors px-2 py-0 rounded-full text-[11px] font-normal"
                  onClick={() => router.push(`/streams?tag=${encodeURIComponent(tag)}`)}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        {/* Engagement bar -- full-width, prominent, evenly spaced */}
        <div className="flex items-center justify-between px-2 py-1 mt-2 border-t border-sage-100">
          <Button
            variant="ghost"
            size="sm"
            className={`flex-1 gap-2 h-11 ${liked ? "text-rose-500" : "text-olive-600"} hover:text-rose-500 hover:bg-rose-50/50`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} strokeWidth="1.5" />
            <span className="font-semibold text-sm">{likeCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-2 h-11 text-olive-600 hover:text-sage-700 hover:bg-sage-50/50"
            onClick={handleCommentToggle}
          >
            <MessageCircle className="h-5 w-5" strokeWidth="1.5" />
            <span className="font-semibold text-sm">{post.comments}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-2 h-11 text-olive-600 hover:text-sage-700 hover:bg-sage-50/50"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" strokeWidth="1.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-2 h-11 text-olive-600 hover:text-amber-600 hover:bg-amber-50/50"
            onClick={() => {
              toast({
                title: "Tipping coming soon",
                description: "This feature is under development.",
              })
            }}
          >
            <DollarSign className="h-5 w-5" strokeWidth="1.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`flex-1 gap-2 h-11 ${saved ? "text-sage-600" : "text-olive-600"} hover:text-sage-700 hover:bg-sage-50/50`}
            onClick={handleSave}
          >
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} strokeWidth="1.5" />
          </Button>
        </div>

        {/* Comments section -- inline, natural feel */}
        {showComments && (
          <div className="px-4 pb-4 pt-2 border-t border-sage-100">
            {/* Existing comments */}
            {(commentsData as any)?.results && (commentsData as any).results.length > 0 ? (
              <div className="space-y-3 mb-3">
                {(commentsData as any).results.map((comment: any) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={comment.user_image || "/placeholder.svg"} alt={comment.user_name} />
                      <AvatarFallback className="text-[10px]">{comment.user_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm text-olive-900">{comment.user_name}</span>
                        <span className="text-[11px] text-olive-400">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-olive-700 mt-0.5 leading-snug">{comment.content}</p>
                      {/* Show replies if any */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {comment.replies.map((reply: any) => (
                            <div key={reply.id} className="flex gap-2">
                              <Avatar className="h-5 w-5 shrink-0">
                                <AvatarImage src={reply.user_image || "/placeholder.svg"} alt={reply.user_name} />
                                <AvatarFallback className="text-[9px]">{reply.user_name?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-semibold text-xs text-olive-900">{reply.user_name}</span>
                                  <span className="text-[10px] text-olive-400">
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
              <p className="text-center text-xs text-olive-400 py-3">No comments yet. Be the first to comment!</p>
            )}

            {/* Comment input -- always visible at bottom when expanded */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <Input
                className="flex-1 border-sage-200 focus:border-sage-400 rounded-full h-9 text-sm px-4 bg-sage-50/50"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!comment.trim() || createCommentMutation.isPending}
                className="bg-olive-800 hover:bg-olive-700 rounded-full h-9 px-4 text-sm"
              >
                {createCommentMutation.isPending ? "..." : "Post"}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </>
  )
}
