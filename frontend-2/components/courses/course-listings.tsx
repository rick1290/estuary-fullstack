"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar, Star, Sparkles, Users } from "lucide-react"

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredCourses.map((course, index) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="group block animate-fade-in"
            style={{animationDelay: `${index * 0.1}s`}}
          >
            <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-cream-50">
              {/* Gradient Header */}
              <div className="relative h-56 bg-gradient-to-br from-sage-100 via-terracotta-100 to-sage-100 overflow-hidden">
                {/* Background texture */}
                <div className="absolute inset-0 texture-grain opacity-20" />
                
                {/* Decorative shapes */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-terracotta-200/40 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sage-200/40 rounded-full blur-2xl" />
                
                {/* Course Type Badge */}
                <div className="absolute top-4 left-4">
                  <div className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                    <Sparkles className="h-3.5 w-3.5 text-sage-600" strokeWidth="1.5" />
                    <span className="text-xs font-medium text-olive-800">Learning Journey</span>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" />
                    <span className="text-sm font-medium text-olive-800">{course.rating}</span>
                  </div>
                </div>
                
                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-olive-900/70 to-transparent">
                  <h3 className="text-2xl font-medium text-white leading-tight line-clamp-2">
                    {course.title}
                  </h3>
                </div>
              </div>
              
              {/* Content */}
              <CardContent className="p-6 bg-cream-50">
                <div className="space-y-4">
                  {/* Practitioner */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-olive-800">
                        {course.practitioner.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-olive-900">{course.practitioner.name}</p>
                      <p className="text-sm text-olive-600">{course.location}</p>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-olive-700">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                      <span>{course.sessionCount} sessions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                      <span>{course.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                      <span>{course.reviewCount} students</span>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-2">
                    {course.categories.map((category) => (
                      <span key={category} className="text-xs px-3 py-1.5 bg-sage-100 text-olive-700 rounded-full font-medium">
                        {category}
                      </span>
                    ))}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-olive-600 leading-relaxed line-clamp-2">
                    {course.description}
                  </p>

                  <Separator className="bg-sage-200" />

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-olive-600 mb-1">Investment</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-medium text-olive-900">
                          ${course.price}
                        </span>
                        <span className="text-sm text-olive-600">/ journey</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-sage-700 hover:text-sage-800 hover:bg-sage-100 group">
                      <span className="mr-1">Start Journey</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </Button>
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