import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import PractitionerListings from "@/components/practitioners/practitioner-listings"

export const metadata: Metadata = {
  title: "Practitioners | Estuary Marketplace",
  description: "Discover expert practitioners to guide your wellness journey",
}

interface PractitionersPageProps {
  searchParams?: {
    q?: string
    location?: string
    categories?: string
  }
}

export default function PractitionersPage({ searchParams }: PractitionersPageProps) {
  const query = searchParams?.q || ""
  const location = searchParams?.location || ""
  const categories = searchParams?.categories ? searchParams.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Expert Guides"
      description="Connect with practitioners who can support your personal growth journey"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="leaf"
    >
      <PractitionerListings query={query} location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
