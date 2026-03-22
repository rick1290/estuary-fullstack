"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { streamsListOptions } from "@/src/client/@tanstack/react-query.gen"

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

  const handleCardClick = (streamId: string | number) => {
    router.push(`/streams/${streamId}`)
  }

  if (isLoading) {
    return (
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory"
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 w-[140px] flex-shrink-0 snap-start">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-14" />
          </div>
        ))}
      </div>
    )
  }

  const streams = data?.results || []

  if (streams.length === 0) {
    return null
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
      style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
    >
      {streams.map((stream: any) => (
        <div
          key={stream.id}
          className="flex flex-col items-center gap-1.5 w-[140px] flex-shrink-0 snap-start cursor-pointer rounded-xl border border-transparent p-3 transition-all hover:border-sage-200/60 hover:bg-sage-50/40"
          onClick={() => handleCardClick(stream.id)}
        >
          <Avatar className="h-16 w-16 border-2 border-sage-200/40">
            <AvatarImage
              src={stream.practitioner_image}
              alt={stream.practitioner_name}
              className="object-cover"
            />
            <AvatarFallback className="bg-sage-100 text-olive-800 text-sm font-medium">
              {stream.practitioner_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-olive-900 text-center w-full truncate">
            {stream.practitioner_name || stream.title}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {stream.subscriber_count || 0} subscribers
          </span>
        </div>
      ))}
    </div>
  )
}
