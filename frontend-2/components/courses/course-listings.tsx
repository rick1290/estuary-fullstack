"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar, Star } from "lucide-react"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"

// Mock data for course listings
const MOCK_COURSES = [
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
    id: 9,
    title: "Yoga Teacher Training",
    type: "courses",
    practitioner: {
      id: 2,
      name: "Michael Chen",
      image: "/placeholder.svg?height=50&width=50",
    },
    price: 1200,
    duration: "8 weeks",
    sessionCount: 24,
    location: "New York, NY",
    rating: 4.9,
    reviewCount: 45,
    categories: ["Yoga", "Teaching"],
    image: "/mindful-yoga-community.png",
    description: "Comprehensive yoga teacher training program for aspiring instructors.",
  },
]

interface CourseListingsProps {
  query?: string
  location?: string
  categories?: string[]
}

export default function CourseListings({ query, location, categories = [] }: CourseListingsProps) {
  // Filter courses based on search parameters
  const filteredCourses = MOCK_COURSES.filter((course) => {
    // Filter by search query
    if (
      query &&
      !course.title.toLowerCase().includes(query.toLowerCase()) &&
      !course.practitioner.name.toLowerCase().includes(query.toLowerCase())
    ) {
      return false
    }

    // Filter by location
    if (location && !course.location.toLowerCase().includes(location.toLowerCase())) {
      return false
    }

    // Filter by categories
    if (
      categories.length > 0 &&
      !categories.some((cat) => course.categories.map((c) => c.toLowerCase()).includes(cat.toLowerCase()))
    ) {
      return false
    }

    return true
  })

  if (filteredCourses.length === 0) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-lg font-medium mb-2">No courses found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCourses.map((course) => (
          <div key={course.id} className="flex h-full">
            <Card className="flex flex-col w-full h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex-grow flex flex-col pt-6 pb-2">
                <div className="flex items-center mb-1">
                  <ServiceTypeBadge type="course" />
                  <div className="flex items-center ml-auto">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 text-sm">{course.rating}</span>
                    </div>
                    <span className="ml-1 text-xs text-muted-foreground">({course.reviewCount})</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2">{course.title}</h3>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 h-[4.5em]">{course.description}</p>

                <div className="flex items-center mb-2">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={course.practitioner.image || "/placeholder.svg"} alt={course.practitioner.name} />
                    <AvatarFallback>{course.practitioner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/practitioners/${course.practitioner.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {course.practitioner.name}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{course.location}</span>
                  </div>

                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{course.duration}</span>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm">{course.sessionCount} sessions</span>
                  </div>
                </div>

                <div className="mt-auto mb-2">
                  {course.categories.slice(0, 3).map((category) => (
                    <Badge key={category} variant="outline" className="mr-1 mb-1">
                      {category}
                    </Badge>
                  ))}
                  {course.categories.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{course.categories.length - 3} more</span>
                  )}
                </div>
              </CardContent>

              <Separator />

              <CardFooter className="flex justify-between p-4 h-16">
                <span className="text-lg font-semibold text-primary">${course.price}</span>
                <Button asChild>
                  <Link href={`/courses/${course.id}`}>View Course</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
