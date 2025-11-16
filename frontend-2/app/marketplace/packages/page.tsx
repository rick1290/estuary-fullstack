import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFiltersWrapper from "@/components/marketplace/marketplace-filters-wrapper"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata: Metadata = {
  title: "Wellness Packages | Estuary Marketplace",
  description: "Discover complete wellness packages combining multiple services for a comprehensive transformation",
}

interface PackagesPageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    categories?: string
  }>
}

export default async function PackagesPage({ searchParams }: PackagesPageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const location = params?.location || ""
  const categories = params?.categories ? params.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Wellness Packages"
      description="Complete wellness packages designed for your transformation journey"
      initialSearchQuery={query}
      sidebar={<MarketplaceFiltersWrapper />}
      patternType="wave"
    >
      <ServiceListings query={query} serviceType="package" location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
