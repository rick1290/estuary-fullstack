"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { publicServicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useMarketplaceFilters } from "@/hooks/use-marketplace-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import ServiceCard from "@/components/ui/service-card"

// Fallback mock data for development
const MOCK_SERVICES = [
  {
    id: 1,
    title: "Mindfulness Meditation Session",
    type: "one-on-one" as const,
    practitioner: {
      id: 1,
      name: "Dr. Sarah Johnson",
      image: "https://i.pravatar.cc/150?img=47",
    },
    price: 85,
    duration: 60,
    location: "Virtual",
    rating: 4.9,
    reviewCount: 124,
    categories: ["Meditation", "Mindfulness"],
    image: "/session-image-1.jpg",
    description: "A personalized meditation session focused on mindfulness techniques for stress reduction.",
  },
  {
    id: 2,
    title: "Yoga for Beginners Package",
    type: "packages" as const,
    practitioner: {
      id: 2,
      name: "Michael Chen",
      image: "https://i.pravatar.cc/150?img=33",
    },
    price: 240,
    sessionCount: 5,
    location: "New York, NY",
    rating: 4.8,
    reviewCount: 98,
    categories: ["Yoga", "Fitness"],
    image: "/package-image-1.jpg",
    description: "A package of 5 private yoga sessions designed specifically for beginners.",
  },
  {
    id: 3,
    title: "Life Transformation Workshop",
    type: "workshops" as const,
    practitioner: {
      id: 3,
      name: "Aisha Patel",
      image: "https://i.pravatar.cc/150?img=44",
    },
    price: 150,
    date: "May 15, 2023",
    duration: 180,
    location: "Chicago, IL",
    capacity: 15,
    rating: 4.7,
    reviewCount: 87,
    categories: ["Coaching", "Spiritual"],
    image: "/workshop-image-1.jpg",
    description: "A transformative workshop to help you discover your purpose and set meaningful life goals.",
  },
  {
    id: 4,
    title: "Nutritional Health Course",
    type: "courses" as const,
    practitioner: {
      id: 4,
      name: "James Wilson",
      image: "https://i.pravatar.cc/150?img=12",
    },
    price: 350,
    duration: "4 weeks",
    sessionCount: 8,
    location: "Virtual",
    rating: 4.6,
    reviewCount: 76,
    categories: ["Nutrition", "Health"],
    image: "/course-image-1.jpg",
    description: "Learn the fundamentals of nutrition and how to create a balanced diet for optimal health.",
  },
  {
    id: 5,
    title: "Therapeutic Massage",
    type: "one-on-one" as const,
    practitioner: {
      id: 5,
      name: "Emma Rodriguez",
      image: "https://i.pravatar.cc/150?img=32",
    },
    price: 95,
    duration: 90,
    location: "Los Angeles, CA",
    rating: 4.9,
    reviewCount: 112,
    categories: ["Healing", "Therapy"],
    image: "/serene-massage.png",
    description: "A therapeutic massage session to relieve tension and promote relaxation.",
  },
  {
    id: 6,
    title: "Spiritual Guidance Sessions",
    type: "packages" as const,
    practitioner: {
      id: 6,
      name: "David Kim",
      image: "https://i.pravatar.cc/150?img=52",
    },
    price: 280,
    sessionCount: 4,
    location: "Virtual",
    rating: 4.7,
    reviewCount: 65,
    categories: ["Spiritual", "Coaching"],
    image: "/guiding-light-path.png",
    description: "A package of 4 spiritual guidance sessions to help you connect with your inner self.",
  },
  {
    id: 7,
    title: "Mindfulness Meditation Course",
    type: "courses" as const,
    practitioner: {
      id: 1,
      name: "Dr. Sarah Johnson",
      image: "https://i.pravatar.cc/150?img=47",
    },
    price: 299,
    duration: "6 weeks",
    sessionCount: 12,
    location: "Virtual",
    rating: 4.8,
    reviewCount: 92,
    categories: ["Meditation", "Mindfulness"],
    image: "/course-image-2.jpg",
    description: "A comprehensive course on mindfulness meditation techniques for stress reduction and mental clarity.",
  },
  {
    id: 8,
    title: "Sound Healing Workshop",
    type: "workshops" as const,
    practitioner: {
      id: 6,
      name: "David Kim",
      image: "https://i.pravatar.cc/150?img=52",
    },
    price: 120,
    date: "June 10, 2023",
    duration: 120,
    location: "Virtual",
    capacity: 20,
    rating: 4.8,
    reviewCount: 56,
    categories: ["Healing", "Spiritual"],
    image: "/workshop-image-2.jpg",
    description: "Experience the healing power of sound frequencies and vibrations in this immersive workshop.",
  },
]

interface ServiceListingsProps {
  // Props are deprecated - component now reads filters from URL via hook
  // Kept for backwards compatibility
  serviceType?: string
  serviceTypes?: string[]
}

export default function ServiceListings({ serviceType, serviceTypes }: ServiceListingsProps) {
  const [page, setPage] = useState(1)
  const limit = 12  // Show 12 services per page
  const { filters } = useMarketplaceFilters()

  // Build query parameters for API from URL filters
  const queryParams = useMemo(() => {
    const params: any = {
      limit,
      offset: (page - 1) * limit,
      ordering: '-is_featured,-average_rating',
      is_active: true,  // Only show active services
    }

    // Search query
    if (filters.search) {
      params.search = filters.search
    }

    // Service type - prioritize prop for backwards compat, then URL filter
    if (serviceTypes && serviceTypes.length > 0) {
      params.service_type = serviceTypes.join(',')
    } else if (serviceType) {
      params.service_type = serviceType
    } else if (filters.serviceType && filters.serviceType !== 'all') {
      params.service_type = filters.serviceType
    }

    // Modality filter (NEW!)
    if (filters.modalities.length > 0) {
      params.modality_id = filters.modalities.join(',')
    }

    // Category filter
    if (filters.categories.length > 0) {
      params.category_id = filters.categories.join(',')
    }

    // Location format (online/in-person)
    if (filters.locationFormat && filters.locationFormat !== 'all') {
      params.location_type = filters.locationFormat === 'online' ? 'virtual' : 'in_person'
    }

    // Location text
    if (filters.location) {
      params.location = filters.location
    }

    // Price range
    if (filters.minPrice > 0) {
      params.min_price = filters.minPrice
    }
    if (filters.maxPrice < 500) {
      params.max_price = filters.maxPrice
    }

    // Rating - convert to min_rating
    if (filters.rating !== 'any') {
      params.min_rating = parseFloat(filters.rating.replace('+', ''))
    }

    return params
  }, [filters, serviceType, serviceTypes, page])

  // Fetch services from API using public endpoint
  const { data: servicesData, isLoading, error, refetch } = useQuery({
    ...publicServicesListOptions({ query: queryParams }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // Extract services array and handle both paginated and direct responses
  const apiServices = Array.isArray(servicesData) ? servicesData : 
                     (servicesData?.results && Array.isArray(servicesData.results)) ? servicesData.results : []

  // Transform API data to component format
  const transformedServices = apiServices.map(service => {
    // Ensure we always have a valid slug
    const serviceSlug = service.slug || service.public_uuid || String(service.id) || 'service'

    return {
      id: service.public_uuid || service.id, // Keep for key prop
      slug: serviceSlug, // Use slug for URLs, fallback to uuid/id
      title: service.name || service.title || 'Service',
      type: getServiceType(service.service_type_code || service.type),
    practitioner: {
      id: service.practitioner?.public_uuid || service.primary_practitioner?.public_uuid || service.practitioner?.id || service.primary_practitioner?.id,
      slug: service.primary_practitioner?.slug || service.practitioner?.slug,
      name: service.practitioner?.display_name || service.primary_practitioner?.display_name || 'Practitioner',
      image: service.practitioner?.profile_image_url || service.primary_practitioner?.profile_image_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    },
    price: service.price_cents ? Math.floor(service.price_cents / 100) : service.price || 0,
    duration: service.duration_minutes || service.duration || 60,
    location: service.location_type === 'virtual' ? 'Virtual' : service.location || 'Location TBD',
    rating: service.average_rating || 4.5,
    reviewCount: service.total_reviews || 0,
    categories: service.categories?.map(c => c.name) || service.category ? [service.category.name] : ['Wellness'],
    image: service.image_url || service.featured_image || `/service-default-${Math.floor(Math.random() * 3) + 1}.jpg`,
    description: service.description || 'Discover this transformative experience.',
    // Type-specific fields
    sessionCount: service.session_count,
    sessionsIncluded: service.sessions_included,
    savingsPercentage: service.savings_percentage,
    capacity: service.max_participants || service.capacity,
    date: service.start_date ? new Date(service.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
    firstSessionDate: service.first_session_date,
    nextSessionDate: service.next_session_date,
    }
  })

  // Helper function to map service type
  function getServiceType(type: string): 'courses' | 'workshops' | 'one-on-one' | 'packages' | 'bundles' {
    switch (type?.toLowerCase()) {
      case 'course': return 'courses'
      case 'workshop': return 'workshops'
      case 'package': return 'packages'
      case 'bundle': return 'bundles'
      case 'session':
      default: return 'one-on-one'
    }
  }

  // Use API data if available, otherwise fallback to mock data
  const services = transformedServices.length > 0 ? transformedServices : MOCK_SERVICES
  // Filter mock services for development fallback using URL filters
  const filteredServices = services === MOCK_SERVICES ? MOCK_SERVICES.filter((service) => {
    if (filters.search && !service.title.toLowerCase().includes(filters.search.toLowerCase()) && !service.practitioner.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (serviceType && service.type !== serviceType) return false
    if (filters.location && !service.location.toLowerCase().includes(filters.location.toLowerCase())) return false
    return true
  }) : services

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <Skeleton className="w-full h-48" />
              <div className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
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
            Failed to load services. 
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
  if (filteredServices.length === 0) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-lg font-medium mb-2">No services found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  // Generate proper href based on service type using slug
  const getServiceHref = (service: any) => {
    const slug = service.slug // Slug is guaranteed from transform
    switch (service.type) {
      case "courses":
        return `/courses/${slug}`
      case "workshops":
        return `/workshops/${slug}`
      case "one-on-one":
        return `/sessions/${slug}`
      case "bundles":
        return `/bundles/${slug}`
      case "packages":
        return `/packages/${slug}`
      default:
        return `/services/${slug}`
    }
  }

  // Pagination info
  const totalResults = servicesData?.count || filteredServices.length
  const hasMore = servicesData?.next != null
  const currentCount = filteredServices.length

  return (
    <div className="w-full">
      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Showing {currentCount} of {totalResults} results
        </p>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredServices.map((service, index) => (
          <ServiceCard
            key={service.id}
            {...service}
            href={getServiceHref(service)}
            index={index}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {(hasMore || page > 1) && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <Button 
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            variant="outline"
            size="default"
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page}
          </span>
          <Button 
            onClick={() => setPage(prev => prev + 1)}
            variant="outline"
            size="default"
            disabled={!hasMore || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}