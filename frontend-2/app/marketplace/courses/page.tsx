import type { Metadata } from "next"
import MarketplaceLayout from "@/components/marketplace/marketplace-layout"
import MarketplaceFilters from "@/components/marketplace/marketplace-filters"
import CourseListings from "@/components/courses/course-listings"

export const metadata: Metadata = {
  title: "Courses | Estuary Marketplace",
  description: "Browse and discover transformative courses for your personal growth journey",
}

interface CoursesPageProps {
  searchParams?: {
    q?: string
    location?: string
    categories?: string
  }
}

export default function CoursesPage({ searchParams }: CoursesPageProps) {
  const query = searchParams?.q || ""
  const location = searchParams?.location || ""
  const categories = searchParams?.categories ? searchParams.categories.split(",") : []

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
