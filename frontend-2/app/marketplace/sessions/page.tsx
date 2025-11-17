import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFiltersWrapper from "@/components/marketplace/marketplace-filters-wrapper"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata: Metadata = {
  title: "Sessions & Bundles | Estuary Marketplace",
  description: "Find personalized one-on-one sessions, bundles, and packages with expert practitioners",
}

interface SessionsPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const params = await searchParams
  const query = params?.q || ""

  return (
    <MarketplaceLayout
      title="Sessions & Bundles"
      description="Connect with practitioners for one-on-one sessions, bundles, and packages"
      initialSearchQuery={query}
      sidebar={<MarketplaceFiltersWrapper />}
      patternType="wave"
    >
      <ServiceListings serviceTypes={["session", "bundle", "package"]} />
    </MarketplaceLayout>
  )
}
