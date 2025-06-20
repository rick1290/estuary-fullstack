"use client"

import { useState, useEffect, useCallback } from "react"
import type { Practitioner } from "@/types/practitioner"
import PractitionerHeader from "./profile/practitioner-header"
import ProfileTabs from "./profile/profile-tabs"
import CoursesWorkshops from "./profile/courses-workshops"
import SessionOfferings from "./profile/session-offerings"
import ClientReviews from "./profile/client-reviews"
import EstuaryPromise from "./profile/estuary-promise"
import { mockPractitionerData, mockServiceData } from "./profile/mock-data"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface PractitionerProfileProps {
  practitioner: Practitioner
  initialLiked?: boolean
}

export default function PractitionerProfile({ practitioner, initialLiked = false }: PractitionerProfileProps) {
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(initialLiked)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  // Load liked state from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      setIsLiked(!!savedLikes[practitioner.id])
    } catch (error) {
      console.error("Error loading liked state:", error)
    }
  }, [practitioner.id])

  // Handle service type filter change
  const handleServiceTypeChange = (categoryId: string | null) => {
    setSelectedServiceType(categoryId)
  }

  const handleLikeToggle = useCallback(() => {
    setIsLiked((prev) => {
      const newValue = !prev
      // Save to localStorage
      try {
        const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
        savedLikes[practitioner.id] = newValue
        localStorage.setItem("likedPractitioners", JSON.stringify(savedLikes))
      } catch (error) {
        console.error("Error saving like:", error)
      }
      return newValue
    })
  }, [practitioner.id])

  const handleMessageClick = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal({
        redirectUrl: `/practitioners/${practitioner.id}`,
        serviceType: "message",
        title: "Sign in to Message",
        description: `Connect with ${practitioner.first_name} ${practitioner.last_name} and start your wellness journey`
      })
    } else {
      // Handle messaging for authenticated users
      console.log("Open messaging interface")
      // This would typically navigate to a messaging page or open a messaging interface
    }
  }, [isAuthenticated, openAuthModal, practitioner])

  // Filter services by type
  const getServicesByType = (type: string) => {
    // First try to get from practitioner data
    if (practitioner.services_by_type && practitioner.services_by_type.length > 0) {
      return practitioner.services_by_type.find((group) => (group.service_type.code || group.service_type.name) === type)?.services || []
    }

    // Fall back to mock data if practitioner data is empty
    return mockServiceData.services_by_type.find((group) => (group.service_type.code || group.service_type.name) === type)?.services || []
  }

  // Get upcoming sessions across all services
  const getUpcomingSessions = () => {
    const sessions: any[] = []
    if (!practitioner.services) return sessions

    practitioner.services.forEach((service) => {
      if (service.upcoming_sessions && service.upcoming_sessions.length > 0) {
        service.upcoming_sessions.forEach((session) => {
          sessions.push({
            ...session,
            service,
          })
        })
      }
    })

    // Sort by start time
    return sessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const upcomingSessions = getUpcomingSessions()
  const coursesAndWorkshops = [...(getServicesByType("course") || []), ...(getServicesByType("workshop") || [])]
  const oneOnOneSessions = getServicesByType("session") || []

  // Add service categories from mock data if practitioner data is empty
  const serviceCategories =
    practitioner.service_categories && practitioner.service_categories.length > 0
      ? practitioner.service_categories
      : mockServiceData.service_categories

  return (
    <div>
      {/* Practitioner Header */}
      <PractitionerHeader practitioner={practitioner} onMessageClick={handleMessageClick} />

      {/* Profile Tabs */}
      <ProfileTabs practitioner={practitioner} />

      {/* Upcoming Courses & Workshops */}
      <CoursesWorkshops coursesAndWorkshops={coursesAndWorkshops} />

      {/* 1-on-1 Session Offerings */}
      <div id="session-offerings">
        <SessionOfferings
          sessions={oneOnOneSessions}
          categories={serviceCategories}
          selectedServiceType={selectedServiceType}
          handleServiceTypeChange={handleServiceTypeChange}
        />
      </div>

      {/* Client Reviews */}
      <ClientReviews practitioner={practitioner} testimonials={mockPractitionerData.testimonials} />

      {/* Estuary Promise */}
      <EstuaryPromise />
    </div>
  )
}
