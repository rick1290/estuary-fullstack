import { createMetadata } from "@/lib/seo"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata = createMetadata({
  title: "Workshops",
  description: "Explore immersive workshops to enhance your skills and wellbeing.",
  path: "/marketplace/workshops",
})

interface WorkshopsPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function WorkshopsPage({ searchParams }: WorkshopsPageProps) {
  const params = await searchParams
  const query = params?.q || ""

  return (
    <MarketplaceLayout
      title={<>Immersive <em className="italic text-terracotta-600">Workshops</em></>}
      eyebrow="Group Experiences"
      description="Join transformative group experiences led by expert practitioners"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="flow"
    >
      <ServiceListings serviceType="workshop" />
    </MarketplaceLayout>
  )
}
