"use client"

import { useState } from "react"
import ServiceCard from "@/components/ui/service-card"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { userRemoveFavoriteService } from "@/src/client"
import { toast } from "sonner"
import { useUserFavoriteServices } from "@/hooks/use-user-favorite-services"

interface FavoriteServiceCardProps {
  service: any
  index: number
  onRemove?: () => void
}

export default function FavoriteServiceCard({ service, index, onRemove }: FavoriteServiceCardProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const { refetch: refetchFavorites } = useUserFavoriteServices()

  const { mutate: removeFavorite } = useMutation({
    mutationFn: () => userRemoveFavoriteService({ path: { service_id: service.id } }),
    onSuccess: () => {
      toast.success("Service removed from favorites")
      refetchFavorites()
      onRemove?.()
    },
    onError: () => {
      toast.error("Failed to remove service")
    },
    onSettled: () => {
      setIsRemoving(false)
    },
  })

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRemoving(true)
    removeFavorite()
  }

  // Determine service type and href
  let serviceType: "one-on-one" | "workshops" | "courses" | "packages" = "one-on-one"
  let href = `/sessions/${service.slug || service.id}`
  
  if (service.service_type === "workshop" || service.type === "workshop") {
    serviceType = "workshops"
    href = `/workshops/${service.slug || service.id}`
  } else if (service.service_type === "course" || service.type === "course") {
    serviceType = "courses"
    href = `/courses/${service.slug || service.id}`
  } else if (service.service_type === "package" || service.type === "package") {
    serviceType = "packages"
    href = `/packages/${service.slug || service.id}`
  }

  return (
    <div className="relative">
      <ServiceCard
        id={service.id || service.public_uuid}
        title={service.name || service.title}
        type={serviceType}
        description={service.short_description || service.description || "Transform your wellness journey"}
        price={service.price_cents ? Math.floor(service.price_cents / 100) : service.price || 0}
        duration={service.duration_minutes || service.duration}
        sessionCount={service.session_count || service.total_sessions}
        location={service.location_type === "virtual" ? "Virtual" : service.location || "Location TBD"}
        date={service.start_date ? new Date(service.start_date).toLocaleDateString() : undefined}
        capacity={service.max_participants || service.capacity}
        rating={service.average_rating}
        reviewCount={service.total_reviews}
        categories={service.categories?.map((c: any) => c.name) || [service.category?.name].filter(Boolean) || []}
        practitioner={{
          id: service.practitioner?.id || service.primary_practitioner?.id || "1",
          name: service.practitioner?.display_name || service.primary_practitioner?.display_name || "Practitioner",
          image: service.practitioner?.profile_image_url || service.primary_practitioner?.profile_image_url,
        }}
        href={href}
        index={index}
      />
      
      {/* Floating heart button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full h-8 w-8 hover:bg-white shadow-md z-10"
        onClick={handleRemove}
        disabled={isRemoving}
      >
        <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
      </Button>
    </div>
  )
}