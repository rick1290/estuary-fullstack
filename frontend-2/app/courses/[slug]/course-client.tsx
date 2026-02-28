"use client"
import React, { useRef, useState } from "react"
import { ChevronRight, ChevronDown, Clock, Star, Heart, Calendar, Check, AlertCircle } from "lucide-react"
import CourseBookingPanel from "@/components/courses/course-booking-panel"
import PractitionerSpotlight from "@/components/services/practitioner-spotlight"
import { Button } from "@/components/ui/button"
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

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
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false)

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <div className="container max-w-7xl pt-8 lg:pt-12 pb-16">
          <Skeleton className="h-5 w-72 mb-6" />
          <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-10 w-3/4" />
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          </div>
        </div>
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
    <div className="min-h-screen bg-cream-50 pb-20 lg:pb-0">
      <div className="container max-w-7xl pt-8 lg:pt-12 pb-16">
        {/* Breadcrumb + Save */}
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-sm font-light text-olive-500 hover:text-olive-700">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-sm font-light text-olive-500 hover:text-olive-700">
                  <Link href="/marketplace">Explore Wellness</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-sm font-light text-olive-500 hover:text-olive-700">
                  <Link href="/marketplace/courses">Courses</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-olive-300" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-sm text-olive-900">{course.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            variant="ghost"
            size="sm"
            className="group text-olive-500 hover:text-olive-700 flex-shrink-0"
            onClick={handleSaveToggle}
            disabled={isProcessing}
          >
            <Heart
              className={`h-4 w-4 mr-1.5 transition-colors ${
                isSaved ? 'fill-rose-500 text-rose-500' : 'group-hover:text-rose-500'
              }`}
              strokeWidth="1.5"
            />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>

        {/* Two-column grid */}
        <div className="grid gap-8 lg:gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column - Content */}
          <div>
            {/* Hero content */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600">
                {course.sessionCount}-Session Journey
              </span>
              {course.modalities && course.modalities.length > 0 && (
                <>
                  {course.modalities.map((modality: { id: number; name: string; slug: string }) => (
                    <span key={modality.id} className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
                      {modality.name}
                    </span>
                  ))}
                </>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-olive-900 mb-3 leading-[1.15]">
              {course.title}
            </h1>

            {/* Practitioner line */}
            {course.practitioners && course.practitioners.length > 0 && (
              <Link
                href={course.practitioners[0].slug ? `/practitioners/${course.practitioners[0].slug}` : `/practitioners/${course.practitioners[0].id}`}
                className="inline-flex items-center gap-2.5 mb-4 group"
              >
                {course.practitioners[0].image ? (
                  <img src={course.practitioners[0].image} alt={course.practitioners[0].name} className="w-8 h-8 rounded-full object-cover border border-sage-200/60" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-100 flex items-center justify-center">
                    <span className="text-[10px] font-serif font-light text-olive-700/50">
                      {course.practitioners[0].name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
                <span className="text-sm font-light text-olive-600 group-hover:text-sage-700 transition-colors">
                  with {course.practitioners[0].name}
                </span>
              </Link>
            )}

            <p className="text-base sm:text-lg font-light text-olive-700 leading-[1.8] mb-6 pl-5 border-l-[3px] border-terracotta-400">
              {course.description}
            </p>

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              {course.firstSessionDate && (
                <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  Starts {new Date(course.firstSessionDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                <Clock className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                {course.sessionCount} Live Sessions
              </span>
              {course.reviewCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-light text-olive-600 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5">
                  <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" strokeWidth="1.5" />
                  <span className="font-medium text-olive-800">{course.rating}</span>
                  <span className="text-olive-400">({course.reviewCount})</span>
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-sage-200/40 mb-10 lg:mb-12" />

            {/* Content sections */}
            <div className="space-y-10 lg:space-y-12">
              {/* Course Overview */}
              <section>
                <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Overview</p>
                <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Begin Your <em className="italic text-terracotta-600">Transformation</em></h2>
                <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line break-words">
                  {course.longDescription}
                </p>
              </section>

              {/* What You'll Master */}
              {course.whatYoullLearn && course.whatYoullLearn.length > 0 && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Discover</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What You'll <em className="italic text-terracotta-600">Master</em></h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {course.whatYoullLearn.map((item, index) => (
                      <div key={index} className="bg-white rounded-2xl border border-sage-200/60 p-5 hover:shadow-sm transition-all">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
                              <span className="text-xs font-medium text-sage-700">{String(index + 1).padStart(2, '0')}</span>
                            </div>
                          </div>
                          <p className="text-[15px] font-light text-olive-600 leading-relaxed">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* What's Included */}
              {course.includes && course.includes.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What's <em className="italic text-terracotta-600">Included</em></h2>
                  <div className="bg-white rounded-2xl border border-sage-200/60 p-5">
                    <div className="grid md:grid-cols-2 gap-3">
                      {course.includes.map((item, index) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-sage-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-sage-600" strokeWidth="2.5" />
                          </div>
                          <span className="text-sm font-light text-olive-600 leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Prerequisites */}
              {course.prerequisites && (
                <section>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5"><em className="italic text-terracotta-600">Prerequisites</em></h2>
                  <div className="bg-cream-100 rounded-xl p-6">
                    <p className="text-[15px] font-light text-olive-600 leading-relaxed whitespace-pre-line">{course.prerequisites}</p>
                  </div>
                </section>
              )}

              {/* Your Learning Journey */}
              <section>
                <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Your Learning <em className="italic text-terracotta-600">Journey</em></h2>
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
                              <span className="text-sm font-medium text-sage-700">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-medium text-olive-900 mb-1">{session.title}</h3>
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
                                  <span className="text-[10px] px-1.5 py-0.5 border border-sage-200 rounded text-olive-500 font-light">
                                    {session.duration_minutes} min
                                  </span>
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

              {/* Benefits Section */}
              {course.benefits && course.benefits.length > 0 && (
                <section>
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Benefits</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-5">What You'll <em className="italic text-terracotta-600">Gain</em></h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {course.benefits.map((benefit, index) => (
                      <div key={benefit.id} className="bg-white rounded-2xl border border-sage-200/60 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center mb-3">
                          <span className="text-xs font-medium text-sage-700">{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <h3 className="text-[15px] font-medium text-olive-900 mb-1.5">{benefit.title}</h3>
                        <p className="text-[13px] font-light text-olive-500 leading-relaxed">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Course Instructors */}
              {course.practitioners && course.practitioners.length > 0 && (
                <section className="pt-12 border-t border-sage-200/40">
                  <PractitionerSpotlight
                    practitioners={course.practitioners}
                    role="instructor"
                  />
                </section>
              )}

              {/* Closing CTA */}
              <section className="pt-12 border-t border-sage-200/40">
                <div className="bg-gradient-to-br from-terracotta-100/40 via-sage-100/30 to-sage-200/40 rounded-2xl px-6 py-8 sm:px-8 sm:py-10 text-center">
                  <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3">Ready to Begin?</p>
                  <h2 className="font-serif text-xl font-light text-olive-900 mb-3">
                    Start your <em className="italic text-terracotta-600">learning journey</em> today
                  </h2>
                  <p className="text-sm font-light text-olive-600 mb-6 max-w-md mx-auto">
                    Enroll now and join a community of learners committed to growth and transformation.
                  </p>
                  <Button className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-8" onClick={() => setMobileBookingOpen(true)}>
                    Enroll Now
                  </Button>
                </div>
              </section>
            </div>
          </div>

          {/* Right Column - Booking Panel */}
          <div ref={bookingPanelRef}>
            <div className="lg:sticky lg:top-24">
              <CourseBookingPanel course={course} serviceData={serviceData} />

              {/* Trust Indicators */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span className="text-xs font-light">Lifetime access to all materials</span>
                </div>
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span className="text-xs font-light">Certificate of completion included</span>
                </div>
                <div className="flex items-center gap-2 text-olive-500">
                  <Check className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span className="text-xs font-light">30-day money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky booking bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-sage-200/60 px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-[11px] font-light text-olive-500">From</p>
            <p className="text-lg font-semibold text-olive-900">${course.price}</p>
          </div>
          <Button className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-6 text-sm font-medium" onClick={() => setMobileBookingOpen(true)}>
            Enroll Now
          </Button>
        </div>
      </div>

      {/* Mobile booking drawer */}
      <Drawer open={mobileBookingOpen} onOpenChange={setMobileBookingOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="font-serif text-lg font-light text-olive-900">Enroll in Course</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <CourseBookingPanel course={course} serviceData={serviceData} compact />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
