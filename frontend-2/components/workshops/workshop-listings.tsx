"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar, User, Star } from "lucide-react"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"

// Mock data for workshop listings
const MOCK_WORKSHOPS = [
  {
    id: 3,
    title: "Life Transformation Workshop",
    type: "workshops",
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
    title: "Sound Healing Workshop",
    type: "workshops",
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
    title: "Stress Management Workshop",
    type: "workshops",
    practitioner: {
      id: 5,
      name: "Emma Rodriguez",
      image: "/placeholder.svg?height=50&width=50",
    },
    price: 85,
    date: "July 8, 2023",
    duration: 150,
    location: "Los Angeles, CA",
    capacity: 12,
    rating: 4.6,
    reviewCount: 42,
    categories: ["Wellness", "Mental Health"],
    image: "/mindful-moments.png",
    description: "Learn practical techniques to manage stress and improve your overall wellbeing.",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredWorkshops.map((workshop) => (
          <div key={workshop.id} className="flex h-full">
            <Card className="flex flex-col w-full h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex-grow flex flex-col pt-6 pb-2">
                <div className="flex items-center mb-1">
                  <ServiceTypeBadge type="workshop" />
                  <div className="flex items-center ml-auto">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 text-sm">{workshop.rating}</span>
                    </div>
                    <span className="ml-1 text-xs text-muted-foreground">({workshop.reviewCount})</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2">{workshop.title}</h3>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 h-[4.5em]">{workshop.description}</p>

                <div className="flex items-center mb-2">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage
                      src={workshop.practitioner.image || "/placeholder.svg"}
                      alt={workshop.practitioner.name}
                    />
                    <AvatarFallback>{workshop.practitioner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/practitioners/${workshop.practitioner.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {workshop.practitioner.name}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{workshop.location}</span>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{workshop.date}</span>
                  </div>

                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{workshop.duration} min</span>
                  </div>

                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">Max {workshop.capacity} participants</span>
                  </div>
                </div>

                <div className="mt-auto mb-2">
                  {workshop.categories.slice(0, 3).map((category) => (
                    <Badge key={category} variant="outline" className="mr-1 mb-1">
                      {category}
                    </Badge>
                  ))}
                  {workshop.categories.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{workshop.categories.length - 3} more</span>
                  )}
                </div>
              </CardContent>

              <Separator />

              <CardFooter className="flex justify-between p-4 h-16">
                <span className="text-lg font-semibold text-primary">${workshop.price}</span>
                <Button asChild>
                  <Link href={`/workshops/${workshop.id}`}>View Workshop</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
