"use client"

import { useState } from "react"
import Link from "next/link"
import { Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ServicePractitionerProps {
  practitioner: {
    id: number
    name: string
    title: string
    bio: string
    image: string
    rating?: number
    reviewCount?: number
  }
  variant?: "compact" | "full"
}

export default function ServicePractitioner({ practitioner, variant = "compact" }: ServicePractitionerProps) {
  const [expanded, setExpanded] = useState(false)

  // Default values if not provided
  const rating = practitioner.rating || 4.8
  const reviewCount = practitioner.reviewCount || 0

  return (
    <Card className="mt-2 mb-2 overflow-hidden border border-border relative z-10">
      <CardContent className={cn("p-0", variant === "compact" ? "p-2" : "p-3")}>
        <h2 className={cn("mb-2", variant === "compact" ? "text-base font-medium" : "text-xl font-semibold")}>
          About Your Practitioner
        </h2>

        <div className="mb-2 flex gap-2">
          <Avatar className={cn("rounded-md", variant === "compact" ? "h-[50px] w-[50px]" : "h-[70px] w-[70px]")}>
            <AvatarImage src={practitioner.image || "/placeholder.svg"} alt={practitioner.name} />
            <AvatarFallback>
              {practitioner.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className={cn("mb-0.5", variant === "compact" ? "text-sm font-medium" : "text-base font-semibold")}>
              {practitioner.name}
            </h3>

            <p className={cn("mb-0.5 text-muted-foreground", variant === "compact" ? "text-xs" : "text-sm")}>
              {practitioner.title}
            </p>

            <div className="flex items-center gap-0.5">
              <Star className={cn("text-amber-500", variant === "compact" ? "h-4 w-4" : "h-[18px] w-[18px]")} />
              <p className={cn("text-muted-foreground", variant === "compact" ? "text-xs" : "text-sm")}>
                {rating} ({reviewCount} reviews)
              </p>
            </div>
          </div>
        </div>

        <div className="relative mb-2">
          <p
            className={cn(
              variant === "compact" ? "text-xs" : "text-sm",
              expanded ? "mb-2" : "",
              !expanded && "line-clamp-3",
            )}
          >
            {practitioner.bio}
          </p>

          {!expanded && practitioner.bio.length > 180 && (
            <Button
              onClick={() => setExpanded(true)}
              variant="link"
              className={cn("h-auto p-0 font-medium", variant === "compact" ? "text-xs" : "text-sm")}
            >
              Read more
            </Button>
          )}
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn("px-2", variant === "compact" ? "text-xs" : "text-sm")}
        >
          <Link href={`/practitioners/${practitioner.slug || practitioner.id}`}>View Full Profile</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
