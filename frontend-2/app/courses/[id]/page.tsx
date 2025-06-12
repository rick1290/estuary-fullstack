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
    <div className="min-h-screen bg-cream-50">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[80vh] bg-gradient-to-b from-terracotta-50 via-sage-50 to-cream-50 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 texture-grain opacity-20" />
        <div className="absolute top-40 -right-60 w-[600px] h-[600px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-60 w-[600px] h-[600px] bg-terracotta-200/30 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative container max-w-7xl py-12">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-12 animate-fade-in">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace">Explore Wellness</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace/courses">Courses</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-900 font-medium">{course.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-slide-up">
              {/* Course Label */}
              <div className="inline-flex items-center gap-2 bg-terracotta-100 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-terracotta-500 rounded-full animate-pulse" />
                <span className="text-terracotta-800 font-medium">{course.sessionCount}-Session Journey</span>
              </div>
              
              <div>
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-olive-900 mb-6 leading-[1.1]">
                  {course.title}
                </h1>
                <p className="text-xl lg:text-2xl text-olive-700 leading-relaxed font-light">
                  {course.description}
                </p>
              </div>
              
              {/* Course Stats */}
              <div className="flex flex-wrap items-center gap-8">
                <div>
                  <p className="text-3xl font-bold text-olive-900">{course.duration}</p>
                  <p className="text-olive-600">Total Duration</p>
                </div>
                <div className="w-px h-12 bg-sage-300" />
                <div>
                  <p className="text-3xl font-bold text-olive-900">{course.sessionCount}</p>
                  <p className="text-olive-600">Live Sessions</p>
                </div>
                <div className="w-px h-12 bg-sage-300" />
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-terracotta-500 fill-terracotta-500" />
                  <p className="text-3xl font-bold text-olive-900">{course.rating}</p>
                  <p className="text-olive-600">({course.reviewCount} reviews)</p>
                </div>
              </div>
              
              {/* CTA Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="shadow-xl hover:shadow-2xl px-8">
                    Enroll Now - ${course.price}
                  </Button>
                  <Button size="lg" variant="outline" className="group">
                    <Heart className="h-5 w-5 mr-2 group-hover:text-rose-500 transition-colors" />
                    Save Course
                  </Button>
                </div>
                <p className="text-sm text-olive-600">
                  ✓ Lifetime access • ✓ Certificate included • ✓ 30-day guarantee
                </p>
              </div>
            </div>
            
            {/* Right: Visual Element */}
            <div className="relative animate-scale-in">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-terracotta-100 to-sage-100 shadow-2xl">
                {course.image ? (
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-70"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Calendar className="h-24 w-24 text-sage-400 mx-auto" />
                      <p className="text-sage-600 font-medium">Transform Your Life</p>
                    </div>
                  </div>
                )}
                
                {/* Floating instructor preview */}
                <div className="absolute bottom-6 left-6 right-6 bg-cream-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <p className="text-sm text-olive-600 mb-2">Your Instructor</p>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sage-300 to-terracotta-300 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {course.practitioners[0].name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-olive-900">{course.practitioners[0].name}</p>
                      <p className="text-sm text-olive-600">{course.practitioners[0].title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-7xl py-20">
        {/* Quick Actions - Floating */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 opacity-0 lg:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-cream-50/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-16 lg:grid-cols-3">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-20">
            {/* Course Overview - Immersive */}
            <section className="animate-fade-in">
              <h2 className="text-3xl font-bold text-olive-900 mb-8">Begin Your Transformation</h2>
              <div className="prose prose-lg prose-olive max-w-none">
                <p className="text-lg text-olive-700 leading-relaxed whitespace-pre-line">
                  {course.longDescription}
                </p>
              </div>
            </section>

            {/* What You'll Master */}
            <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">What You'll Master</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {course.whatYoullLearn.map((item, index) => (
                  <div key={index} className="bg-gradient-to-br from-sage-50 to-cream-100 rounded-2xl p-6 card-hover">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-6 w-6 text-sage-600" />
                      </div>
                      <p className="text-olive-700 leading-relaxed">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Your Learning Journey */}
            <section className="animate-fade-in" style={{animationDelay: '0.4s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Your Learning Journey</h2>
              <div className="space-y-6">
                {course.sessions.map((session, index) => (
                  <Card key={session.id} className="border-2 border-sage-200 hover:border-sage-300 transition-all overflow-hidden group">
                    <div className="bg-gradient-to-r from-sage-50 to-terracotta-50 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                              <span className="font-bold text-sage-700">{index + 1}</span>
                            </div>
                            <h3 className="text-xl font-semibold text-olive-900">{session.title}</h3>
                          </div>
                          <p className="text-olive-700 ml-14">{session.description}</p>
                        </div>
                        <Badge variant="terracotta" className="ml-4">
                          {session.date}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-6 bg-cream-50">
                      <div className="text-sm text-olive-600 mb-4">
                        <Clock className="h-4 w-4 inline mr-2" />
                        {session.startTime} - {session.endTime}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-olive-800 mb-3">What we'll explore:</p>
                        <div className="grid gap-2">
                          {session.agenda.map((item, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-terracotta-400 mt-2 flex-shrink-0" />
                              <span className="text-olive-600">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Immersive Benefits Section */}
            <section className="bg-gradient-to-br from-terracotta-50 to-sage-50 rounded-3xl p-10 -mx-4 animate-fade-in" style={{animationDelay: '0.6s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Transform Your Life</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {course.benefits.map((benefit) => (
                  <div key={benefit.id} className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sage-400 to-terracotta-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-olive-900">{benefit.title}</h3>
                    <p className="text-olive-600 leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Course Instructors - Enhanced */}
            {course.practitioners && course.practitioners.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.8s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">
                  {course.practitioners.length > 1 ? "Meet Your Instructors" : "Meet Your Instructor"}
                </h2>
                <div className="grid gap-6">
                  {course.practitioners.map((practitioner) => (
                    <Card key={practitioner.id} className="border-2 border-sage-200 overflow-hidden group hover:border-sage-300 transition-all">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-48 h-48 bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center">
                              <span className="text-3xl font-bold text-olive-800">
                                {practitioner.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 p-8">
                            <h3 className="text-2xl font-semibold text-olive-900 mb-2">{practitioner.name}</h3>
                            <p className="text-lg text-sage-700 mb-4">{practitioner.title}</p>
                            <p className="text-olive-600 leading-relaxed mb-4">{practitioner.bio}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="h-4 w-4 text-terracotta-500 fill-terracotta-500" />
                                ))}
                              </div>
                              <span className="text-sm text-olive-600">{practitioner.rating} ({practitioner.reviewCount} reviews)</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Testimonial Section */}
            <section className="animate-fade-in" style={{animationDelay: '1s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Success Stories</h2>
              <div className="bg-cream-100 rounded-3xl p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-terracotta-500 fill-terracotta-500" />
                  ))}
                </div>
                <blockquote className="text-xl text-olive-700 italic mb-6">
                  "This course completely changed my approach to nutrition. The personalized guidance and community support made all the difference in achieving my health goals."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sage-300 to-terracotta-300 flex items-center justify-center">
                    <span className="text-white font-bold">SM</span>
                  </div>
                  <div>
                    <p className="font-semibold text-olive-900">Sarah Martinez</p>
                    <p className="text-sm text-olive-600">Course Graduate • Verified Review</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Sticky Booking Panel */}
          <div className="space-y-8">
            <div className="lg:sticky lg:top-24">
              <CourseBookingPanel course={course} />
              
              {/* Trust Indicators */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-olive-600">
                  <CheckCircle className="h-5 w-5 text-sage-600" />
                  <span className="text-sm">Lifetime access to all materials</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <CheckCircle className="h-5 w-5 text-sage-600" />
                  <span className="text-sm">Certificate of completion included</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <CheckCircle className="h-5 w-5 text-sage-600" />
                  <span className="text-sm">30-day money-back guarantee</span>
                </div>
              </div>
              
              {/* Quick Stats */}
              <Card className="mt-6 border-2 border-sage-100 bg-sage-50/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-olive-900 mb-4">Course at a Glance</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-olive-600">Students Enrolled</span>
                      <span className="font-medium text-olive-900">247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-olive-600">Completion Rate</span>
                      <span className="font-medium text-olive-900">92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-olive-600">Average Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-terracotta-500 fill-terracotta-500" />
                        <span className="font-medium text-olive-900">{course.rating}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
