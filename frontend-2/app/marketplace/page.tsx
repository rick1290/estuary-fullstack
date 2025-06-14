import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata: Metadata = {
  title: "Marketplace | Estuary",
  description: "Discover courses, workshops, and sessions to support your wellness journey",
}

interface MarketplacePageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    categories?: string
  }>
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const location = params?.location || ""
  const categories = params?.categories ? params.categories.split(",") : []

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
