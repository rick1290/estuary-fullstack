"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import StreamTierSidebar from "@/components/streams/stream-tier-sidebar"
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
    const userTier = (stream as any)?.user_subscription?.tier_level || null
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

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Stream header bar */}
      <div className="border-b border-sage-200/60 bg-white">
        <div className="container max-w-7xl py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-olive-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {stream && (
            <span
              className="text-sm text-sage-600 hover:text-sage-700 cursor-pointer transition-colors font-medium"
              onClick={() =>
                router.push(`/streams/${stream.public_uuid || stream.id}`)
              }
            >
              {stream.title}
            </span>
          )}
        </div>
      </div>

      <div className="container max-w-7xl py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {post && <ContentCard post={post} />}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {stream && (
              <div className="sticky top-6">
                <StreamTierSidebar
                  stream={stream}
                  onFollowFree={handleFollowFree}
                  onSubscribe={handleSubscribe}
                  onUpgrade={handleUpgrade}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
