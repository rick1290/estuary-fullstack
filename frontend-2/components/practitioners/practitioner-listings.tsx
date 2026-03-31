"use client"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useMarketplaceFilters } from "@/hooks/use-marketplace-filters"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ChevronLeft, ChevronRight, Star, MapPin, CheckCircle } from "lucide-react"
import Link from "next/link"

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

    if (query || filters.search) params.search = query || filters.search
    if (location || filters.location) params.location = location || filters.location
    if (categories.length > 0) params.categories = categories.join(',')

    // Modality filter from URL
    if (filters.modalities.length > 0) {
      params.modality_id = filters.modalities.join(',')
    }

    // Location format
    if (filters.locationFormat && filters.locationFormat !== 'all') {
      params.location_type = filters.locationFormat === 'online' ? 'virtual' : 'in_person'
    }

    return params
  }, [query, location, categories, filters, page, sortBy, PAGE_SIZE])

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[rgba(74,63,53,0.05)] p-5">
              <div className="flex items-start gap-3.5 mb-3">
                <Skeleton className="w-[72px] h-[72px] rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-24" />
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
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-olive-700">{startResult}-{endResult}</span> of {totalResults} practitioners
        </p>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Sort by" />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {apiPractitioners.map((practitioner) => (
          <PractitionerGridCard key={practitioner.public_uuid || practitioner.id} practitioner={practitioner} />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-8 sm:mt-12 flex items-center justify-center gap-1 sm:gap-2">
          <Button
            onClick={() => goToPage(page - 1)}
            variant="outline"
            size="icon"
            disabled={page === 1 || isLoading}
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {getPageNumbers().map((pageNum, idx) =>
              pageNum === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-1 sm:px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  disabled={isLoading}
                  className="h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm"
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
            className="h-8 w-8 sm:h-10 sm:w-10"
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

// ─── Grid Card ──────────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-[#E8EDE4] to-[#F5EDE2]",
  "from-[#E8C9A8] to-[#FAF7F2]",
  "from-[#E8E5E0] to-[#E8EDE4]",
  "from-[#F5EDE2] to-[#F0EDE8]",
  "from-[#F0DDB4] to-[#FAF7F2]",
]

function PractitionerGridCard({ practitioner }: { practitioner: any }) {
  const name = practitioner.display_name || `${practitioner.user?.first_name || ''} ${practitioner.user?.last_name || ''}`.trim() || "Practitioner"
  const title = practitioner.professional_title || ""
  const image = practitioner.profile_image_url || ""
  const slug = practitioner.slug || practitioner.public_uuid || practitioner.id
  const rating = practitioner.average_rating || practitioner.average_rating_float || 0
  const reviewCount = practitioner.total_reviews || practitioner.review_count || 0
  const yearsExp = practitioner.years_experience || practitioner.experience_years || 0
  const bio = practitioner.bio ? (practitioner.bio.length > 80 ? practitioner.bio.slice(0, 80) + "..." : practitioner.bio) : ""
  const specializations = (practitioner.specializations || []).slice(0, 3)
  const location = practitioner.primary_location?.city_name
    ? `${practitioner.primary_location.city_name}, ${practitioner.primary_location.state_abbreviation || ''}`
    : null
  const nameHash = name.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  const gradient = GRADIENTS[nameHash % GRADIENTS.length]

  return (
    <Link href={`/practitioners/${slug}`} className="group block h-full">
      <div className="h-full bg-white rounded-2xl border border-[rgba(74,63,53,0.05)] p-5 transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(74,63,53,0.08)]">
        {/* Top row: Avatar + Name + Title */}
        <div className="flex items-start gap-3.5 mb-3">
          {/* Circular avatar */}
          <div className="relative shrink-0">
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-[72px] h-[72px] rounded-full object-cover border-2 border-[rgba(74,63,53,0.06)]"
              />
            ) : (
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center border-2 border-[rgba(74,63,53,0.06)]`}>
                <span className="text-lg font-serif text-olive-600/60">{name.charAt(0)}</span>
              </div>
            )}
            {practitioner.is_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-sage-600 rounded-full flex items-center justify-center ring-2 ring-white">
                <CheckCircle className="h-3 w-3 text-white" fill="currentColor" strokeWidth={0} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-[17px] font-medium truncate group-hover:text-[#C4956A] transition-colors" style={{ color: "#4A3F35" }}>
              {name}
            </h3>
            {title && (
              <p className="text-[12px] truncate" style={{ color: "#7A8B6F" }}>
                {title}
              </p>
            )}
            {/* Rating inline with name */}
            {rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[12px] font-medium" style={{ color: "#4A3F35" }}>{Number(rating).toFixed(1)}</span>
                {reviewCount > 0 && <span className="text-[11px]" style={{ color: "#9B9590" }}>({reviewCount})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-[13px] leading-[1.5] mb-3 line-clamp-2" style={{ color: "#6B6560" }}>
            {bio}
          </p>
        )}

        {/* Tags */}
        {specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {specializations.map((s: any) => (
              <span key={s.id || s.name || s.content} className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8EDE4] text-[#6B6560]">
                {s.content || s.name || s}
              </span>
            ))}
          </div>
        )}

        {/* Bottom stats */}
        <div className="flex items-center gap-3 text-[11px] pt-2 border-t border-[rgba(74,63,53,0.05)]" style={{ color: "#9B9590" }}>
          {yearsExp > 0 && <span>{yearsExp}y experience</span>}
          {yearsExp > 0 && location && <span>·</span>}
          {location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {location}
            </span>
          )}
          {!yearsExp && !location && <span>View profile →</span>}
        </div>
      </div>
    </Link>
  )
}
