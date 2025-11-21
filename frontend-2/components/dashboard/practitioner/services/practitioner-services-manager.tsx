"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// Service types for filtering
const SERVICE_TYPES = [
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
    description: service.short_description || '',
    price: priceValue.toFixed(2),
    duration: service.duration_minutes,
    type: serviceType, // Map to 'type' property
    service_type: {
      id: service.service_type,
      name: service.service_type_display || '',
      code: service.service_type_code || ''
    },
    category: service.category ? {
      id: service.category.id?.toString() || '',
      name: service.category.name,
      slug: service.category.slug || '',
      description: service.category.description || ''
    } : null,
    is_active: service.is_active || false,
    is_featured: service.is_featured || false,
    status: service.status || 'draft',
    image_url: service.primary_image || null,
    average_rating: service.average_rating || null,
    total_reviews: parseInt(service.total_reviews || '0'),
    total_bookings: parseInt(service.total_bookings || '0'),
    bookings: parseInt(service.total_bookings || '0'),
    sessions: 1, // Default sessions count
    updatedAt: service.updated_at || new Date().toISOString(),
    created_at: service.created_at || new Date().toISOString()
  }
}

export default function PractitionerServicesManager() {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 768px)")
  const queryClient = useQueryClient()
  const { user, isPractitioner } = useAuth()

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
  const { data: servicesData, isLoading, error } = useQuery({
    ...servicesListOptions({ query: queryParams }),
    enabled: !!user, // Fetch when we have user data
  })

  // Get services from the API response  
  const services = servicesData?.data?.results || servicesData?.results || []
  const totalCount = servicesData?.count || servicesData?.data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = servicesData?.next || servicesData?.data?.next
  const hasPreviousPage = servicesData?.previous || servicesData?.data?.previous
  
  // Additional debug logging for data extraction
  console.log('Data extraction debug:', {
    servicesData,
    servicesDataKeys: servicesData ? Object.keys(servicesData) : [],
    hasData: !!servicesData?.data,
    hasResults: !!servicesData?.results,
    hasDataResults: !!servicesData?.data?.results,
    dataResultsLength: servicesData?.data?.results?.length,
    directResultsLength: servicesData?.results?.length,
    servicesLength: services.length,
    firstService: services[0]
  })

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

  // Debug logging
  console.log('PractitionerServicesManager:', {
    user: user,
    practitionerId: user?.practitionerId,
    isPractitioner: isPractitioner,
    hasPractitionerAccount: user?.hasPractitionerAccount,
    queryParams,
    servicesData,
    servicesCount: services.length,
    sortedServicesCount: sortedServices.length,
    isLoading,
    error
  })

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

  // Toggle view mode between grid and list
  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/practitioner/services/new">
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Link>
        </Button>
      </div>

      {/* Tabs for service types */}
      <Tabs defaultValue={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        setCurrentPage(1)  // Reset to first page when changing filters
      }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All Services</TabsTrigger>
          <TabsTrigger value="session">Sessions</TabsTrigger>
          <TabsTrigger value="workshop">Workshops</TabsTrigger>
          <TabsTrigger value="course">Courses</TabsTrigger>
          <TabsTrigger value="package">Packages</TabsTrigger>
          <TabsTrigger value="bundle">Bundles</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)  // Reset to first page when searching
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Button variant="outline" className="w-full md:hidden" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>

              <div className="hidden md:block w-full">
                <Select value={selectedStatus} onValueChange={(value) => {
                  setSelectedStatus(value)
                  setCurrentPage(1)  // Reset to first page when changing filters
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="md:col-span-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price_high">Price (High to Low)</SelectItem>
                  <SelectItem value="price_low">Price (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View mode toggle */}
            <div className="md:col-span-1 flex justify-end">
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => toggleViewMode("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-9" />
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => toggleViewMode("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expanded filters for mobile */}
          {showFilters && (
            <div className="md:hidden">
              <Separator className="my-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select value={selectedStatus} onValueChange={(value) => {
                  setSelectedStatus(value)
                  setCurrentPage(1)  // Reset to first page when changing filters
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={activeTab} onValueChange={(value) => {
                  setActiveTab(value)
                  setCurrentPage(1)  // Reset to first page when changing filters
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="session">Sessions</SelectItem>
                    <SelectItem value="workshop">Workshops</SelectItem>
                    <SelectItem value="course">Courses</SelectItem>
                    <SelectItem value="package">Packages</SelectItem>
                    <SelectItem value="bundle">Bundles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {sortedServices.length} of {totalCount} {totalCount === 1 ? "service" : "services"}
        </p>

        {/* Active filters */}
        <div className="flex flex-wrap gap-2">
          {activeTab !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {SERVICE_TYPES.find((t) => t.value === activeTab)?.label}
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
      </div>

      {/* Service cards or list */}
      {(() => {
        console.log('Render condition check:', { isLoading, sortedServicesLength: sortedServices.length })
        
        if (isLoading) {
          console.log('Showing loading spinner')
          return (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )
        }
        
        if (sortedServices.length > 0) {
          console.log('Showing services:', sortedServices.length)
          return viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedServices.map((service) => {
                try {
                  return (
                    <ServiceCard
                      key={service.id}
                      service={convertServiceForDisplay(service)}
                      onDelete={handleDeleteService}
                      onToggleStatus={handleToggleStatus}
                    />
                  )
                } catch (error) {
                  console.error('Error rendering service card:', service, error)
                  return null
                }
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedServices.map((service) => {
                try {
                  return (
                    <ServiceListItem
                      key={service.id}
                      service={convertServiceForDisplay(service)}
                      onDelete={handleDeleteService}
                      onToggleStatus={handleToggleStatus}
                    />
                  )
                } catch (error) {
                  console.error('Error rendering service list item:', service, error)
                  return null
                }
              })}
            </div>
          )
        }
        
        console.log('Showing empty state')
        return (
          <EmptyState
            selectedType={activeTab}
            hasFilters={searchQuery !== "" || selectedStatus !== "all" || activeTab !== "all"}
            onClearFilters={() => {
              setSearchQuery("")
              setSelectedStatus("all")
              setActiveTab("all")
            }}
          />
        )
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
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
  )
}
