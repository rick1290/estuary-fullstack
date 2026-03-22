"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Heart, Zap, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  streamPostsRetrieveOptions,
  streamsRetrieveOptions,
  streamsSubscribeCreateMutation,
} from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Spinner } from "@/components/ui/spinner"
import ContentCard from "@/components/streams/content-card"
import type { StreamPost } from "@/types/stream"

interface PostPageContentProps {
  uuid: string
}

export default function PostPageContent({ uuid }: PostPageContentProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch the post
  const { data: apiPost, isLoading: postLoading } = useQuery({
    ...streamPostsRetrieveOptions({
      path: { public_uuid: uuid },
    }),
  })

  // Fetch the stream for sidebar
  const streamId = apiPost?.stream
  const { data: stream } = useQuery({
    ...streamsRetrieveOptions({
      path: { id: streamId as any },
    }),
    enabled: !!streamId,
  })

  // Free follow mutation
  const followFreeMutation = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Following!",
        description: `You're now following ${stream?.title}.`,
      })
      queryClient.invalidateQueries({ queryKey: ["streamsRetrieve"] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to follow",
        description: error?.body?.error || "Could not follow this stream.",
        variant: "destructive",
      })
    },
  })

  const handleFollowFree = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/streams/post/${uuid}`,
        title: "Sign in to Follow",
        description: "Create an account or sign in to follow this stream for free",
      })
      return
    }
    if (!stream?.id) return
    followFreeMutation.mutate({
      path: { id: stream.id },
      body: { tier: "free" } as any,
    })
  }

  const handleSubscribe = (tier: "entry" | "premium") => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/streams/post/${uuid}`,
        title: "Sign in to Subscribe",
        description: "Create an account or sign in to subscribe",
      })
      return
    }
    router.push(
      `/checkout/stream?streamId=${stream?.public_uuid || streamId}&tier=${tier}`
    )
  }

  const handleUpgrade = (tier: "entry" | "premium") => {
    if (!isAuthenticated) return
    router.push(
      `/checkout/stream?streamId=${stream?.public_uuid || streamId}&tier=${tier}`
    )
  }

  // Map API post to StreamPost
  const mapPost = (post: any): StreamPost | null => {
    if (!post) return null
    const userTier = (stream as any)?.subscription_tier || null
    const hasAccess = userTier ? post.can_access || false : false

    return {
      id: post.public_uuid || post.id,
      practitionerId: post.practitioner_id || stream?.practitioner_id || "",
      practitionerSlug:
        post.practitioner_slug || stream?.practitioner_slug || "",
      practitionerName:
        post.practitioner_name || stream?.practitioner_name || "Practitioner",
      practitionerImage:
        post.practitioner_image || stream?.practitioner_image || "/placeholder.svg",
      streamId: post.stream || stream?.id || "",
      streamTitle: post.stream_title || stream?.title || "",
      content: post.content || "",
      teaserText: post.teaser_text || undefined,
      mediaUrls:
        post.media?.map(
          (m: any) =>
            m.url
              ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${m.url}`
              : ""
        ) || [],
      contentType: (post.post_type as any) || "article",
      isPremium: post.tier_level !== "free",
      tierLevel: post.tier_level,
      createdAt: post.published_at || post.created_at,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      views: post.view_count || 0,
      tags: post.tags || [],
      isLiked: post.is_liked || false,
      isSaved: post.is_saved || false,
      hasAccess,
      userSubscriptionTier: userTier,
      linkedService: post.linked_service_detail ? {
        id: post.linked_service_detail.id,
        title: post.linked_service_detail.title,
        serviceType: post.linked_service_detail.service_type,
        price: parseFloat(post.linked_service_detail.price),
        duration: post.linked_service_detail.duration,
        slug: post.linked_service_detail.slug,
        practitionerName: post.linked_service_detail.practitioner_name,
      } : null,
    }
  }

  if (postLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!apiPost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-light text-olive-900 mb-2">
            Post not found
          </h2>
          <p className="text-muted-foreground mb-4">
            This post may have been removed or doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push("/streams")}>Back to Streams</Button>
        </div>
      </div>
    )
  }

  const post = mapPost(apiPost)

  const currentTier = (stream as any)?.subscription_tier || null
  const entryPrice = ((stream?.entry_tier_price_cents || 0) / 100).toFixed(0)
  const premiumPrice = ((stream?.premium_tier_price_cents || 0) / 100).toFixed(0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8 text-olive-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {stream && (
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => router.push(`/streams/${stream.public_uuid || stream.id}`)}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={stream.practitioner_image} />
                <AvatarFallback className="text-xs bg-sage-100">
                  {stream.practitioner_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-olive-900 truncate">
                {stream.title}
              </span>
            </div>
          )}
          {stream && !currentTier && (
            <Button
              size="sm"
              onClick={() => handleSubscribe("entry")}
              className="bg-sage-700 hover:bg-sage-800 text-white text-xs"
            >
              Subscribe
            </Button>
          )}
        </div>
      </div>

      {/* Single column post */}
      <div className="max-w-2xl mx-auto py-6 px-4">
        {post && <ContentCard post={post} />}

        {/* Inline subscribe prompt below post */}
        {stream && !currentTier && (
          <div className="mt-6 p-6 bg-white rounded-2xl border border-sage-200/60 text-center">
            <Avatar className="h-14 w-14 mx-auto mb-3">
              <AvatarImage src={stream.practitioner_image} />
              <AvatarFallback className="bg-sage-100 text-olive-800">
                {stream.practitioner_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-medium text-olive-900 mb-1">{stream.practitioner_name}</h3>
            <p className="text-sm text-olive-600 mb-4">
              Subscribe for exclusive content
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleFollowFree}
                className="border-sage-300"
              >
                <Heart className="h-4 w-4 mr-2" />
                Follow Free
              </Button>
              <Button
                onClick={() => handleSubscribe("entry")}
                className="bg-sage-700 hover:bg-sage-800"
              >
                <Zap className="h-4 w-4 mr-2" />
                {stream.entry_tier_name || "Entry"} ${entryPrice}/mo
              </Button>
              <Button
                onClick={() => handleSubscribe("premium")}
                className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                {stream.premium_tier_name || "Premium"} ${premiumPrice}/mo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
