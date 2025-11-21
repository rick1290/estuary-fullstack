"use client"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useMarketplaceFilters } from "@/hooks/use-marketplace-filters"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
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
  const PAGE_SIZE = 12
  const { filters, updateFilter } = useMarketplaceFilters()
  const page = filters.page
  const [sortBy, setSortBy] = useState("relevance")

  // Build query parameters for API
  const queryParams = useMemo(() => {
    const params: any = {
      page_size: PAGE_SIZE,
      page: page,
      ordering: getOrdering(sortBy),
    }

    if (query) params.search = query
    if (location) params.location = location
    if (categories.length > 0) params.categories = categories.join(',')

    return params
  }, [query, location, categories, page, sortBy, PAGE_SIZE])

  // Fetch practitioners from API using public endpoint
  const { data: practitionersData, isLoading, error, refetch } = useQuery({
    ...publicPractitionersListOptions({ query: queryParams }),
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
  const totalPages = Math.ceil(totalResults / PAGE_SIZE)
  const hasMore = practitionersData?.next != null
  const currentCount = apiPractitioners.length

  // Calculate the range of results being shown
  const startResult = (page - 1) * PAGE_SIZE + 1
  const endResult = Math.min(page * PAGE_SIZE, totalResults)

  // Go to specific page
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateFilter('page', newPage, false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (page > 3) pages.push('ellipsis')
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <p className="text-sm text-olive-600">
          Showing <span className="font-medium text-olive-900">{startResult}-{endResult}</span> of <span className="font-medium text-olive-900">{totalResults}</span> practitioners
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
          <ClientPractitionerRowCard key={practitioner.public_uuid || practitioner.id} practitioner={practitioner} />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <Button
            onClick={() => goToPage(page - 1)}
            variant="outline"
            size="icon"
            disabled={page === 1 || isLoading}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, idx) =>
              pageNum === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  disabled={isLoading}
                  className="h-10 w-10"
                >
                  {pageNum}
                </Button>
              )
            )}
          </div>

          <Button
            onClick={() => goToPage(page + 1)}
            variant="outline"
            size="icon"
            disabled={!hasMore || isLoading}
            className="h-10 w-10"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        </div>
      )}
    </div>
  )
}
