"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { userFavoritesOptions, userFavoriteServicesOptions } from "@/src/client/@tanstack/react-query.gen"
import PractitionerCard from "@/components/practitioners/practitioner-card"
import FavoriteServiceCard from "./favorite-service-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useUserFavorites } from "@/hooks/use-user-favorites"
import { useUserFavoriteServices } from "@/hooks/use-user-favorite-services"

interface UserFavoritesListProps {
  type?: "practitioners" | "services"
}

export default function UserFavoritesList({ type = "practitioners" }: UserFavoritesListProps) {
  const queryClient = useQueryClient()
  const [removedServiceIds, setRemovedServiceIds] = useState<Set<string>>(new Set())
  
  // Use the favorite hooks to get real-time updates
  const { favoritePractitionerIds } = useUserFavorites()
  const { favoriteServiceIds } = useUserFavoriteServices()
  
  // Fetch favorite practitioners
  const {
    data: practitionersData,
    isLoading: isPractitionersLoading,
    error: practitionersError,
    refetch: refetchPractitioners,
  } = useQuery({
    ...userFavoritesOptions(),
    enabled: type === "practitioners",
  })

  // Fetch favorite services
  const {
    data: servicesData,
    isLoading: isServicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery({
    ...userFavoriteServicesOptions(),
    enabled: type === "services",
  })

  // Refetch when favorites change
  useEffect(() => {
    if (type === "practitioners") {
      refetchPractitioners()
    }
  }, [favoritePractitionerIds, type, refetchPractitioners])
  
  useEffect(() => {
    if (type === "services") {
      refetchServices()
      // Clear removed services after refetch
      setRemovedServiceIds(new Set())
    }
  }, [favoriteServiceIds, type, refetchServices])

  const isLoading = type === "practitioners" ? isPractitionersLoading : isServicesLoading
  const error = type === "practitioners" ? practitionersError : servicesError

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Failed to load your favorites. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  // Get the results - no filtering needed for practitioners as API returns only favorites
  const practitioners = practitionersData?.results || []
  const services = (servicesData?.results || []).filter((s: any) => 
    !removedServiceIds.has(s.id?.toString() || s.public_uuid)
  )

  return (
    <div>
      {type === "practitioners" && (
        <>
          {practitioners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {practitioners.map((practitioner: any, index: number) => (
                <PractitionerCard
                  key={practitioner.id || practitioner.public_uuid}
                  practitioner={{
                    id: practitioner.id,
                    public_uuid: practitioner.public_uuid,
                    slug: practitioner.slug,
                    display_name: practitioner.display_name || practitioner.full_name,
                    title: practitioner.professional_title || practitioner.title || "Wellness Practitioner",
                    bio_short: practitioner.bio_short || practitioner.bio || "",
                    profile_image_url: practitioner.profile_image_url,
                    average_rating_float: parseFloat(practitioner.average_rating) || 0,
                    total_reviews: practitioner.total_reviews || 0,
                    is_verified: practitioner.is_verified || false,
                    years_of_experience: practitioner.years_of_experience || 0,
                    specializations: practitioner.specializations || [],
                    modalities: practitioner.modalities || [],
                    locations: practitioner.primary_location ? [{
                      ...practitioner.primary_location,
                      is_primary: true,
                      is_virtual: practitioner.primary_location.location_type === 'virtual',
                      is_in_person: practitioner.primary_location.location_type === 'in_person',
                      city_name: practitioner.primary_location.city,
                      state_abbreviation: practitioner.primary_location.state
                    }] : [],
                  }}
                  initialLiked={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't saved any practitioners yet.</p>
              <Button asChild>
                <Link href="/marketplace">Explore Practitioners</Link>
              </Button>
            </div>
          )}
        </>
      )}

      {type === "services" && (
        <>
          {services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service: any, index: number) => (
                <FavoriteServiceCard
                  key={service.id || service.public_uuid}
                  service={service}
                  index={index}
                  onRemove={() => {
                    // Add to removed set for immediate UI update
                    setRemovedServiceIds(prev => new Set(prev).add(service.id?.toString() || service.public_uuid))
                  }}
                />
              ))
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't saved any services yet.</p>
              <Button asChild>
                <Link href="/marketplace">Explore Services</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}