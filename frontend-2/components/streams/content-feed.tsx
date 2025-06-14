"use client"

import { useState, useEffect } from "react"
import ContentCard from "./content-card"
import { getMockStreamPosts } from "@/lib/mock-stream-data"
import type { StreamPost } from "@/types/stream"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface ContentFeedProps {
  query?: string
  contentType?: string
  practitionerId?: string
  tags?: string[]
  showLocked?: boolean
  sort?: string
}

export default function ContentFeed({
  query,
  contentType,
  practitionerId,
  tags = [],
  showLocked = false,
  sort = "recent",
}: ContentFeedProps) {
  const [posts, setPosts] = useState<StreamPost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Fetch posts
  useEffect(() => {
    setLoading(true)
    setPosts([])
    setPage(1)
    setHasMore(true)

    // In a real app, this would be an API call with filters
    const fetchedPosts = getMockStreamPosts()
      .filter((post) => {
        // Filter by content type
        if (contentType && post.contentType !== contentType) {
          return false
        }

        // Filter by practitioner
        if (practitionerId && post.practitionerId !== practitionerId) {
          return false
        }

        // Filter by tags
        if (tags.length > 0 && !tags.some((tag) => post.tags.includes(tag))) {
          return false
        }

        // Filter by locked status
        if (!showLocked && post.isPremium) {
          return false
        }

        // Filter by search query
        if (query) {
          const searchTerms = query.toLowerCase().split(" ")
          const searchableText = `${post.practitionerName} ${post.content} ${post.tags.join(" ")}`.toLowerCase()
          return searchTerms.every((term) => searchableText.includes(term))
        }

        return true
      })
      .sort((a, b) => {
        // Sort by selected option
        if (sort === "recent") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        } else if (sort === "trending") {
          return b.views - a.views
        } else if (sort === "engagement") {
          return b.likes + b.comments * 2 - (a.likes + a.comments * 2)
        }
        return 0
      })
      .slice(0, 10) // Initial page

    setTimeout(() => {
      setPosts(fetchedPosts)
      setLoading(false)
      setHasMore(fetchedPosts.length === 10) // If we got less than 10, there's no more
    }, 1000) // Simulate network delay
  }, [query, contentType, practitionerId, tags, showLocked, sort])

  // Load more posts
  const loadMore = () => {
    setLoading(true)
    const nextPage = page + 1

    // In a real app, this would be an API call with pagination
    const morePosts = getMockStreamPosts()
      .filter((post) => {
        // Same filters as above
        if (contentType && post.contentType !== contentType) {
          return false
        }
        if (practitionerId && post.practitionerId !== practitionerId) {
          return false
        }
        if (tags.length > 0 && !tags.some((tag) => post.tags.includes(tag))) {
          return false
        }
        if (!showLocked && post.isPremium) {
          return false
        }
        if (query) {
          const searchTerms = query.toLowerCase().split(" ")
          const searchableText = `${post.practitionerName} ${post.content} ${post.tags.join(" ")}`.toLowerCase()
          return searchTerms.every((term) => searchableText.includes(term))
        }
        return true
      })
      .sort((a, b) => {
        if (sort === "recent") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        } else if (sort === "trending") {
          return b.views - a.views
        } else if (sort === "engagement") {
          return b.likes + b.comments * 2 - (a.likes + a.comments * 2)
        }
        return 0
      })
      .slice(nextPage * 10 - 10, nextPage * 10)

    setTimeout(() => {
      setPosts([...posts, ...morePosts])
      setPage(nextPage)
      setLoading(false)
      setHasMore(morePosts.length === 10)
    }, 1000)
  }

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No content found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search query</p>
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

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading} className="px-4 py-1">
            {loading ? <Spinner className="h-6 w-6" /> : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}
