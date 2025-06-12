"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/ui/loading-spinner"
import PractitionerProfile from "@/components/practitioners/practitioner-profile"
import type { Practitioner } from "@/types/practitioner"

// Mock function to get practitioner data for preview
const getPractitionerPreviewData = async (): Promise<Practitioner> => {
  // In a real app, this would fetch from an API
  return {
    id: "practitioner-1",
    user: {
      id: "user-1",
      first_name: "",
      last_name: "",
      email: "sarah.johnson@example.com",
      profile_picture: null,
    },
    title: "Wellness Coach & Nutritional Therapist",
    bio: "With over 10 years of experience in wellness coaching, I help clients achieve balance in their physical and mental health through personalized programs.",
    description:
      "I specialize in holistic approaches to wellness, combining nutritional therapy with mindfulness practices. My approach is client-centered, focusing on sustainable lifestyle changes rather than quick fixes. I believe that true wellness comes from addressing the whole person - mind, body, and spirit.",
    quote: "Wellness is not a destination, it's a journey we take together.",
    profile_image_url: "/practitioner-1.jpg",
    profile_video_url: null,
    average_rating: "4.8",
    average_rating_float: 4.8,
    total_reviews: 24,
    years_of_experience: 10,
    is_verified: true,
    featured: true,
    practitioner_status: "active",
    specializations: [
      {
        id: 1,
        content: "Meditation Coach",
      },
      {
        id: 3,
        content: "Nutritionist",
      },
    ],
    styles: [
      {
        id: 1,
        content: "Gentle",
      },
      {
        id: 4,
        content: "Focused",
      },
    ],
    topics: [
      {
        id: 1,
        content: "Wellness",
      },
      {
        id: 2,
        content: "Mental Health",
      },
      {
        id: 3,
        content: "Fitness",
      },
    ],
    modalities: [
      {
        id: "45a2f956-aeab-4037-9eb2-6968956e148d",
        name: "Chat",
        description: "Chat sessions",
      },
      {
        id: "2b6f8169-f277-4c4c-b413-ce93693ac8b8",
        name: "In-Person",
        description: "In-Person sessions",
      },
      {
        id: "ac3dabe5-d903-471f-aa5e-76988199870c",
        name: "Virtual",
        description: "Virtual sessions",
      },
    ],
    certifications: [
      {
        id: "3563b688-4d4e-41f2-be33-0ab1067aff99",
        certificate: "Certified Personal Trainer",
        institution: "National Academy of Sports Medicine",
        order: 2,
      },
      {
        id: "d7480e8b-1e5e-4a4f-b896-f8d64f8be980",
        certificate: "Life Coach Certification",
        institution: "International Coaching Federation",
        order: 5,
      },
    ],
    educations: [
      {
        id: "e8f045be-d8d5-40cb-b6cb-8d0c51e279ed",
        degree: "Doctorate in Physical Therapy",
        educational_institute: "University of California",
        order: 3,
      },
    ],
    questions: [
      {
        id: "q1",
        question: "What inspired you to become a wellness practitioner?",
        answer:
          "After experiencing my own health transformation, I became passionate about helping others achieve their wellness goals through holistic approaches.",
      },
      {
        id: "q2",
        question: "What can clients expect in their first session with you?",
        answer:
          "In our first session, we'll discuss your goals, health history, and current challenges. I'll listen carefully to understand your needs and together we'll create a personalized plan.",
      },
    ],
    buffer_time: 15,
    next_available_date: null,
    completed_sessions: 245,
    cancellation_rate: "0.03",
    book_times: 253,
    min_price: "75",
    max_price: "150",
    total_services: 5,
    display_name: "Dr. Sarah Johnson",
    services: [
      {
        id: 3,
        name: "Wellness Consultation",
        price: "75",
        duration: 60,
        location_type: "virtual",
        is_active: true,
        image_url: "/course-image-1.jpg",
        description:
          "A comprehensive wellness consultation to assess your current health status and create a personalized plan.",
        average_rating: "4.7",
        total_reviews: 18,
        upcoming_sessions: [],
        service_type: {
          id: 1,
          name: "session",
          description: "One-on-one session",
          code: null,
        },
      },
      {
        id: 15,
        name: "Nutrition Workshop",
        price: "120",
        duration: 90,
        location_type: "virtual",
        is_active: true,
        image_url: "/workshop-image-1.jpg",
        description: "A group workshop focused on nutrition fundamentals and meal planning strategies.",
        average_rating: "4.9",
        total_reviews: 12,
        upcoming_sessions: [],
        service_type: {
          id: 2,
          name: "workshop",
          description: "Group workshop led by a practitioner",
          code: null,
        },
      },
    ],
    services_by_category: [],
    services_by_type: [
      {
        service_type: {
          id: 1,
          name: "session",
          description: "One-on-one session",
          code: null,
        },
        services: [
          {
            id: 3,
            name: "Wellness Consultation",
            price: "75",
            duration: 60,
            location_type: "virtual",
            is_active: true,
            image_url: "/course-image-1.jpg",
            description:
              "A comprehensive wellness consultation to assess your current health status and create a personalized plan.",
            average_rating: "4.7",
            total_reviews: 18,
            service_type: {
              id: 1,
              name: "session",
              description: "One-on-one session",
              code: null,
            },
          },
        ],
      },
      {
        service_type: {
          id: 2,
          name: "workshop",
          description: "Group workshop led by a practitioner",
          code: null,
        },
        services: [
          {
            id: 15,
            name: "Nutrition Workshop",
            price: "120",
            duration: 90,
            location_type: "virtual",
            is_active: true,
            image_url: "/workshop-image-1.jpg",
            description: "A group workshop focused on nutrition fundamentals and meal planning strategies.",
            average_rating: "4.9",
            total_reviews: 12,
            service_type: {
              id: 2,
              name: "workshop",
              description: "Group workshop led by a practitioner",
              code: null,
            },
          },
        ],
      },
    ],
    service_categories: [],
    locations: [
      {
        id: 8,
        practitioner: "practitioner-1",
        name: null,
        address_line1: "123 Wellness Ave",
        address_line2: "Suite 200",
        city: 3221,
        city_name: "San Francisco",
        state: 25,
        state_name: "California",
        state_abbreviation: "CA",
        zip_code: "94105",
        latitude: "37.7749",
        longitude: "-122.4194",
        is_primary: true,
        is_virtual: true,
        is_in_person: true,
        created_at: "2025-04-08T19:25:37.349097Z",
        updated_at: "2025-04-08T19:25:37.349111Z",
      },
    ],
  }
}

export default function PractitionerProfilePreview() {
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")
  const { toast } = useToast()

  // Load practitioner data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getPractitionerPreviewData()
        setPractitioner(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load practitioner preview data:", error)
        toast({
          title: "Error",
          description: "Failed to load your profile preview. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Profile Preview</h2>
        <p className="text-muted-foreground">Preview how your profile will appear to potential clients.</p>
      </div>

      <div className="flex justify-between items-center">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "desktop" | "mobile")}>
          <TabsList>
            <TabsTrigger value="desktop">Desktop View</TabsTrigger>
            <TabsTrigger value="mobile">Mobile View</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline">
          <ExternalLink className="mr-2 h-4 w-4" />
          View Public Profile
        </Button>
      </div>

      <Card className={`p-6 ${viewMode === "mobile" ? "max-w-md mx-auto" : ""}`}>
        <div className="bg-background rounded-lg overflow-hidden">
          {practitioner && <PractitionerProfile practitioner={practitioner} />}
        </div>
      </Card>
    </div>
  )
}
