"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/ui/loading-spinner"
import PractitionerProfile from "@/components/practitioners/practitioner-profile"
import { useQuery } from "@tanstack/react-query"
import { practitionersMyProfileRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import type { Practitioner } from "@/types/practitioner"


export default function PractitionerProfilePreview() {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")
  const { toast } = useToast()

  // Fetch practitioner profile
  const { data: practitionerData, isLoading, error } = useQuery(practitionersMyProfileRetrieveOptions())

  // Transform API data to match the Practitioner type expected by PractitionerProfile component
  const practitioner: Practitioner | null = practitionerData ? {
    id: practitionerData.id,
    user: {
      id: practitionerData.email, // Using email as ID since user object not fully populated
      first_name: "",
      last_name: "",
      email: practitionerData.email,
      profile_picture: null,
    },
    title: practitionerData.professional_title || "",
    bio: practitionerData.bio || "",
    description: practitionerData.bio || "", // Using bio as description since description not in API
    quote: practitionerData.quote || "",
    profile_image_url: practitionerData.profile_image_url || null,
    profile_video_url: practitionerData.profile_video_url || null,
    average_rating: practitionerData.average_rating?.toString() || "0",
    average_rating_float: practitionerData.average_rating || 0,
    total_reviews: practitionerData.total_reviews || 0,
    years_of_experience: practitionerData.years_of_experience || 0,
    is_verified: practitionerData.is_verified || false,
    featured: practitionerData.featured || false,
    practitioner_status: practitionerData.practitioner_status || "active",
    specializations: practitionerData.specializations || [],
    styles: practitionerData.styles || [],
    topics: practitionerData.topics || [],
    modalities: practitionerData.modalities || [],
    certifications: practitionerData.certifications || [],
    educations: practitionerData.educations || [],
    questions: [], // Questions need to be fetched separately
    buffer_time: practitionerData.buffer_time || 15,
    next_available_date: practitionerData.next_available_date || null,
    completed_sessions: practitionerData.completed_sessions_count || 0,
    cancellation_rate: practitionerData.cancellation_rate?.toString() || "0",
    book_times: 0, // Not in API response
    min_price: practitionerData.price_range?.min?.toString() || "0",
    max_price: practitionerData.price_range?.max?.toString() || "0",
    total_services: practitionerData.total_services || 0,
    display_name: practitionerData.display_name || practitionerData.full_name || "",
    services: [], // Services need to be fetched separately
    services_by_category: [],
    services_by_type: [],
    service_categories: [],
    locations: practitionerData.primary_location ? [{
      id: practitionerData.primary_location.id,
      practitioner: practitionerData.id,
      name: practitionerData.primary_location.name || null,
      address_line1: practitionerData.primary_location.address_line1 || "",
      address_line2: practitionerData.primary_location.address_line2 || "",
      city: 0, // Not in API response
      city_name: practitionerData.primary_location.city || "",
      state: 0, // Not in API response
      state_name: practitionerData.primary_location.state || "",
      state_abbreviation: "", // Not in API response
      zip_code: practitionerData.primary_location.postal_code || "",
      latitude: practitionerData.primary_location.latitude?.toString() || "",
      longitude: practitionerData.primary_location.longitude?.toString() || "",
      is_primary: practitionerData.primary_location.is_primary || true,
      is_virtual: practitionerData.primary_location.is_virtual || false,
      is_in_person: practitionerData.primary_location.is_in_person || false,
      created_at: "",
      updated_at: "",
    }] : [],
  } : null

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load your profile preview. Please try again.",
      variant: "destructive",
    })
  }

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
