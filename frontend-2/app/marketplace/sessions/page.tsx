import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import SessionListings from "@/components/sessions/session-listings"

export const metadata: Metadata = {
  title: "Sessions | Estuary Marketplace",
  description: "Find personalized one-on-one sessions with expert practitioners",
}

interface SessionsPageProps {
  searchParams?: {
    q?: string
    location?: string
    categories?: string
  }
}

export default function SessionsPage({ searchParams }: SessionsPageProps) {
  const query = searchParams?.q || ""
  const location = searchParams?.location || ""
  const categories = searchParams?.categories ? searchParams.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Personalized Sessions"
      description="Connect with practitioners for one-on-one guidance and support"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="wave"
    >
      <SessionListings query={query} location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
