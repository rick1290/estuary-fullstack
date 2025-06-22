"use client"

import { use } from "react"
import StreamsLayout from "@/components/streams/streams-layout"
import ContentFeed from "@/components/streams/content-feed"
import FeaturedPractitioners from "@/components/streams/featured-practitioners"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"

export default function StreamsFollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user, isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  // Unwrap searchParams with React.use()
  const params = use(searchParams)
  
  // Extract search parameters
  const query = params.q as string | undefined
  const contentType = params.type as string | undefined
  const tags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []
  const sort = (params.sort as string | undefined) || "recent"

  // Show sign-in prompt for non-authenticated users
  if (!isAuthenticated) {
    return (
      <StreamsLayout
        title="Following"
        description="Content from practitioners you follow"
        initialSearchQuery=""
      >
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 rounded-full bg-sage-100 p-4">
            <svg
              className="h-12 w-12 text-sage-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-olive-900">Sign in to see your feed</h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Follow practitioners to see their latest content, updates, and exclusive streams in your personalized feed.
          </p>
          <Button
            onClick={() => {
              openAuthModal({
                defaultTab: "login",
                redirectUrl: "/streams/following",
                title: "Sign in to Follow",
                description: "Create an account or sign in to follow practitioners"
              })
            }}
            size="lg"
            className="rounded-full"
          >
            Sign in to continue
          </Button>
        </div>
      </StreamsLayout>
    )
  }

  return (
    <StreamsLayout
      title="Following"
      description="Content from practitioners you follow"
      initialSearchQuery={query || ""}
      rightSidebar={
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-olive-900">Discover More</h2>
            <FeaturedPractitioners />
          </div>
        </div>
      }
    >
      <div className="w-full">
        <h2 className="mb-4 text-xl font-semibold text-olive-900">
          {query ? `Search Results for "${query}"` : "Latest from Your Subscriptions"}
        </h2>

        <ContentFeed
          query={query}
          contentType={contentType}
          tags={tags as string[]}
          showSubscribed={true}
          sort={sort}
        />
      </div>
    </StreamsLayout>
  )
}