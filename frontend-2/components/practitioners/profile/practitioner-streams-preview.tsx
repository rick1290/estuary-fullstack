"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { streamPostsList, streamsList } from "@/src/client/sdk.gen"
import { streamsSubscribeCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import ContentCard from "@/components/streams/content-card"
import StreamTierSidebar from "@/components/streams/stream-tier-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Rss, ArrowRight, FileText } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import type { StreamPost } from "@/types/stream"

interface PractitionerStreamsPreviewProps {
  practitionerId: string | number
  practitionerName: string
  practitionerSlug?: string
}

export default function PractitionerStreamsPreview({
  practitionerId,
  practitionerName,
  practitionerSlug
}: PractitionerStreamsPreviewProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch practitioner's stream info
  const { data: streamData } = useQuery({
    queryKey: ['practitionerStream', practitionerId],
    queryFn: async () => {
      const response = await streamsList({
        query: {
          practitioner: Number(practitionerId),
        } as any
      })
      return response.data?.results?.[0] || null
    },
    enabled: !!practitionerId
  })

  // Free follow mutation
  const followFreeMutation = useMutation({
    ...streamsSubscribeCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Following!",
        description: `You're now following ${streamData?.title || practitionerName}'s stream.`,
      })
      queryClient.invalidateQueries({ queryKey: ['practitionerStream'] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to follow",
        description: error?.body?.error || "Could not follow this stream.",
        variant: "destructive",
      })
    }
  })

  const handleFollowFree = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/practitioners/${practitionerSlug || practitionerId}`,
        title: "Sign in to Follow",
        description: "Create an account or sign in to follow this stream"
      })
      return
    }
    if (!streamData?.id) return
    followFreeMutation.mutate({
      path: { id: streamData.id },
      body: { tier: 'free' } as any
    })
  }

  const handleSubscribe = (tier: "entry" | "premium") => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/practitioners/${practitionerSlug || practitionerId}`,
        title: "Sign in to Subscribe",
        description: "Create an account or sign in to subscribe"
      })
      return
    }
    router.push(`/checkout/stream?streamId=${streamData?.public_uuid || streamData?.id}&tier=${tier}`)
  }

  const handleUpgrade = (tier: "entry" | "premium") => {
    if (!isAuthenticated) return
    router.push(`/checkout/stream?streamId=${streamData?.public_uuid || streamData?.id}&tier=${tier}`)
  }

  // Fetch practitioner's stream posts
  const { data, isLoading, isError } = useQuery({
    queryKey: ['practitionerStreams', practitionerId],
    queryFn: async () => {
      const response = await streamPostsList({
        query: {
          stream__practitioner: Number(practitionerId),
          page_size: 4,
          is_published: true,
          ordering: "-published_at"
        } as any // Backend supports stream__practitioner filter but types don't include it
      })
      return response.data
    },
    enabled: !!practitionerId
  })

  // Map API response to StreamPost format
  const mapApiPostToStreamPost = (apiPost: any): StreamPost => {
    const hasAccess = apiPost.tier_level === 'free' || (apiPost.can_access || false)

    return {
      id: apiPost.public_uuid || apiPost.id,
      practitionerId: apiPost.practitioner_id || '',
      practitionerSlug: apiPost.practitioner_slug || '',
      practitionerName: apiPost.practitioner_name || practitionerName,
      practitionerImage: apiPost.practitioner_image || '/placeholder.svg',
      streamId: apiPost.stream || '',
      streamTitle: apiPost.stream_title || '',
      content: apiPost.content || '',
      teaserText: apiPost.teaser_text || undefined,
      mediaUrls: apiPost.media?.map((m: any) => m.url ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${m.url}` : '') || [],
      contentType: apiPost.post_type as any || 'article',
      isPremium: apiPost.tier_level !== 'free',
      tierLevel: apiPost.tier_level,
      createdAt: apiPost.published_at || apiPost.created_at,
      likes: apiPost.like_count || 0,
      comments: apiPost.comment_count || 0,
      views: apiPost.view_count || 0,
      tags: apiPost.tags || [],
      isLiked: apiPost.is_liked || false,
      isSaved: apiPost.is_saved || false,
      hasAccess: hasAccess,
      userSubscriptionTier: apiPost.user_subscription_tier || null,
      linkedService: apiPost.linked_service_detail ? {
        id: apiPost.linked_service_detail.id,
        title: apiPost.linked_service_detail.title,
        serviceType: apiPost.linked_service_detail.service_type,
        price: parseFloat(apiPost.linked_service_detail.price),
        duration: apiPost.linked_service_detail.duration,
        slug: apiPost.linked_service_detail.slug,
        practitionerName: apiPost.linked_service_detail.practitioner_name,
      } : null,
    }
  }

  const posts = data?.results?.map(mapApiPostToStreamPost) || []
  const totalCount = data?.count || 0
  const hasMore = totalCount > 4

  // View all URL - go to streams page filtered by practitioner
  const viewAllUrl = `/streams?practitioner=${practitionerId}`

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-sage-600" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="border-sage-200">
        <CardContent className="py-8 text-center">
          <p className="text-olive-600">Unable to load streams. Please try again later.</p>
        </CardContent>
      </Card>
    )
  }

  if (posts.length === 0) {
    return (
      <Card className="border border-sage-200/60 bg-white rounded-2xl">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-sage-500" />
          </div>
          <h3 className="font-serif text-xl font-normal text-olive-900 mb-5">No Streams Yet</h3>
          <p className="text-[15px] font-light text-olive-600 leading-relaxed max-w-sm mx-auto">
            {practitionerName.split(' ')[0]} hasn&apos;t published any stream content yet.
            Check back soon for updates, insights, and exclusive content.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-sage-600" />
          <h2 className="font-serif text-xl font-normal text-olive-900">Estuary Streams</h2>
          {totalCount > 0 && (
            <span className="text-xs font-light text-olive-600">({totalCount} posts)</span>
          )}
        </div>
        {hasMore && (
          <Button variant="ghost" size="sm" asChild className="text-sage-700 hover:text-sage-800">
            <Link href={viewAllUrl}>
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Description */}
      <p className="text-[15px] font-light text-olive-600 leading-relaxed">
        Follow {practitionerName.split(' ')[0]}&apos;s journey with regular updates, insights, and exclusive content.
      </p>

      {/* Subscribe CTA */}
      {streamData && (
        <StreamTierSidebar
          stream={streamData}
          onFollowFree={handleFollowFree}
          onSubscribe={handleSubscribe}
          onUpgrade={handleUpgrade}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* View Full Stream link */}
      {streamData && (
        <div className="text-center">
          <Button
            variant="outline"
            asChild
            className="border-sage-300 text-sage-700 hover:bg-sage-50"
          >
            <Link href={`/streams/${streamData.public_uuid || streamData.id}`}>
              View Full Stream
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Stream Posts */}
      <div className="grid gap-4">
        {posts.map((post) => (
          <ContentCard key={post.id} post={post} />
        ))}
      </div>

      {/* View All Button */}
      {hasMore && (
        <div className="text-center pt-2">
          <Button variant="ghost" asChild className="text-olive-500 hover:text-olive-700 text-sm">
            <Link href={viewAllUrl}>
              View All {totalCount} Posts from {practitionerName.split(' ')[0]}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
