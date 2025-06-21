"use client"

import ServiceCard from "@/components/ui/service-card"
import { getServiceDetailUrl } from "@/lib/service-utils"

// Mock data for workshop listings
const MOCK_WORKSHOPS = [
  {
    id: 3,
    slug: "life-transformation-workshop",
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
    id: 8,
    slug: "sound-healing-workshop",
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
  {
    id: 10,
    slug: "creative-expression-workshop",
    title: "Creative Expression Workshop",
    type: "workshops" as const,
    practitioner: {
      id: 5,
      name: "Emma Rodriguez",
      image: "/placeholder.svg?height=50&width=50",
    },
    price: 175,
    date: "July 20, 2023",
    duration: 240,
    location: "Los Angeles, CA",
    capacity: 12,
    rating: 4.9,
    reviewCount: 34,
    categories: ["Art", "Therapy"],
    image: "/workshop-image-3.jpg",
    description: "Unlock your creative potential through art therapy and expressive techniques.",
  },
]

interface WorkshopListingsProps {
  query?: string
  location?: string
  categories?: string[]
}

export default function WorkshopListings({ query, location, categories = [] }: WorkshopListingsProps) {
  // Filter workshops based on search parameters
  const filteredWorkshops = MOCK_WORKSHOPS.filter((workshop) => {
    // Filter by search query
    if (
      query &&
      !workshop.title.toLowerCase().includes(query.toLowerCase()) &&
      !workshop.practitioner.name.toLowerCase().includes(query.toLowerCase())
    ) {
      return false
    }

    // Filter by location
    if (location && !workshop.location.toLowerCase().includes(location.toLowerCase())) {
      return false
    }

    // Filter by categories
    if (
      categories.length > 0 &&
      !categories.some((cat) => workshop.categories.map((c) => c.toLowerCase()).includes(cat.toLowerCase()))
    ) {
      return false
    }

    return true
  })

  if (filteredWorkshops.length === 0) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-lg font-medium mb-2">No workshops found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredWorkshops.map((workshop, index) => (
          <ServiceCard
            key={workshop.id}
            {...workshop}
            href={getServiceDetailUrl({ id: workshop.id, slug: workshop.slug, service_type_code: 'workshop' })}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}