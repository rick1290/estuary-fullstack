"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, Star, ImageIcon, Sparkles } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { userRecommendationsOptions } from "@/src/client/@tanstack/react-query.gen"

export default function UserRecommendations() {
  const [activeTab, setActiveTab] = useState("services")

  const { data, isLoading, error } = useQuery({
    ...userRecommendationsOptions({
      query: {
        services_limit: 4,
        practitioners_limit: 4
      }
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle both wrapped and unwrapped response formats
  const responseData = data?.data || data
  const services = responseData?.services || []
  const practitioners = responseData?.practitioners || []
  const recommendationReason = responseData?.recommendation_reason
  const userModalities = responseData?.user_modalities || []

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Recommended For You</h2>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (error || (services.length === 0 && practitioners.length === 0)) {
    return null // Don't show section if no recommendations
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">Recommended For You</h2>
        {recommendationReason === 'personalized' && userModalities.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Based on your interests
          </Badge>
        )}
      </div>

      {userModalities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {userModalities.slice(0, 3).map((modality: any) => (
            <Badge key={modality.id} variant="outline" className="text-xs">
              {modality.name}
            </Badge>
          ))}
          {userModalities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{userModalities.length - 3} more
            </Badge>
          )}
        </div>
      )}

      <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="practitioners">Practitioners ({practitioners.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          {services.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No recommended services yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((service: any) => (
                <Card key={service.id} className="overflow-hidden">
                  <div className="relative h-32">
                    {service.image_url ? (
                      <Image
                        src={service.image_url}
                        alt={service.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    {service.is_featured && (
                      <Badge className="absolute top-2 left-2 text-xs">Featured</Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{service.name}</h3>
                    {service.practitioner && (
                      <p className="text-xs text-muted-foreground mb-2">
                        by {service.practitioner.display_name}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {service.duration_minutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                      )}
                      {service.average_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{service.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 pt-0 flex items-center justify-between">
                    <p className="font-semibold text-primary text-sm">
                      ${(service.price_cents / 100).toFixed(0)}
                    </p>
                    <Button size="sm" asChild>
                      <Link href={`/services/${service.slug || service.id}`}>
                        View
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="practitioners">
          {practitioners.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No recommended practitioners yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {practitioners.map((practitioner: any) => (
                <Card key={practitioner.id} className="overflow-hidden">
                  <div className="relative h-36">
                    {practitioner.profile_image_url ? (
                      <Image
                        src={practitioner.profile_image_url}
                        alt={practitioner.display_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    {practitioner.is_featured && (
                      <Badge className="absolute top-2 left-2 text-xs">Featured</Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm">{practitioner.display_name}</h3>
                    {practitioner.professional_title && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {practitioner.professional_title}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      {practitioner.average_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs">{practitioner.average_rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">
                            ({practitioner.total_reviews})
                          </span>
                        </div>
                      )}
                    </div>

                    {practitioner.modalities && practitioner.modalities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {practitioner.modalities.slice(0, 2).map((modality: any) => (
                          <Badge key={modality.id} variant="outline" className="text-xs">
                            {modality.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="p-3 pt-0">
                    <Button className="w-full" variant="outline" size="sm" asChild>
                      <Link href={`/practitioners/${practitioner.slug || practitioner.id}`}>
                        View Profile
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
