"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { streamsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Spinner } from "@/components/ui/spinner"

export default function FeaturedPractitioners() {
  const router = useRouter()
  
  // Fetch featured streams
  const { data, isLoading } = useQuery({
    ...streamsListOptions({
      query: {
        is_featured: true,
        is_active: true,
        page_size: 5
      }
    })
  })

  const handlePractitionerClick = (practitionerId: string) => {
    router.push(`/practitioners/${practitionerId}`)
  }

  const handleViewStreamClick = (streamPublicUuid: string, event: React.MouseEvent) => {
    event.stopPropagation()
    router.push(`/streams/${streamPublicUuid}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const streams = data?.results || []

  if (streams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No featured streams available
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {streams.map((stream: any) => (
        <Card
          key={stream.id}
          className="cursor-pointer rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:translate-y-[-4px] hover:shadow-xl"
          onClick={() => handlePractitionerClick(stream.practitioner?.public_uuid || stream.practitioner?.id)}
        >
          <div
            className="h-[80px] bg-gradient-to-br from-sage-200 to-terracotta-200 rounded-t-2xl"
            style={{
              backgroundImage: stream.cover_image_url ? `url(${stream.cover_image_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="flex flex-col items-center -mt-5">
            <div className="h-16 w-16 border-4 border-white rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center shadow-lg overflow-hidden">
              {stream.practitioner?.profile_image_url ? (
                <img 
                  src={stream.practitioner.profile_image_url} 
                  alt={stream.practitioner.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-olive-800">
                  {stream.practitioner?.display_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </span>
              )}
            </div>
            <CardContent className="text-center pt-1 px-3">
              <h3 className="mb-1 font-semibold text-sm text-olive-900">{stream.title}</h3>
              <p className="mb-1 text-xs text-olive-600">{stream.practitioner?.display_name}</p>
              <div className="mb-2 flex flex-wrap justify-center gap-1">
                {(stream.tags || []).slice(0, 2).map((tag: string) => (
                  <Badge key={tag} className="text-xs bg-sage-100 text-olive-700 hover:bg-sage-200">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {stream.subscriber_count || 0} subscribers
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-sage-300 text-sage-700 hover:bg-sage-50 rounded-xl"
                onClick={(e) => handleViewStreamClick(stream.public_uuid || stream.id, e)}
              >
                View Stream
              </Button>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  )
}
