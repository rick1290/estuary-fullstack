import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import CourseListings from "@/components/courses/course-listings"

export const metadata: Metadata = {
  title: "Courses | Estuary Marketplace",
  description: "Browse and discover transformative courses for your personal growth journey",
}

interface CoursesPageProps {
  searchParams: Promise<{
    q?: string
    location?: string
    categories?: string
  }>
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const location = params?.location || ""
  const categories = params?.categories ? params.categories.split(",") : []

  return (
    <MarketplaceLayout
      title="Transformative Courses"
      description="Discover comprehensive courses designed to guide your personal growth journey"
      initialSearchQuery={query}
      sidebar={<MarketplaceFilters />}
      patternType="leaf"
    >
      <CourseListings query={query} location={location} categories={categories} />
    </MarketplaceLayout>
  )
}
