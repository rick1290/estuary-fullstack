"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Search, SlidersHorizontal, X, LayoutGrid, List } from "lucide-react"
import ServiceCard from "./service-card"
import ServiceListItem from "./service-list-item"
import { servicesListOptions, servicesPartialUpdateMutation, servicesDestroyMutation } from "@/src/client/@tanstack/react-query.gen"
import type { ServiceListReadable } from "@/src/client/types.gen"
import EmptyState from "./empty-state"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useAuth } from "@/hooks/use-auth"
import { PractitionerPageHeader } from "../practitioner-page-header"

// Service types for filtering
const SERVICE_TYPE_TABS = [
  { value: "all", label: "All Services" },
  { value: "session", label: "Sessions" },
  { value: "workshop", label: "Workshops" },
  { value: "course", label: "Courses" },
  { value: "package", label: "Packages" },
  { value: "bundle", label: "Bundles" },
]

// Sort options
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "price_high", label: "Price (High to Low)" },
  { value: "price_low", label: "Price (Low to High)" },
]

// Status options for filtering
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
]

// View options
type ViewMode = "grid" | "list"

// Convert API service to display format
const convertServiceForDisplay = (service: ServiceListReadable): any => {
  const priceValue = service.price ? parseFloat(service.price.replace(/[^0-9.-]+/g,"")) : (service.price_cents / 100)
  
  // Map service type codes to our expected types
  let serviceType = service.service_type_code || 'session'
  if (serviceType === 'in-person_session' || serviceType === 'online_session') {
    serviceType = 'session'
  }
  
  return {
    id: service.id?.toString() || '',
    name: service.name,
    slug: service.slug, // Add the slug property
    description: service.short_description || '',
    price: priceValue.toFixed(2),
    duration: service.duration_minutes,
    type: serviceType, // Map to 'type' property
    service_type: {
      id: service.service_type,
      name: service.service_type_display || '',
      code: service.service_type_code || ''
    },
    service_type_code: service.service_type_code, // Also add service_type_code for the utility function
    category: service.category ? {
      id: service.category.id?.toString() || '',
      name: service.category.name,
      slug: service.category.slug || '',
      description: service.category.description || ''
    } : null,
    is_active: service.is_active || false,
    is_featured: service.is_featured || false,
    status: service.status || 'draft',
    image_url: service.primary_image || '/images/placeholder-service.jpg',
    average_rating: service.average_rating || null,
    total_reviews: parseInt(service.total_reviews || '0'),
    total_bookings: parseInt(service.total_bookings || '0'),
    bookings: parseInt(service.total_bookings || '0'),
    sessions: 1, // Default sessions count
    updatedAt: service.updated_at || new Date().toISOString(),
    created_at: service.created_at || new Date().toISOString()
  }
}

export default function PractitionerServicesManagerV2() {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [showFilters, setShowFilters] = useState(!isMobile)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Build query parameters based on filters
  const queryParams = {
    ...(user?.practitionerId && { practitioner: user.practitionerId }), // Filter by current practitioner
    ...(activeTab !== "all" && { service_type: activeTab }),
    ...(selectedStatus !== "all" && { status: selectedStatus }),
    ...(searchQuery && { search: searchQuery }),
    page_size: pageSize,
    page: currentPage,
  }

  // Fetch services using React Query
  const { data: servicesData, isLoading } = useQuery({
    ...servicesListOptions({ query: queryParams }),
    enabled: !!user, // Fetch when we have user data
  })

  // Get services from the API response  
  const services = servicesData?.data?.results || servicesData?.results || []
  const totalCount = servicesData?.count || servicesData?.data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = servicesData?.next || servicesData?.data?.next
  const hasPreviousPage = servicesData?.previous || servicesData?.data?.previous

  // Sort services based on selected option
  const sortServices = (services: ServiceListReadable[], sortOption: string) => {
    const sorted = [...services]

    switch (sortOption) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
      case "oldest":
        return sorted.sort((a, b) => new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime())
      case "name_asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case "name_desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case "price_high":
        return sorted.sort((a, b) => b.price_cents - a.price_cents)
      case "price_low":
        return sorted.sort((a, b) => a.price_cents - b.price_cents)
      default:
        return sorted
    }
  }

  // Apply sorting to services
  const sortedServices = useMemo(() => sortServices(services, sortBy), [services, sortBy])

  // Delete service mutation
  const deleteMutation = useMutation({
    ...servicesDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesListOptions({ query: queryParams }).queryKey })
    },
  })

  // Update service mutation for status toggle
  const updateMutation = useMutation({
    ...servicesPartialUpdateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesListOptions({ query: queryParams }).queryKey })
    },
  })

  // Handle service deletion
  const handleDeleteService = (serviceId: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteMutation.mutate({ path: { id: parseInt(serviceId) } })
    }
  }

  // Handle service status toggle
  const handleToggleStatus = (serviceId: string) => {
    const service = services.find(s => s.id?.toString() === serviceId)
    if (service) {
      // Toggle between draft and active status
      const newStatus = service.status === 'active' ? 'draft' : 'active'
      const newIsActive = newStatus === 'active'
      
      updateMutation.mutate({ 
        path: { id: parseInt(serviceId) },
        body: { 
          status: newStatus,
          is_active: newIsActive,
          is_public: newIsActive,
          // Set published_at when first activating
          ...(newStatus === 'active' && !service.published_at ? { published_at: new Date().toISOString() } : {})
        }
      })
    }
  }

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Services"
        helpLink="/help/practitioner/services"
        action={{
          label: "New Service",
          icon: <Plus className="h-4 w-4" />,
          href: "/dashboard/practitioner/services/new"
        }}
        tabs={SERVICE_TYPE_TABS}
        activeTab={activeTab}
        onTabChange={(value) => {
          setActiveTab(value)
          setCurrentPage(1)
        }}
      />

      <div className="px-6 py-4 space-y-4">
        {/* Search and filters bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={(value) => {
              setSelectedStatus(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* View mode toggle */}
            <div className="flex items-center rounded-md border bg-background">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 rounded-none rounded-l-md border-0"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 rounded-none rounded-r-md border-0"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results summary and active filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {sortedServices.length} of {totalCount} {totalCount === 1 ? "service" : "services"}
          </p>

          {/* Active filters */}
          {(activeTab !== "all" || selectedStatus !== "all" || searchQuery) && (
            <div className="flex flex-wrap gap-2">
              {activeTab !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {SERVICE_TYPE_TABS.find((t) => t.value === activeTab)?.label}
                  <button onClick={() => setActiveTab("all")} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedStatus !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.label}
                  <button onClick={() => setSelectedStatus("all")} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Service cards or list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : sortedServices.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={convertServiceForDisplay(service)}
                  onDelete={handleDeleteService}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedServices.map((service) => (
                <ServiceListItem
                  key={service.id}
                  service={convertServiceForDisplay(service)}
                  onDelete={handleDeleteService}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            selectedType={activeTab}
            hasFilters={searchQuery !== "" || selectedStatus !== "all" || activeTab !== "all"}
            onClearFilters={() => {
              setSearchQuery("")
              setSelectedStatus("all")
              setActiveTab("all")
            }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!hasPreviousPage || currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-10"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={!hasNextPage || currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  )
}