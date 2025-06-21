import { Suspense } from "react"
import MarketplaceFilters from "./marketplace-filters"
import { Skeleton } from "@/components/ui/skeleton"

interface MarketplaceFiltersWrapperProps {
  initialCategories?: string[]
  initialLocation?: string
  initialType?: string
  showServiceTypeFilter?: boolean
}

function MarketplaceFiltersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export default function MarketplaceFiltersWrapper(props: MarketplaceFiltersWrapperProps) {
  return (
    <Suspense fallback={<MarketplaceFiltersSkeleton />}>
      <MarketplaceFilters {...props} />
    </Suspense>
  )
}