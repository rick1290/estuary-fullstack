"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, User, Star } from "lucide-react"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"

// Mock data for session listings
const MOCK_SESSIONS = [
  {
    id: 1,
    title: "Mindfulness Meditation Session",
    type: "one-on-one",
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
    type: "packages",
    practitioner: {
      id: 2,
      name: "Michael Chen",
      image: "/placeholder.svg?height=50&width=50",
    },
    price: 240,
    sessionCount: 5,
    duration: 60,
    location: "New York, NY",
    rating: 4.8,
    reviewCount: 98,
    categories: ["Yoga", "Fitness"],
    image: "/package-image-1.jpg",
    description: "A package of 5 private yoga sessions designed specifically for beginners.",
  },
  {
    id: 5,
    title: "Therapeutic Massage",
    type: "one-on-one",
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
    type: "packages",
    practitioner: {
      id: 6,
      name: "David Kim",
      image: "/placeholder.svg?height=50&width=50",
    },
    price: 280,
    sessionCount: 4,
    duration: 45,
    location: "Virtual",
    rating: 4.7,
    reviewCount: 65,
    categories: ["Spiritual", "Coaching"],
    image: "/guiding-light-path.png",
    description: "A package of 4 spiritual guidance sessions to help you connect with your inner self.",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id} className="flex h-full">
            <Card className="flex flex-col w-full h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex-grow flex flex-col pt-6 pb-2">
                <div className="flex items-center mb-1">
                  <ServiceTypeBadge type={session.type} />
                  <div className="flex items-center ml-auto">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 text-sm">{session.rating}</span>
                    </div>
                    <span className="ml-1 text-xs text-muted-foreground">({session.reviewCount})</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2">{session.title}</h3>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 h-[4.5em]">{session.description}</p>

                <div className="flex items-center mb-2">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage
                      src={session.practitioner.image || "/placeholder.svg"}
                      alt={session.practitioner.name}
                    />
                    <AvatarFallback>{session.practitioner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/practitioners/${session.practitioner.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {session.practitioner.name}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{session.location}</span>
                  </div>

                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{session.duration} min</span>
                  </div>

                  {session.sessionCount && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-sm">{session.sessionCount} sessions</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto mb-2">
                  {session.categories.slice(0, 3).map((category) => (
                    <Badge key={category} variant="outline" className="mr-1 mb-1">
                      {category}
                    </Badge>
                  ))}
                  {session.categories.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{session.categories.length - 3} more</span>
                  )}
                </div>
              </CardContent>

              <Separator />

              <CardFooter className="flex justify-between p-4 h-16">
                <span className="text-lg font-semibold text-primary">
                  ${session.price}
                  {session.type === "packages" && " (package)"}
                </span>
                <Button asChild>
                  <Link href={`/sessions/${session.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
