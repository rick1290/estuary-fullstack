import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Clock, MapPin, Users, Star, Heart, Share2, Calendar } from "lucide-react"
import SessionBookingPanel from "@/components/sessions/session-booking-panel"
import ServicePractitioner from "@/components/shared/service-practitioner"
import SessionDetails from "@/components/sessions/session-details"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Mock data for a session
const MOCK_SESSION = {
  id: 1,
  title: "Mindfulness Meditation Session",
  type: "one-on-one",
  description: "A personalized meditation session focused on mindfulness techniques for stress reduction.",
  longDescription: `This one-on-one mindfulness meditation session is designed to help you develop greater awareness, focus, and emotional regulation through guided meditation practices.

The session is tailored to your specific needs and experience level, whether you're completely new to meditation or looking to deepen your existing practice. We'll explore various mindfulness techniques that you can incorporate into your daily life to reduce stress and enhance overall wellbeing.

Each session includes personalized guidance, feedback on your technique, and recommendations for continuing your practice between sessions.`,
  price: 85,
  duration: 60,
  location: "Virtual",
  platform: "Zoom",
  rating: 4.9,
  reviewCount: 124,
  categories: ["Meditation", "Mindfulness"],
  image: "/session-image-1.jpg",
  experienceLevel: "all_levels",
  whatToExpect: [
    "Initial assessment of your current stress levels and meditation experience",
    "Guided mindfulness meditation practice tailored to your needs",
    "Instruction on proper breathing techniques and posture",
    "Discussion of how to integrate mindfulness into daily activities",
    "Personalized recommendations for home practice",
  ],
  benefits: [
    {
      id: 1,
      title: "Stress Reduction",
      description: "Learn techniques to reduce stress and anxiety in your daily life.",
      icon: "spa",
    },
    {
      id: 2,
      title: "Improved Focus",
      description: "Develop greater concentration and attention through regular practice.",
      icon: "center_focus_strong",
    },
    {
      id: 3,
      title: "Emotional Balance",
      description: "Cultivate emotional awareness and regulation skills.",
      icon: "balance",
    },
  ],
  availableSlots: [
    {
      id: 101,
      date: "2023-05-10",
      startTime: "09:00",
      endTime: "10:00",
      available: true,
    },
    {
      id: 102,
      date: "2023-05-10",
      startTime: "14:00",
      endTime: "15:00",
      available: true,
    },
    {
      id: 103,
      date: "2023-05-11",
      startTime: "11:00",
      endTime: "12:00",
      available: true,
    },
    {
      id: 104,
      date: "2023-05-12",
      startTime: "16:00",
      endTime: "17:00",
      available: true,
    },
    {
      id: 105,
      date: "2023-05-13",
      startTime: "10:00",
      endTime: "11:00",
      available: false,
    },
  ],
  practitioner: {
    id: 1,
    name: "Dr. Sarah Johnson",
    title: "Meditation Instructor & Mindfulness Coach",
    bio: "Dr. Sarah Johnson has over 15 years of experience teaching mindfulness meditation. She holds a Ph.D. in Psychology and is certified in Mindfulness-Based Stress Reduction (MBSR).",
    image: "/placeholder.svg?height=200&width=200",
    rating: 4.8,
    reviewCount: 56,
  },
}

export default function SessionDetailsPage({ params }: { params: { id: string } }) {
  // In a real application, you would fetch the session data based on the ID
  const session = MOCK_SESSION

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
                <Link href="/marketplace/sessions">Sessions</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-gray-900">{session.title}</span>
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
              <h1 className="text-4xl font-medium text-gray-900 mb-4">{session.title}</h1>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{session.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{session.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>1-on-1 Session</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{session.rating}</span>
                  <span className="text-gray-400">({session.reviewCount} reviews)</span>
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
            {session.categories.map((category) => (
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
              <h2 className="text-xl font-medium text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{session.longDescription}</p>
            </section>

            {/* What to Expect */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">What to expect</h2>
              <div className="space-y-4">
                {session.whatToExpect.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-1 bg-gray-200 rounded-full" />
                    <p className="text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Benefits */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Key Benefits</h2>
              <div className="grid gap-6">
                {session.benefits.map((benefit) => (
                  <div key={benefit.id} className="border-l-2 border-gray-200 pl-4">
                    <h3 className="font-medium text-gray-900 mb-1">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Session Details */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Session Details</h2>
              <div className="grid gap-4 text-gray-600">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Duration</span>
                  <span className="font-medium text-gray-900">{session.duration} minutes</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Format</span>
                  <span className="font-medium text-gray-900">One-on-one</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Location</span>
                  <span className="font-medium text-gray-900">{session.location}</span>
                </div>
                {session.platform && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span>Platform</span>
                    <span className="font-medium text-gray-900">{session.platform}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Experience Level</span>
                  <span className="font-medium text-gray-900">All Levels</span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Booking Panel & Practitioner */}
          <div className="space-y-8">
            <div className="lg:sticky lg:top-8 space-y-8">
              <SessionBookingPanel session={session} />
              <ServicePractitioner practitioner={session.practitioner} variant="compact" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}