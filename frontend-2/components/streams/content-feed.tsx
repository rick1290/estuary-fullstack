"use client"

import { useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Newspaper, Heart } from "lucide-react"
import ContentCard from "./content-card"
import type { StreamPost } from "@/types/stream"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { useInfiniteQuery } from "@tanstack/react-query"
import { streamPostsList } from "@/src/client/sdk.gen"
import { useAuth } from "@/hooks/use-auth"

interface ContentFeedProps {
  query?: string
  contentType?: string
  practitionerId?: string
  tags?: string[]
  showLocked?: boolean
  showSubscribed?: boolean
  sort?: string
  modality?: string
}

export default function ContentFeed({
  query,
  contentType,
  practitionerId,
  tags = [],
  showLocked = false,
  showSubscribed = false,
  sort = "recent",
  modality,
}: ContentFeedProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pageSize = 10

  // Build query parameters
  const queryParams: any = {
    page_size: pageSize,
    is_published: true, // Only show published posts
    include_all_tiers: true, // Show all content for preview purposes
  }

  // Add search query
  if (query) {
    queryParams.search = query
  }

  // Add content type filter
  if (contentType) {
    queryParams.post_type = contentType
  }

  // Add tags filter
  if (tags.length > 0) {
    queryParams.tags = tags.join(',')
  }

  // Add modality filter
  if (modality) {
    queryParams.modality = modality
  }

  // Add sorting
  if (sort === "recent") {
    queryParams.ordering = "-published_at"
  } else if (sort === "trending") {
    queryParams.ordering = "-view_count"
  } else if (sort === "engagement") {
    queryParams.ordering = "-like_count,-comment_count"
  }

  // Add subscribed filter
  if (showSubscribed && user) {
    queryParams.subscribed_only = true
  }

  // Add practitioner filter (stream__practitioner is the Django filter field)
  if (practitionerId) {
    queryParams.stream__practitioner = Number(practitionerId)
  }

  // Fetch posts from API with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['streamPosts', query, contentType, practitionerId, tags, sort, showSubscribed, modality, user?.id],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await streamPostsList({
        query: {
          ...queryParams,
          page: pageParam
        }
      })
      return response.data
    },
    getNextPageParam: (lastPage, pages) => {
      // Check if there's a next page
      if (lastPage?.next) {
        return pages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
  })

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Map API response to StreamPost format
  const mapApiPostToStreamPost = (apiPost: any): StreamPost => {
    // For public users or non-subscribers, we want to show content preview (no full access)
    // The API should return all posts when include_all_tiers is true
    const hasAccess = apiPost.tier_level === 'free' || (apiPost.can_access || false)

    return {
      id: apiPost.public_uuid || apiPost.id,
      practitionerId: apiPost.practitioner_id || '',
      practitionerSlug: apiPost.practitioner_slug || '',
      practitionerName: apiPost.practitioner_name || 'Unknown Practitioner',
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

  // Flatten pages of results
  const posts = data?.pages.flatMap(page => (page as any).results?.map(mapApiPostToStreamPost) || []) || []

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-8 text-center">
        <h3 className="mb-2 font-serif text-lg font-light text-muted-foreground">Error loading content</h3>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        {showSubscribed ? (
          <>
            <div className="p-4 bg-sage-50 rounded-full mb-4">
              <Heart className="h-10 w-10 text-sage-400" strokeWidth="1.5" />
            </div>
            <h3 className="font-serif text-xl font-light text-olive-900 mb-2 text-center">
              No posts from your subscriptions
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Follow practitioners and subscribe to streams to see their content here
            </p>
            <Button onClick={() => router.push('/streams')} variant="outline">
              Explore Streams
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 bg-sage-50 rounded-full mb-4">
              <Newspaper className="h-10 w-10 text-sage-400" strokeWidth="1.5" />
            </div>
            <h3 className="font-serif text-xl font-light text-olive-900 mb-2 text-center">
              No content found
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Try adjusting your filters or search query to discover more content
            </p>
            <Button onClick={() => router.push('/streams')} variant="outline">
              Explore Streams
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <ContentCard key={post.id} post={post} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </div>
  )
}
