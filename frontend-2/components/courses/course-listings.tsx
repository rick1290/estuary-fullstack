"use client"

import ServiceCard from "@/components/ui/service-card"

// Mock data for course listings
const MOCK_COURSES = [
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
    id: 9,
    title: "Yoga Teacher Training",
    type: "courses" as const,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredCourses.map((course, index) => (
          <ServiceCard
            key={course.id}
            {...course}
            href={`/courses/${course.id}`}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}