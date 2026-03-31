import { createMetadata } from "@/lib/seo"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import ServiceListings from "@/components/marketplace/service-listings"

export const metadata = createMetadata({
  title: "Courses",
  description: "Browse and discover transformative courses for your personal growth journey.",
  path: "/marketplace/courses",
})

interface CoursesPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams
  const query = params?.q || ""

  return (
    <MarketplaceLayout
      title={<>Transformative <em className="italic text-[#c4856a]">Courses</em></>}
      eyebrow="Learning Journeys"
      description="Discover comprehensive courses designed to guide your personal growth journey"
      initialSearchQuery={query}
    >
      <ServiceListings serviceType="course" />
    </MarketplaceLayout>
  )
}
