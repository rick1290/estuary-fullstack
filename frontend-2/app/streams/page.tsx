import { Suspense } from "react"
import StreamsLayout from "@/components/streams/streams-layout"
import StreamsFilters from "@/components/streams/streams-filters"
import ContentFeed from "@/components/streams/content-feed"
import LoadingSpinner from "@/components/ui/loading-spinner"
import FeaturedPractitioners from "@/components/streams/featured-practitioners"

export default function StreamsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Extract search parameters
  const query = searchParams.q as string | undefined
  const contentType = searchParams.type as string | undefined
  const practitionerId = searchParams.practitioner as string | undefined
  const tags = Array.isArray(searchParams.tag) ? searchParams.tag : searchParams.tag ? [searchParams.tag] : []
  const showLocked = searchParams.locked === "true"
  const sort = (searchParams.sort as string | undefined) || "recent"

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
        />
      }
      rightSidebar={
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Featured Practitioners</h2>
            <FeaturedPractitioners />
          </div>
        </div>
      }
    >
      <div className="w-full">
        <h2 className="mb-4 text-xl font-semibold">
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
            sort={sort}
          />
        </Suspense>
      </div>
    </StreamsLayout>
  )
}
