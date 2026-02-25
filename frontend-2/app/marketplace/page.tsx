import { createMetadata } from "@/lib/seo"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata = createMetadata({
  title: "Wellness Marketplace",
  description: "Discover courses, workshops, and sessions to support your wellness journey.",
  path: "/marketplace",
})

interface MarketplacePageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams
  const query = params?.q || ""

  return (
    <MarketplaceLayout
      title="Wellness Marketplace"
      description="Discover transformative experiences to nurture your mind, body, and spirit"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="flow"
    >
      <ServiceListings />
    </MarketplaceLayout>
  )
}
