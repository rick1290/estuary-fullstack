"use client"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { practitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import ClientPractitionerRowCard from "./client-practitioner-row-card"

interface PractitionerListingsProps {
  query?: string
  location?: string
  categories?: string[]
}

export default function PractitionerListings({
  query,
  location,
  categories = [],
}: PractitionerListingsProps) {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState("relevance")
  const limit = 12

  // Build query parameters for API
  const queryParams = useMemo(() => {
    const params: any = {
      limit,
      offset: (page - 1) * limit,
      ordering: getOrdering(sortBy),
    }

    if (query) params.search = query
    if (location) params.location = location
    if (categories.length > 0) params.categories = categories.join(',')

    return params
  }, [query, location, categories, page, sortBy])

  // Fetch practitioners from API
  const { data: practitionersData, isLoading, error, refetch } = useQuery({
    ...practitionersListOptions({ query: queryParams }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // Extract practitioners array and handle both paginated and direct responses
  const apiPractitioners = Array.isArray(practitionersData) ? practitionersData : 
                          (practitionersData?.results && Array.isArray(practitionersData.results)) ? practitionersData.results : []

  // Helper function to map sort options to API ordering
  function getOrdering(sortValue: string): string {
    switch (sortValue) {
      case "rating-desc": return "-average_rating"
      case "experience-desc": return "-years_experience"
      case "price-asc": return "min_price"
      case "price-desc": return "-min_price"
      case "relevance":
      default: return "-featured,-average_rating"
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex flex-col gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border p-6 flex gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load practitioners. 
            <Button 
              variant="link" 
              className="text-red-600 p-0 h-auto text-sm ml-1" 
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Empty state
  if (apiPractitioners.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2 text-olive-900">No practitioners found</h3>
        <p className="text-olive-600">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  // Pagination info
  const totalResults = practitionersData?.count || apiPractitioners.length
  const hasMore = practitionersData?.next != null
  const currentCount = apiPractitioners.length

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <p className="text-sm text-olive-600">
          Showing <span className="font-medium text-olive-900">{currentCount}</span> of <span className="font-medium text-olive-900">{totalResults}</span> practitioners
        </p>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px] bg-white border-sage-300 rounded-xl">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="rating-desc">Highest Rated</SelectItem>
            <SelectItem value="experience-desc">Most Experienced</SelectItem>
            <SelectItem value="price-asc">Lowest Price</SelectItem>
            <SelectItem value="price-desc">Highest Price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-4">
        {apiPractitioners.map((practitioner) => (
          <ClientPractitionerRowCard key={practitioner.id || practitioner.public_uuid} practitioner={practitioner} />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-12 text-center">
          <Button 
            onClick={() => setPage(prev => prev + 1)}
            variant="outline"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More Practitioners'}
          </Button>
        </div>
      )}
    </div>
  )
}
