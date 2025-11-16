import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFiltersWrapper from "@/components/marketplace/marketplace-filters-wrapper"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata: Metadata = {
  title: "Session Bundles | Estuary Marketplace",
  description: "Save with session bundles - get multiple sessions at discounted rates",
}

interface BundlesPageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    categories?: string
  }>
}

export default async function BundlesPage({ searchParams }: BundlesPageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const location = params?.location || ""
  const categories = params?.categories ? params.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Session Bundles"
      description="Get more value with discounted session bundles"
      initialSearchQuery={query}
      sidebar={<MarketplaceFiltersWrapper />}
      patternType="wave"
    >
      <ServiceListings query={query} serviceType="bundle" location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
