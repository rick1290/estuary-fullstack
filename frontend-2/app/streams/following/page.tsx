"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import StreamsLayout from "@/components/streams/streams-layout"
import ContentFeed from "@/components/streams/content-feed"
import FeaturedPractitioners from "@/components/streams/featured-practitioners"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

export default function StreamsFollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user, isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const router = useRouter()

  // Unwrap searchParams with React.use()
  const params = use(searchParams)
  
  // Extract search parameters
  const query = params.q as string | undefined
  const contentType = params.type as string | undefined
  const tags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []
  const sort = (params.sort as string | undefined) || "recent"

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: "/streams/following",
        title: "Sign in Required",
        description: "Please sign in to see content from practitioners you follow"
      })
      router.push("/streams")
    }
  }, [isAuthenticated, openAuthModal, router])

  if (!isAuthenticated) {
    return null
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