import { createMetadata } from "@/lib/seo"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
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
      title={<>Immersive <em className="italic text-[#c4856a]">Workshops</em></>}
      eyebrow="Group Experiences"
      description="Join transformative group experiences led by expert practitioners"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters showServiceTypeFilter={false} showCategoriesFilter={false} />}
      patternType="flow"
    >
      <ServiceListings serviceType="workshop" />
    </MarketplaceLayout>
  )
}
