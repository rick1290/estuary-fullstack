import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import WorkshopListings from "@/components/workshops/workshop-listings"

export const metadata: Metadata = {
  title: "Workshops | Estuary Marketplace",
  description: "Explore immersive workshops to enhance your skills and wellbeing",
}

interface WorkshopsPageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    categories?: string
  }>
}

export default async function WorkshopsPage({ searchParams }: WorkshopsPageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const location = params?.location || ""
  const categories = params?.categories ? params.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Immersive Workshops"
      description="Join transformative group experiences led by expert practitioners"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="flow"
    >
      <WorkshopListings query={query} location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
