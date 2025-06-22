import { Suspense, use } from "react"
import StreamsLayout from "@/components/streams/streams-layout"
import StreamsFilters from "@/components/streams/streams-filters"
import ContentFeed from "@/components/streams/content-feed"
import LoadingSpinner from "@/components/ui/loading-spinner"
import FeaturedPractitioners from "@/components/streams/featured-practitioners"

export default function StreamsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Unwrap searchParams with React.use()
  const params = use(searchParams)
  
  // Extract search parameters
  const query = params.q as string | undefined
  const contentType = params.type as string | undefined
  const practitionerId = params.practitioner as string | undefined
  const tags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []
  const showLocked = params.locked === "true"
  const showSubscribed = params.subscribed === "true"
  const sort = (params.sort as string | undefined) || "recent"

  return (
    <StreamsLayout
      title="Streams"
      description="Discover inspiring content from our community of practitioners"
      initialSearchQuery={query || ""}
      sidebar={
        <StreamsFilters
          initialContentType={contentType}
          initialTags={tags as string[]}
          initialShowLocked={showLocked}
          initialSort={sort}
          initialSubscribed={showSubscribed}
        />
      }
      rightSidebar={
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-olive-900">Featured Practitioners</h2>
            <FeaturedPractitioners />
          </div>
        </div>
      }
    >
      <div className="w-full">
        <h2 className="mb-4 text-xl font-semibold text-olive-900">
          {query
            ? `Search Results for "${query}"`
            : contentType
              ? `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Content`
              : "Latest Content"}
        </h2>

        <Suspense fallback={<LoadingSpinner />}>
          <ContentFeed
            query={query}
            contentType={contentType}
            practitionerId={practitionerId}
            tags={tags as string[]}
            showLocked={showLocked}
            showSubscribed={showSubscribed}
            sort={sort}
          />
        </Suspense>
      </div>
    </StreamsLayout>
  )
}
