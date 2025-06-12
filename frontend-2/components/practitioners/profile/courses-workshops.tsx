"use client"

import { useRef } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { getServiceTypeConfig } from "@/lib/service-type-config"

interface Service {
  id: string
  name: string
  description: string
  price: string
  duration: number
  location_type: string
  image_url?: string
  service_type: {
    id: string
    name: string
  }
}

interface CoursesWorkshopsProps {
  coursesAndWorkshops: Service[]
}

export default function CoursesWorkshops({ coursesAndWorkshops }: CoursesWorkshopsProps) {
  const coursesScrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Scroll handlers for courses & workshops
  const scrollLeft = () => {
    if (coursesScrollRef.current) {
      coursesScrollRef.current.scrollBy({ left: -300, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (coursesScrollRef.current) {
      coursesScrollRef.current.scrollBy({ left: 300, behavior: "smooth" })
    }
  }

  if (coursesAndWorkshops.length === 0) {
    return null
  }

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Upcoming Courses & Workshops</h2>

        {!isMobile && (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={scrollLeft}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={scrollRight}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div
        ref={coursesScrollRef}
        className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {coursesAndWorkshops.map((item) => (
          <Card key={item.id} className="min-w-[280px] max-w-[280px] flex flex-col transition-all hover:shadow-md">
            <CardContent className="flex flex-col h-full p-4">
              <Badge
                variant={getServiceTypeConfig(item.service_type.name).variant}
                className="self-start mb-2 capitalize"
              >
                {item.service_type.name}
              </Badge>

              <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.name}</h3>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{item.duration} minutes</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{item.location_type.charAt(0).toUpperCase() + item.location_type.slice(1)}</span>
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center">
                <p className="font-semibold text-primary">{item.price ? item.price : "Free"}</p>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/${item.service_type.name}s/${item.id}`}>
                    {item.service_type.name === "course" ? "Enroll Now" : "Register"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
