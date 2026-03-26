import { createMetadata } from "@/lib/seo"
import { Suspense, use } from "react"

export const metadata = createMetadata({
  title: "Streams — Wellness Content",
  description:
    "Discover articles, videos, and audio content from wellness practitioners. Free and premium content on yoga, meditation, breathwork, and more.",
  path: "/streams",
})
import StreamsLayout from "@/components/streams/streams-layout"
import ContentFeed from "@/components/streams/content-feed"
import LoadingSpinner from "@/components/ui/loading-spinner"
import FeaturedPractitioners from "@/components/streams/featured-practitioners"

export default function StreamsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = use(searchParams)

  const query = params.q as string | undefined
  const contentType = params.type as string | undefined
  const practitionerId = params.practitioner as string | undefined
  const tags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []
  const showLocked = params.locked === "true"
  const showSubscribed = params.subscribed === "true"
  const sort = (params.sort as string | undefined) || "recent"
  const modality = params.modality as string | undefined

  return (
    <StreamsLayout
      title="Streams"
      description="Discover inspiring content from our community of practitioners"
      initialSearchQuery={query || ""}
      rightSidebar={<FeaturedPractitioners />}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <ContentFeed
          query={query}
          contentType={contentType}
          practitionerId={practitionerId}
          tags={tags as string[]}
          showLocked={showLocked}
          showSubscribed={showSubscribed}
          sort={sort}
          modality={modality}
        />
      </Suspense>
    </StreamsLayout>
  )
}
