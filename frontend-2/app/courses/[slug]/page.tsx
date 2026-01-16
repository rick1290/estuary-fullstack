"use client"
import React, { useRef, useCallback } from "react"
import { ChevronRight, ChevronDown, Clock, MapPin, Users, Star, Heart, Share2, Calendar, Check, AlertCircle } from "lucide-react"
import CourseBookingPanel from "@/components/courses/course-booking-panel"
import ServicePractitioner from "@/components/shared/service-practitioner"
import PractitionerSpotlight from "@/components/services/practitioner-spotlight"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery, useMutation } from "@tanstack/react-query"
import { publicServicesBySlugRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { userAddFavoriteService, userRemoveFavoriteService } from "@/src/client"
import { useUserFavoriteServices } from "@/hooks/use-user-favorite-services"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { toast } from "sonner"
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
  includes: [],
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

export default function CourseDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const bookingPanelRef = useRef<HTMLDivElement>(null)
  const [expandedSessions, setExpandedSessions] = React.useState<Set<number>>(new Set())

  const toggleSession = (sessionId: number) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  // Fetch course data from API using slug
  const { data: serviceData, isLoading, error } = useQuery({
    ...publicServicesBySlugRetrieveOptions({ path: { slug } }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Transform API data to component format
  const course = serviceData ? {
    id: serviceData.id,
    title: serviceData.name || 'Course',
    type: "courses",
    description: serviceData.short_description || serviceData.description || 'A transformative learning experience.',
    longDescription: serviceData.description || serviceData.long_description || 'This comprehensive course will guide you through a transformative learning journey.',
    price: serviceData.price_cents ? Math.floor(serviceData.price_cents / 100) : 0,
    duration: serviceData.duration_display || serviceData.duration_text || "4 weeks",
    sessionCount: serviceData.session_count || serviceData.total_sessions || 8,
    location: serviceData.location_type === 'virtual' ? 'Virtual' : serviceData.location || 'Virtual',
    rating: serviceData.average_rating || 4.6,
    reviewCount: serviceData.total_reviews || 0,
    firstSessionDate: serviceData.first_session_date,
    lastSessionDate: serviceData.last_session_date,
    nextSessionDate: serviceData.next_session_date,
    categories: Array.isArray(serviceData.categories)
      ? serviceData.categories.map(c => c.name)
      : serviceData.category
      ? [serviceData.category.name]
      : ['Wellness'],
    modalities: Array.isArray(serviceData.modalities) ? serviceData.modalities : [],
    image: serviceData.image_url || serviceData.featured_image || '/course-image-1.jpg',
    experienceLevel: serviceData.experience_level || "beginner",
    includes: Array.isArray(serviceData.includes) ? serviceData.includes : [],
    prerequisites: serviceData.prerequisites || serviceData.requirements || null,
    whatYoullLearn: Array.isArray(serviceData.learning_objectives)
      ? serviceData.learning_objectives
      : Array.isArray(serviceData.what_youll_learn)
      ? serviceData.what_youll_learn
      : [],
    benefits: Array.isArray(serviceData.benefits)
      ? serviceData.benefits
      : [
          {
            id: 1,
            title: "Comprehensive Learning",
            description: "Gain deep understanding through structured curriculum.",
            icon: "favorite",
          },
          {
            id: 2,
            title: "Expert Guidance",
            description: "Learn from experienced practitioners and instructors.",
            icon: "person",
          },
          {
            id: 3,
            title: "Practical Application",
            description: "Apply knowledge through hands-on exercises and projects.",
            icon: "restaurant",
          },
        ],
    sessions: Array.isArray(serviceData.course_sessions)
      ? serviceData.course_sessions
      : Array.isArray(serviceData.sessions)
      ? serviceData.sessions
      : [
          {
            id: 1,
            title: "Introduction and Foundations",
            description: "Overview of course fundamentals and key concepts.",
            date: "TBD",
            startTime: "18:00",
            endTime: "19:30",
            agenda: [
              "Welcome and course overview",
              "Introduction to core principles",
              "Setting intentions and goals",
              "Q&A session",
            ],
          },
        ],
    practitioners: Array.isArray(serviceData.instructors)
      ? serviceData.instructors
      : (serviceData.practitioner || serviceData.primary_practitioner)
      ? [{
          id: (serviceData.practitioner?.public_uuid || serviceData.practitioner?.id || serviceData.primary_practitioner?.public_uuid || serviceData.primary_practitioner?.id),
          slug: (serviceData.practitioner?.slug || serviceData.primary_practitioner?.slug),
          name: (serviceData.practitioner?.display_name || serviceData.primary_practitioner?.display_name || 'Instructor'),
          title: (serviceData.practitioner?.title || serviceData.primary_practitioner?.title || 'Course Instructor'),
          bio: (serviceData.practitioner?.bio || serviceData.primary_practitioner?.bio || 'An experienced instructor dedicated to your learning journey.'),
          image: (serviceData.practitioner?.profile_image_url || serviceData.primary_practitioner?.profile_image_url || '/placeholder.svg?height=200&width=200'),
          isPrimary: true,
          rating: (serviceData.practitioner?.average_rating || serviceData.primary_practitioner?.average_rating || 4.7),
          reviewCount: (serviceData.practitioner?.total_reviews || serviceData.primary_practitioner?.total_reviews || 0),
        }]
      : [],
  } : MOCK_COURSE

  // Auth and favorites state
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const { favoriteServiceIds, refetch: refetchFavorites } = useUserFavoriteServices()
  
  // Get the service ID for API calls
  const serviceId = serviceData?.id
  const isSaved = serviceId ? favoriteServiceIds.has(serviceId.toString()) : false
  
  // Mutations for save/unsave
  const { mutate: addFavorite, isPending: isAddingFavorite } = useMutation({
    mutationFn: () => userAddFavoriteService({ body: { service_id: serviceId } }),
    onSuccess: () => {
      toast.success("Course saved to favorites")
      refetchFavorites()
    },
    onError: () => {
      toast.error("Failed to save course")
    },
  })

  const { mutate: removeFavorite, isPending: isRemovingFavorite } = useMutation({
    mutationFn: () => userRemoveFavoriteService({ path: { service_id: serviceId } }),
    onSuccess: () => {
      toast.success("Course removed from favorites")
      refetchFavorites()
    },
    onError: () => {
      toast.error("Failed to remove course")
    },
  })

  const handleSaveToggle = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/courses/${slug}`,
        title: "Sign in Required",
        description: "Please sign in to save this course to your favorites"
      })
      return
    }

    if (isSaved) {
      removeFavorite()
    } else {
      addFavorite()
    }
  }

  const isProcessing = isAddingFavorite || isRemovingFavorite

  // Scroll to booking panel
  const scrollToBooking = useCallback(() => {
    bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <section className="relative min-h-[80vh] bg-gradient-to-b from-terracotta-50 via-sage-50 to-cream-50">
          <div className="relative container max-w-7xl py-12">
            <Skeleton className="h-6 w-96 mb-12" />
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-8">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-12 w-32" />
                </div>
              </div>
              <Skeleton className="aspect-[4/5] rounded-3xl" />
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Alert className="border-red-200 bg-red-50 max-w-md">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load course details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace">Explore Wellness</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace/courses">Courses</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
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
              {/* Course Label & Modalities */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-terracotta-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-terracotta-500 rounded-full animate-pulse" />
                  <span className="text-terracotta-800 font-medium">{course.sessionCount}-Session Journey</span>
                </div>
                {course.modalities && course.modalities.length > 0 && (
                  <>
                    {course.modalities.map((modality: { id: number; name: string; slug: string }) => (
                      <Badge key={modality.id} variant="sage" className="px-3 py-1">
                        {modality.name}
                      </Badge>
                    ))}
                  </>
                )}
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
                {course.firstSessionDate && (
                  <>
                    <div>
                      <p className="text-3xl font-bold text-olive-900">
                        {new Date(course.firstSessionDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-olive-600">Starts</p>
                    </div>
                    <div className="w-px h-12 bg-sage-300" />
                  </>
                )}
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
                  <Button size="lg" className="shadow-xl hover:shadow-2xl px-8" onClick={scrollToBooking}>
                    Enroll Now - ${course.price}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="group"
                    onClick={handleSaveToggle}
                    disabled={isProcessing}
                  >
                    <Heart 
                      className={`h-5 w-5 mr-2 transition-colors ${
                        isSaved 
                          ? 'text-rose-500 fill-rose-500' 
                          : 'group-hover:text-rose-500'
                      }`} 
                      strokeWidth="1.5" 
                    />
                    {isSaved ? 'Saved' : 'Save Course'}
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
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Calendar className="h-24 w-24 text-sage-400 mx-auto" strokeWidth="1" />
                      <p className="text-sage-600 font-medium">Transform Your Life</p>
                    </div>
                  </div>
                )}
                
                {/* Floating instructor preview */}
                <div className="absolute bottom-6 left-6 right-6 bg-cream-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <p className="text-sm text-olive-600 mb-2">Your Instructor</p>
                  <div className="flex items-center gap-4">
                    {course.practitioners[0].image ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                        <img
                          src={course.practitioners[0].image}
                          alt={course.practitioners[0].name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-300 to-terracotta-300 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {course.practitioners[0].name.charAt(0)}
                        </span>
                      </div>
                    )}
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
            <Share2 className="h-4 w-4" strokeWidth="1.5" />
          </Button>
        </div>

        <div className="grid gap-16 lg:grid-cols-3">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-20">
            {/* Course Overview - Immersive */}
            <section className="animate-fade-in">
              <h2 className="text-3xl font-bold text-olive-900 mb-8">Begin Your Transformation</h2>
              <div className="prose prose-lg prose-olive max-w-none">
                <p className="text-lg text-olive-700 leading-relaxed whitespace-pre-line break-words">
                  {course.longDescription}
                </p>
              </div>
            </section>

            {/* What You'll Master */}
            {course.whatYoullLearn && course.whatYoullLearn.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">What You'll Master</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {course.whatYoullLearn.map((item, index) => (
                    <div key={index} className="bg-gradient-to-br from-sage-50 to-cream-100 rounded-2xl p-6 card-hover">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <Check className="h-6 w-6 text-sage-600 rounded-full" strokeWidth="1.5" />
                        </div>
                        <p className="text-olive-700 leading-relaxed">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* What's Included */}
            {course.includes && course.includes.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.3s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">What's Included</h2>
                <div className="bg-gradient-to-br from-terracotta-50 to-sage-50 rounded-3xl p-8">
                  <div className="grid gap-4">
                    {course.includes.map((item, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sage-400 to-terracotta-400 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" strokeWidth="2" />
                          </div>
                        </div>
                        <p className="text-olive-700 leading-relaxed flex-1">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Prerequisites */}
            {course.prerequisites && (
              <section className="animate-fade-in" style={{animationDelay: '0.35s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-6">Prerequisites</h2>
                <div className="bg-cream-100 rounded-2xl p-6">
                  <p className="text-olive-700 leading-relaxed whitespace-pre-line">{course.prerequisites}</p>
                </div>
              </section>
            )}

            {/* Your Learning Journey */}
            <section className="animate-fade-in" style={{animationDelay: '0.4s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-6">Your Learning Journey</h2>
              <div className="flex items-center gap-2 text-sm text-olive-600 bg-sage-50/50 rounded-lg p-3 mb-6">
                <Clock className="h-4 w-4" />
                <span>
                  All times are in <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}</strong> (your local timezone)
                </span>
              </div>
              <div className="space-y-3">
                {course.sessions.map((session, index) => {
                  const isExpanded = expandedSessions.has(session.id)
                  const hasLongDescription = session.description && session.description.length > 120

                  return (
                    <Card key={session.id} className="border border-sage-200 hover:border-sage-300 transition-all overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-sage-700">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-olive-900 mb-1">{session.title}</h3>
                            {session.description && (
                              <div className="mb-2">
                                <p className={`text-sm text-olive-600 ${!isExpanded && hasLongDescription ? 'line-clamp-2' : ''}`}>
                                  {session.description}
                                </p>
                                {hasLongDescription && (
                                  <button
                                    onClick={() => toggleSession(session.id)}
                                    className="text-xs text-sage-600 hover:text-sage-800 font-medium mt-1 flex items-center gap-0.5"
                                  >
                                    {isExpanded ? 'Show less' : 'Read more'}
                                    <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-olive-500">
                              {session.start_time && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" strokeWidth="1.5" />
                                    <span>
                                      {new Date(session.start_time).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" strokeWidth="1.5" />
                                    <span>
                                      {new Date(session.start_time).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                      {session.end_time && ` - ${new Date(session.end_time).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}`}
                                    </span>
                                  </div>
                                </>
                              )}
                              {session.duration_minutes && (
                                <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5">
                                  {session.duration_minutes} min
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
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

            {/* Course Instructors */}
            {course.practitioners && course.practitioners.length > 0 && (
              <PractitionerSpotlight
                practitioners={course.practitioners}
                role="instructor"
                animationDelay="0.8s"
              />
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
          <div className="space-y-8" ref={bookingPanelRef}>
            <div className="lg:sticky lg:top-24">
              <CourseBookingPanel course={course} serviceData={serviceData} />
              
              {/* Trust Indicators */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Lifetime access to all materials</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Certificate of completion included</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
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
