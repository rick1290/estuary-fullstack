import { createMetadata } from "@/lib/seo"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata = createMetadata({
  title: "Sessions & Bundles",
  description: "Find personalized one-on-one sessions, bundles, and packages with expert practitioners.",
  path: "/marketplace/sessions",
})

interface SessionsPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const params = await searchParams
  const query = params?.q || ""

  return (
    <MarketplaceLayout
      title={<>Sessions & <em className="italic text-[#c4856a]">Bundles</em></>}
      eyebrow="Personal Sessions"
      description="Connect with practitioners for one-on-one sessions, bundles, and packages"
      initialSearchQuery={query}
    >
      <ServiceListings serviceTypes={["session", "bundle", "package"]} />
    </MarketplaceLayout>
  )
}
