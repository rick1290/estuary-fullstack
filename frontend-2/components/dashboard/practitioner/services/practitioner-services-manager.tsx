"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import { fetchPractitionerServices } from "@/lib/services"
import type { Service } from "@/types/service"
import EmptyState from "./empty-state"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { useMediaQuery } from "@/hooks/use-media-query"

// Service types for filtering
const SERVICE_TYPES = [
  { value: "all", label: "All Services" },
  { value: "course", label: "Courses" },
  { value: "workshop", label: "Workshops" },
  { value: "one_on_one", label: "1-on-1 Sessions" },
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
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
]

// View options
type ViewMode = "grid" | "list"

export default function PractitionerServicesManager() {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 768px)")

  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [showFilters, setShowFilters] = useState(!isMobile)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Fetch services on component mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true)
        // In a real app, this would fetch from your API with the practitioner's ID
        const data = await fetchPractitionerServices()
        setServices(data)
        setFilteredServices(data)
      } catch (error) {
        console.error("Failed to load services:", error)
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [])

  // Apply filters and sorting when any filter changes
  useEffect(() => {
    let result = [...services]

    // Apply type filter
    if (activeTab !== "all") {
      result = result.filter((service) => service.type === activeTab)
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      result = result.filter((service) => service.status === selectedStatus)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (service) => service.name.toLowerCase().includes(query) || service.description.toLowerCase().includes(query),
      )
    }

    // Apply sorting
    result = sortServices(result, sortBy)

    setFilteredServices(result)
  }, [services, activeTab, selectedStatus, searchQuery, sortBy])

  // Sort services based on selected option
  const sortServices = (services: Service[], sortOption: string) => {
    const sorted = [...services]

    switch (sortOption) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      case "oldest":
        return sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      case "name_asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case "name_desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case "price_high":
        return sorted.sort((a, b) => b.price - a.price)
      case "price_low":
        return sorted.sort((a, b) => a.price - b.price)
      default:
        return sorted
    }
  }

  // Handle service deletion
  const handleDeleteService = (serviceId: string) => {
    // In a real app, this would call your API to delete the service
    setServices((prevServices) => prevServices.filter((service) => service.id !== serviceId))
  }

  // Handle service status toggle (publish/unpublish)
  const handleToggleStatus = (serviceId: string) => {
    setServices((prevServices) =>
      prevServices.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              status: service.status === "published" ? "draft" : "published",
            }
          : service,
      ),
    )
  }

  // Toggle view mode between grid and list
  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header with title and create button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Services</h1>
          <p className="text-muted-foreground">Manage your offerings and packages</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/practitioner/services/create">
            <Plus className="mr-2 h-4 w-4" />
            Create New Service
          </Link>
        </Button>
      </div>

      {/* Tabs for service types */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All Services</TabsTrigger>
          <TabsTrigger value="one_on_one">One-on-One</TabsTrigger>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
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
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger>
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="one_on_one">One-on-One</SelectItem>
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
          {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"} found
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
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredServices.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onDelete={handleDeleteService}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <ServiceListItem
                key={service.id}
                service={service}
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
    </div>
  )
}
