"use client"

import { useQuery } from "@tanstack/react-query"
import { userFavoritesOptions, userFavoriteServicesOptions } from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, Star, MapPin, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function UserDashboardFavorites() {
  // Fetch favorite practitioners
  const { data: practitionersData, isLoading: isPractitionersLoading } = useQuery({
    ...userFavoritesOptions(),
  })

  // Fetch favorite services
  const { data: servicesData, isLoading: isServicesLoading } = useQuery({
    ...userFavoriteServicesOptions(),
  })

  const practitioners = practitionersData?.results?.slice(0, 3) || []
  const services = servicesData?.results?.slice(0, 3) || []
  
  const isLoading = isPractitionersLoading || isServicesLoading
  const hasAnyFavorites = practitioners.length > 0 || services.length > 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Favorites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!hasAnyFavorites) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              You haven't saved any practitioners or services yet
            </p>
            <Button asChild size="sm">
              <Link href="/marketplace">Explore Marketplace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          My Favorites
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/user/favorites">
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Favorite Practitioners */}
        {practitioners.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Practitioners</h3>
            <div className="space-y-3">
              {practitioners.map((practitioner: any) => (
                <Link
                  key={practitioner.id}
                  href={`/practitioners/${practitioner.slug || practitioner.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={practitioner.profile_image_url} />
                    <AvatarFallback>
                      {practitioner.display_name?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {practitioner.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {practitioner.professional_title || "Wellness Practitioner"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs">{practitioner.average_rating || 0}</span>
                      </div>
                      {practitioner.primary_location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-muted-foreground">
                            {practitioner.primary_location.city}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Services */}
        {services.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Services</h3>
            <div className="space-y-3">
              {services.map((service: any) => {
                let href = `/sessions/${service.slug || service.id}`
                let typeLabel = "Session"
                let badgeVariant = "default" as any
                
                if (service.service_type === "workshop" || service.type === "workshop") {
                  href = `/workshops/${service.slug || service.id}`
                  typeLabel = "Workshop"
                  badgeVariant = "sage"
                } else if (service.service_type === "course" || service.type === "course") {
                  href = `/courses/${service.slug || service.id}`
                  typeLabel = "Course"
                  badgeVariant = "terracotta"
                }

                return (
                  <Link
                    key={service.id}
                    href={href}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {service.name || service.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.practitioner?.display_name || service.primary_practitioner?.display_name || "Practitioner"}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant={badgeVariant} className="text-xs">
                            {typeLabel}
                          </Badge>
                          {service.duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-muted-foreground">
                                {service.duration_minutes} min
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          ${service.price_cents ? Math.floor(service.price_cents / 100) : service.price || 0}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}