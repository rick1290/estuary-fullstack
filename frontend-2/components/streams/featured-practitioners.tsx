"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { getMockFeaturedPractitioners } from "@/lib/mock-stream-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function FeaturedPractitioners() {
  const router = useRouter()
  const practitioners = getMockFeaturedPractitioners()

  const handlePractitionerClick = (id: string) => {
    router.push(`/practitioners/${id}`)
  }

  const handleViewStreamsClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    router.push(`/streams?practitioner=${id}`)
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {practitioners.map((practitioner) => (
        <Card
          key={practitioner.id}
          className="cursor-pointer rounded-lg transition-all hover:translate-y-[-4px] hover:shadow-md"
          onClick={() => handlePractitionerClick(practitioner.id)}
        >
          <div
            className="h-[80px] bg-primary-light"
            style={{
              backgroundImage: `url(${practitioner.coverImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="flex flex-col items-center -mt-5">
            <Avatar className="h-16 w-16 border-4 border-white">
              <AvatarImage src={practitioner.image || "/placeholder.svg"} alt={practitioner.name} />
              <AvatarFallback>{practitioner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardContent className="text-center pt-1 px-3">
              <h3 className="mb-1 font-semibold text-sm">{practitioner.name}</h3>
              <p className="mb-1 text-xs text-muted-foreground">{practitioner.title}</p>
              <div className="mb-2 flex flex-wrap justify-center gap-1">
                {practitioner.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={(e) => handleViewStreamsClick(practitioner.id, e)}
              >
                View Streams
              </Button>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  )
}
