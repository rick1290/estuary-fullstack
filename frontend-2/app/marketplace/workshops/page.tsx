import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import WorkshopListings from "@/components/workshops/workshop-listings"

export const metadata: Metadata = {
  title: "Workshops | Estuary Marketplace",
  description: "Explore immersive workshops to enhance your skills and wellbeing",
}

interface WorkshopsPageProps {
  searchParams?: {
    q?: string
    location?: string
    categories?: string
  }
}

export default function WorkshopsPage({ searchParams }: WorkshopsPageProps) {
  const query = searchParams?.q || ""
  const location = searchParams?.location || ""
  const categories = searchParams?.categories ? searchParams.categories.split(",") : []

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
