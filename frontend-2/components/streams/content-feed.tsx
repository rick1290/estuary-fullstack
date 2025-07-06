"use client"

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
}

export default function ContentFeed({
  query,
  contentType,
  practitionerId,
  tags = [],
  showLocked = false,
  showSubscribed = false,
  sort = "recent",
}: ContentFeedProps) {
  const { user } = useAuth()
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

  // Fetch posts from API with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['streamPosts', query, contentType, tags, sort, showSubscribed, user?.id],
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

  // Map API response to StreamPost format
  const mapApiPostToStreamPost = (apiPost: any): StreamPost => {
    // For public users or non-subscribers, we want to show content preview (no full access)
    // The API should return all posts when include_all_tiers is true
    const hasAccess = apiPost.tier_level === 'free' || (apiPost.can_access || false)
    
    return {
      id: apiPost.public_uuid || apiPost.id,
      practitionerId: apiPost.practitioner_id || '',
      practitionerName: apiPost.practitioner_name || 'Unknown Practitioner',
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

  // Flatten pages of results
  const posts = data?.pages.flatMap(page => page.results?.map(mapApiPostToStreamPost) || []) || []

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
        <h3 className="mb-2 text-lg font-semibold text-muted-foreground">Error loading content</h3>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-muted-foreground">
          {showSubscribed ? "No posts from practitioners you follow" : "No content found"}
        </h3>
        <p className="text-muted-foreground">
          {showSubscribed ? "Follow some practitioners to see their content here" : "Try adjusting your filters or search query"}
        </p>
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

      {/* Load more button */}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
