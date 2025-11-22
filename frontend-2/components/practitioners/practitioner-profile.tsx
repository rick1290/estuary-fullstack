"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { publicServicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { Practitioner } from "@/types/practitioner"
import PractitionerHeader from "./profile/practitioner-header"
import ProfileTabs from "./profile/profile-tabs"
import CoursesWorkshops from "./profile/courses-workshops"
import SessionOfferings from "./profile/session-offerings"
import ClientReviews from "./profile/client-reviews"
import EstuaryPromise from "./profile/estuary-promise"
import { SendMessageModal } from "./send-message-modal"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface PractitionerProfileProps {
  practitioner: Practitioner
  initialLiked?: boolean
}

export default function PractitionerProfile({ practitioner, initialLiked = false }: PractitionerProfileProps) {
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  // Fetch practitioner's services from API
  const { data: servicesData } = useQuery({
    ...publicServicesListOptions({
      query: {
        practitioner: practitioner.id as any,
        is_active: true,
        page_size: 75  // Expanded from default 20 to show all services
      }
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // Load liked state from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      const practitionerId = practitioner.public_uuid || practitioner.id
      setIsLiked(!!savedLikes[practitionerId])
    } catch (error) {
      console.error("Error loading liked state:", error)
    }
  }, [practitioner.public_uuid, practitioner.id])

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
        const practitionerId = practitioner.public_uuid || practitioner.id
        savedLikes[practitionerId] = newValue
        localStorage.setItem("likedPractitioners", JSON.stringify(savedLikes))
      } catch (error) {
        console.error("Error saving like:", error)
      }
      return newValue
    })
  }, [practitioner.public_uuid, practitioner.id])

  const handleMessageClick = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal({
        redirectUrl: `/practitioners/${practitioner.id}`,
        serviceType: "message",
        title: "Sign in to Message",
        description: `Connect with ${practitioner.first_name} ${practitioner.last_name} and start your wellness journey`
      })
    } else {
      setMessageModalOpen(true)
    }
  }, [isAuthenticated, openAuthModal, practitioner])

  // Filter services by type
  const getServicesByType = (type: string) => {
    if (servicesData?.results) {
      return servicesData.results.filter(service =>
        (service.service_type_code || service.service_type?.code || service.service_type?.name) === type
      )
    }
    return []
  }

  // Filter services by multiple types
  const getServicesByTypes = (types: string[]) => {
    if (servicesData?.results) {
      return servicesData.results.filter(service =>
        types.includes(service.service_type_code || service.service_type?.code || service.service_type?.name)
      )
    }
    return []
  }

  // Get upcoming sessions across all services
  const getUpcomingSessions = () => {
    const sessions: any[] = []
    
    // Use real API data if available
    if (servicesData?.results) {
      servicesData.results.forEach((service) => {
        if (service.upcoming_sessions && service.upcoming_sessions.length > 0) {
          service.upcoming_sessions.forEach((session) => {
            sessions.push({
              ...session,
              service,
            })
          })
        }
      })
    }

    // Sort by start time
    return sessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const upcomingSessions = getUpcomingSessions()
  const coursesAndWorkshops = [...(getServicesByType("course") || []), ...(getServicesByType("workshop") || [])]
  const oneOnOneSessions = getServicesByTypes(["session", "bundle", "package"]) || []

  // Get unique service categories from API data
  const serviceCategories = (() => {
    if (servicesData?.results && servicesData.results.length > 0) {
      const categories = new Map()
      servicesData.results.forEach(service => {
        if (service.category) {
          categories.set(service.category.id, service.category)
        }
      })
      return Array.from(categories.values())
    }
    return []
  })()

  return (
    <div>
      {/* Practitioner Header */}
      <PractitionerHeader practitioner={practitioner} onMessageClick={handleMessageClick} />

      {/* Profile Tabs */}
      <ProfileTabs practitioner={practitioner} />

      {/* Upcoming Courses & Workshops */}
      <CoursesWorkshops coursesAndWorkshops={coursesAndWorkshops} />

      {/* Sessions, Bundles & Packages */}
      <div id="session-offerings">
        <SessionOfferings
          sessions={oneOnOneSessions}
          categories={serviceCategories}
          selectedServiceType={selectedServiceType}
          handleServiceTypeChange={handleServiceTypeChange}
        />
      </div>

      {/* Client Reviews */}
      <ClientReviews practitioner={practitioner} />

      {/* Estuary Promise */}
      <EstuaryPromise />

      {/* Send Message Modal */}
      <SendMessageModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        practitioner={practitioner}
      />
    </div>
  )
}
