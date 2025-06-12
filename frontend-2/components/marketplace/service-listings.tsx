"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, User, ShoppingBag, Calendar, GraduationCap, Star } from "lucide-react"
import { getServiceTypeConfig } from "@/lib/service-type-config"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"

// Mock data for service listings
const MOCK_SERVICES = [
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
    id: 4,
    title: "Nutritional Health Course",
    type: "courses",
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
    type: "courses",
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

  // Function to render the appropriate icon based on service type
  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case "one-on-one":
        return <User className="h-4 w-4" />
      case "packages":
        return <ShoppingBag className="h-4 w-4" />
      case "workshops":
        return <Calendar className="h-4 w-4" />
      case "courses":
        return <GraduationCap className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Function to get badge variant based on service type
  const getBadgeVariant = (type: string) => {
    const config = getServiceTypeConfig(type)
    switch (config.color) {
      case "primary":
        return "default"
      case "secondary":
        return "secondary"
      case "success":
        return "success"
      case "info":
        return "info"
      default:
        return "outline"
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <Link
            key={service.id}
            href={`/marketplace/${service.type === "courses" ? "courses" : service.type === "workshops" ? "workshops" : service.type === "one-on-one" ? "sessions" : service.type}/${service.id}`}
            className="group block"
          >
            <Card className="h-full overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Service Type and Rating */}
                  <div className="flex items-center justify-between">
                    <ServiceTypeBadge type={service.type} />
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="font-medium">{service.rating}</span>
                      <span className="text-gray-400 ml-1">({service.reviewCount})</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2">
                    {service.title}
                  </h3>

                  {/* Practitioner */}
                  <div className="flex items-center">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{service.practitioner.name}</p>
                      <p className="text-gray-500">{service.location}</p>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {service.duration && (
                      <div className="flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>
                          {typeof service.duration === "number" ? `${service.duration} min` : service.duration}
                        </span>
                      </div>
                    )}
                    {service.sessionCount && (
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span>{service.sessionCount} sessions</span>
                      </div>
                    )}
                    {service.date && (
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span>{service.date}</span>
                      </div>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1.5">
                    {service.categories.map((category) => (
                      <span key={category} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md">
                        {category}
                      </span>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-medium text-gray-900">
                        ${service.price}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">
                        {service.type === "packages" && "/ package"}
                        {service.type === "courses" && "/ course"}
                        {service.type === "workshops" && "/ person"}
                        {service.type === "one-on-one" && "/ session"}
                      </span>
                    </div>
                    <span className="text-sm text-primary group-hover:underline">
                      View Details →
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
