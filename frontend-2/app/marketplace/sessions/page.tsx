import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFiltersWrapper from "@/components/marketplace/marketplace-filters-wrapper"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata: Metadata = {
  title: "Sessions | Estuary Marketplace",
  description: "Find personalized one-on-one sessions with expert practitioners",
}

interface SessionsPageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    categories?: string
  }>
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const location = params?.location || ""
  const categories = params?.categories ? params.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Personalized Sessions"
      description="Connect with practitioners for one-on-one guidance and support"
      initialSearchQuery={query}
      sidebar={<MarketplaceFiltersWrapper />}
      patternType="wave"
    >
      <ServiceListings query={query} serviceType="session" location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
