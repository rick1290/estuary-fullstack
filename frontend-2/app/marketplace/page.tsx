import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata: Metadata = {
  title: "Marketplace | Estuary",
  description: "Discover courses, workshops, and sessions to support your wellness journey",
}

interface MarketplacePageProps {
  searchParams?: {
    q?: string
    location?: string
    categories?: string
  }
}

export default function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const query = searchParams?.q || ""
  const location = searchParams?.location || ""
  const categories = searchParams?.categories ? searchParams.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Wellness Marketplace"
      description="Discover transformative experiences to nurture your mind, body, and spirit"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="flow"
    >
      <ServiceListings query={query} location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
