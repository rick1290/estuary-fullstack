"use client"

import ServiceCard from "@/components/ui/service-card"

// Mock data for service listings
const MOCK_SERVICES = [
  {
    id: 1,
    title: "Mindfulness Meditation Session",
    type: "one-on-one" as const,
    practitioner: {
      id: 1,
      name: "Dr. Sarah Johnson",
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
      image: "/placeholder.svg?height=50&width=50",
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
  query?: string
  serviceType?: string
  location?: string
  categories?: string[]
}

export default function ServiceListings({ query, serviceType, location, categories = [] }: ServiceListingsProps) {
  // Filter services based on search parameters
  const filteredServices = MOCK_SERVICES.filter((service) => {
    // Filter by search query
    if (
      query &&
      !service.title.toLowerCase().includes(query.toLowerCase()) &&
      !service.practitioner.name.toLowerCase().includes(query.toLowerCase())
    ) {
      return false
    }

    // Filter by service type
    if (serviceType && service.type !== serviceType) {
      return false
    }

    // Filter by location
    if (location && !service.location.toLowerCase().includes(location.toLowerCase())) {
      return false
    }

    // Filter by categories
    if (
      categories.length > 0 &&
      !categories.some((cat) => service.categories.map((c) => c.toLowerCase()).includes(cat.toLowerCase()))
    ) {
      return false
    }

    return true
  })

  if (filteredServices.length === 0) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-lg font-medium mb-2">No services found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  // Generate proper href based on service type
  const getServiceHref = (service: typeof MOCK_SERVICES[0]) => {
    switch (service.type) {
      case "courses":
        return `/courses/${service.id}`
      case "workshops":
        return `/workshops/${service.id}`
      case "one-on-one":
        return `/sessions/${service.id}`
      case "packages":
        return `/packages/${service.id}`
      default:
        return `/marketplace/${service.type}/${service.id}`
    }
  }

  return (
    <div className="w-full">
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
    </div>
  )
}