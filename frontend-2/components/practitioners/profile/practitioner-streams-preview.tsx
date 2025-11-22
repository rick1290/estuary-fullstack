"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { streamPostsList } from "@/src/client/sdk.gen"
import ContentCard from "@/components/streams/content-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Rss, ArrowRight, FileText } from "lucide-react"
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

  // Fetch practitioner's stream posts
  const { data, isLoading, isError } = useQuery({
    queryKey: ['practitionerStreams', practitionerId],
    queryFn: async () => {
      const response = await streamPostsList({
        query: {
          practitioner: Number(practitionerId),
          page_size: 4,
          is_published: true,
          ordering: "-published_at"
        } as any // Backend supports practitioner filter but types don't include it
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
      <Card className="border-sage-200 bg-gradient-to-br from-sage-50/50 to-cream-50">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-sage-600" />
          </div>
          <h3 className="text-lg font-semibold text-olive-800 mb-2">No Streams Yet</h3>
          <p className="text-olive-600 max-w-sm mx-auto">
            {practitionerName.split(' ')[0]} hasn't published any stream content yet.
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
          <h2 className="text-xl font-semibold text-olive-900">Estuary Streams</h2>
          {totalCount > 0 && (
            <span className="text-sm text-olive-600">({totalCount} posts)</span>
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
      <p className="text-olive-600">
        Follow {practitionerName.split(' ')[0]}'s journey with regular updates, insights, and exclusive content.
      </p>

      {/* Stream Posts */}
      <div className="grid gap-4">
        {posts.map((post) => (
          <ContentCard key={post.id} post={post} />
        ))}
      </div>

      {/* View All Button */}
      {hasMore && (
        <div className="text-center pt-2">
          <Button variant="outline" asChild className="border-sage-300 text-sage-700 hover:bg-sage-50">
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
