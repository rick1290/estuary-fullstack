"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FilterX } from "lucide-react"

interface EmptyStateProps {
  selectedType: string
  hasFilters: boolean
  onClearFilters: () => void
}

export default function EmptyState({ selectedType, hasFilters, onClearFilters }: EmptyStateProps) {
  // Get the service type label
  const getServiceTypeLabel = () => {
    switch (selectedType) {
      case "course":
        return "courses"
      case "workshop":
        return "workshops"
      case "one_on_one":
        return "one-on-one sessions"
      case "package":
        return "packages"
      case "bundle":
        return "bundles"
      default:
        return "services"
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {hasFilters ? (
        <>
          <div className="bg-muted rounded-full p-3 mb-4">
            <FilterX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No matching services found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            We couldn't find any {getServiceTypeLabel()} that match your current filters. Try adjusting your search or
            filters to see more results.
          </p>
          <Button onClick={onClearFilters} variant="outline">
            Clear All Filters
          </Button>
        </>
      ) : (
        <>
          <div className="bg-muted rounded-full p-3 mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            You haven't created any {getServiceTypeLabel()} yet. Get started by creating your first service.
          </p>
          <Button asChild>
            <Link href="/dashboard/practitioner/services/create">
              <Plus className="mr-2 h-4 w-4" />
              Create New Service
            </Link>
          </Button>
        </>
      )}
    </div>
  )
}
