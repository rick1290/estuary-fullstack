import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"
import { getAllPractitioners } from "@/lib/practitioners"
import ClientPractitionerRowCard from "./client-practitioner-row-card"

interface PractitionerListingsProps {
  query?: string
  location?: string
  modality?: string
  language?: string
  specialties?: string[]
  minRating?: string
  experienceLevel?: string
}

export default async function PractitionerListings({
  query,
  location,
  modality,
  language,
  specialties = [],
  minRating,
  experienceLevel,
}: PractitionerListingsProps) {
  // Fetch practitioners with filters
  const practitioners = await getAllPractitioners({
    query,
    location,
    modality,
    language,
    specialties,
    minRating: minRating ? Number.parseInt(minRating) : undefined,
    experienceLevel,
  })

  if (practitioners.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">No practitioners found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{practitioners.length}</span> practitioners
        </p>

        <Select defaultValue="relevance">
          <SelectTrigger className="w-[200px] bg-white border-gray-200">
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
        {practitioners.map((practitioner) => (
          <ClientPractitionerRowCard key={practitioner.id} practitioner={practitioner} />
        ))}
      </div>

      <div className="flex justify-center mt-8">
        <Pagination>
          <PaginationContent>
            {[...Array(10)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink href="#" isActive={i === 0}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
