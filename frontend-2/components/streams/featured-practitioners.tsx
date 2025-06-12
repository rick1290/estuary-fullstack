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
          className="cursor-pointer rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:translate-y-[-4px] hover:shadow-xl"
          onClick={() => handlePractitionerClick(practitioner.id)}
        >
          <div
            className="h-[80px] bg-gradient-to-br from-sage-200 to-terracotta-200 rounded-t-2xl"
            style={{
              backgroundImage: `url(${practitioner.coverImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="flex flex-col items-center -mt-5">
            <div className="h-16 w-16 border-4 border-white rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center shadow-lg">
              <span className="text-lg font-medium text-olive-800">
                {practitioner.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <CardContent className="text-center pt-1 px-3">
              <h3 className="mb-1 font-semibold text-sm text-olive-900">{practitioner.name}</h3>
              <p className="mb-1 text-xs text-olive-600">{practitioner.title}</p>
              <div className="mb-2 flex flex-wrap justify-center gap-1">
                {practitioner.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} className="text-xs bg-sage-100 text-olive-700 hover:bg-sage-200">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-sage-300 text-sage-700 hover:bg-sage-50 rounded-xl"
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
