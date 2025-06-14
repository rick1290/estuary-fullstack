"use client"

import ServiceCard from "@/components/ui/service-card"

// Mock data for session listings
const MOCK_SESSIONS = [
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
    id: 11,
    title: "Energy Healing Session",
    type: "one-on-one" as const,
    practitioner: {
      id: 3,
      name: "Aisha Patel",
      image: "/placeholder.svg?height=50&width=50",
    },
    price: 120,
    duration: 75,
    location: "Chicago, IL",
    rating: 4.8,
    reviewCount: 89,
    categories: ["Energy Work", "Healing"],
    image: "/session-image-3.jpg",
    description: "Balance your energy centers and restore harmony through gentle healing techniques.",
  },
]

interface SessionListingsProps {
  query?: string
  location?: string
  categories?: string[]
}

export default function SessionListings({ query, location, categories = [] }: SessionListingsProps) {
  // Filter sessions based on search parameters
  const filteredSessions = MOCK_SESSIONS.filter((session) => {
    // Filter by search query
    if (
      query &&
      !session.title.toLowerCase().includes(query.toLowerCase()) &&
      !session.practitioner.name.toLowerCase().includes(query.toLowerCase())
    ) {
      return false
    }

    // Filter by location
    if (location && !session.location.toLowerCase().includes(location.toLowerCase())) {
      return false
    }

    // Filter by categories
    if (
      categories.length > 0 &&
      !categories.some((cat) => session.categories.map((c) => c.toLowerCase()).includes(cat.toLowerCase()))
    ) {
      return false
    }

    return true
  })

  if (filteredSessions.length === 0) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-lg font-medium mb-2">No sessions found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredSessions.map((session, index) => (
          <ServiceCard
            key={session.id}
            {...session}
            href={`/sessions/${session.id}`}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}