import { ChevronRight, Clock, MapPin, Users, Star, Heart, Share2, Calendar, CheckCircle } from "lucide-react"
import CourseBookingPanel from "@/components/courses/course-booking-panel"
import ServicePractitioner from "@/components/shared/service-practitioner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link"

// Mock data for a course
const MOCK_COURSE = {
  id: 4,
  title: "Nutritional Health Course",
  type: "courses",
  description: "Learn the fundamentals of nutrition and how to create a balanced diet for optimal health.",
  longDescription: `This comprehensive 4-week course will teach you everything you need to know about nutrition and how to create a balanced diet for optimal health. You'll learn about macronutrients, micronutrients, meal planning, and how to make healthy food choices.

Each week focuses on a different aspect of nutrition, with practical exercises and assignments to help you apply what you've learned. By the end of the course, you'll have a solid understanding of nutrition principles and be able to create personalized meal plans.

This course is perfect for anyone interested in improving their health through better nutrition, whether you're a complete beginner or have some knowledge of nutrition already.`,
  price: 350,
  duration: "4 weeks",
  sessionCount: 8,
  location: "Virtual",
  rating: 4.6,
  reviewCount: 76,
  categories: ["Nutrition", "Health"],
  image: "/course-image-1.jpg",
  experienceLevel: "beginner",
  whatYoullLearn: [
    "Understand the role of macronutrients and micronutrients in the body",
    "Learn how to read and interpret nutrition labels",
    "Create balanced meal plans for different health goals",
    "Identify common nutritional deficiencies and how to address them",
    "Develop healthy eating habits that are sustainable long-term",
  ],
  benefits: [
    {
      id: 1,
      title: "Improved Health",
      description: "Learn how proper nutrition can improve your overall health and wellbeing.",
      icon: "favorite",
    },
    {
      id: 2,
      title: "Personalized Approach",
      description: "Discover how to tailor nutrition principles to your unique needs and preferences.",
      icon: "person",
    },
    {
      id: 3,
      title: "Practical Skills",
      description: "Gain practical skills in meal planning, grocery shopping, and food preparation.",
      icon: "restaurant",
    },
  ],
  sessions: [
    {
      id: 1,
      title: "Introduction to Nutrition Basics",
      description: "Overview of nutrition fundamentals and the role of food in health.",
      date: "May 1, 2023",
      startTime: "18:00",
      endTime: "19:30",
      agenda: [
        "Welcome and course overview",
        "What is nutrition and why it matters",
        "The relationship between food and health",
        "Q&A session",
      ],
    },
    {
      id: 2,
      title: "Macronutrients Deep Dive",
      description: "Detailed exploration of proteins, carbohydrates, and fats.",
      date: "May 8, 2023",
      startTime: "18:00",
      endTime: "19:30",
      agenda: [
        "Proteins: functions, sources, and requirements",
        "Carbohydrates: types, functions, and optimal intake",
        "Fats: essential fatty acids, healthy sources, and myths",
        "Practical exercise: Analyzing your macronutrient intake",
      ],
    },
    {
      id: 3,
      title: "Micronutrients and Supplements",
      description: "Understanding vitamins, minerals, and when supplements are necessary.",
      date: "May 15, 2023",
      startTime: "18:00",
      endTime: "19:30",
      agenda: [
        "Essential vitamins and their food sources",
        "Key minerals and their roles in the body",
        "Supplement myths and facts",
        "How to identify and address nutritional deficiencies",
      ],
    },
    {
      id: 4,
      title: "Meal Planning and Preparation",
      description: "Practical strategies for planning and preparing nutritious meals.",
      date: "May 22, 2023",
      startTime: "18:00",
      endTime: "19:30",
      agenda: [
        "Principles of balanced meal planning",
        "Grocery shopping strategies",
        "Meal prep techniques for busy schedules",
        "Recipe modification for health optimization",
      ],
    },
  ],
  practitioners: [
    {
      id: 4,
      name: "James Wilson",
      title: "Nutritionist & Health Coach",
      bio: "James is a certified nutritionist with over 10 years of experience helping clients achieve their health goals through proper nutrition.",
      image: "/placeholder.svg?height=200&width=200",
      isPrimary: true,
      rating: 4.7,
      reviewCount: 63,
    },
    {
      id: 11,
      name: "Lisa Chen",
      title: "Dietitian",
      bio: "Lisa specializes in clinical nutrition and has extensive experience working with clients with various health conditions.",
      image: "/placeholder.svg?height=200&width=200",
      isPrimary: false,
      rating: 4.5,
      reviewCount: 28,
    },
  ],
}

export default function CourseDetailsPage({ params }: { params: { id: string } }) {
  // In a real application, you would fetch the course data based on the ID
  const course = MOCK_COURSE

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="container max-w-7xl pt-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-gray-600 hover:text-gray-900">
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-gray-600 hover:text-gray-900">
                <Link href="/marketplace">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-gray-600 hover:text-gray-900">
                <Link href="/marketplace/courses">Courses</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-gray-900">{course.title}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl py-12">
        {/* Header Section */}
        <div className="max-w-4xl mb-12">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-medium text-gray-900 mb-4">{course.title}</h1>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{course.sessionCount} sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{course.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{course.rating}</span>
                  <span className="text-gray-400">({course.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Heart className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {course.categories.map((category) => (
              <Badge key={category} variant="secondary" className="px-3 py-1">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-12">
            {/* Overview Section */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-4">Course Overview</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{course.longDescription}</p>
            </section>

            {/* What You'll Learn */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">What You'll Learn</h2>
              <div className="space-y-4">
                {course.whatYoullLearn.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Course Schedule */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Course Schedule</h2>
              <div className="space-y-4">
                {course.sessions.map((session, index) => (
                  <Card key={session.id} className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">Session {index + 1}: {session.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                        </div>
                        <Badge variant="outline">
                          {session.date}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {session.startTime} - {session.endTime}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Agenda:</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {session.agenda.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-gray-400">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Course Details */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Course Details</h2>
              <div className="grid gap-4 text-gray-600">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Duration</span>
                  <span className="font-medium text-gray-900">{course.duration}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Total Sessions</span>
                  <span className="font-medium text-gray-900">{course.sessionCount} sessions</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Format</span>
                  <span className="font-medium text-gray-900">Group Course</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Location</span>
                  <span className="font-medium text-gray-900">{course.location}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Experience Level</span>
                  <span className="font-medium text-gray-900">Beginner Friendly</span>
                </div>
              </div>
            </section>

            {/* Instructors - Only show if multiple */}
            {course.practitioners && course.practitioners.length > 1 && (
              <section>
                <h2 className="text-xl font-medium text-gray-900 mb-6">Course Instructors</h2>
                <div className="grid gap-4">
                  {course.practitioners.map((practitioner) => (
                    <Card key={practitioner.id} className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{practitioner.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{practitioner.title}</p>
                            <p className="text-sm text-gray-600">{practitioner.bio}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Booking Panel & Practitioner */}
          <div className="space-y-8">
            <div className="lg:sticky lg:top-8 space-y-8">
              <CourseBookingPanel course={course} />
              {course.practitioners && course.practitioners.length > 0 && (
                <ServicePractitioner
                  practitioner={course.practitioners.find((p) => p.isPrimary) || course.practitioners[0]}
                  variant="compact"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
