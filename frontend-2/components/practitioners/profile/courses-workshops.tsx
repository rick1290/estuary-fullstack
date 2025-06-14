"use client"

import { useRef } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, ChevronLeft, ChevronRight, Calendar, Sparkles } from "lucide-react"
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
    <div className="mt-12 mb-12 animate-fade-in" style={{animationDelay: '0.4s'}}>
      {/* Section title with enhanced spacing */}
      <div className="flex justify-between items-center mb-8">
        <div className="relative">
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent to-sage-300 hidden lg:block" />
          <h2 className="text-2xl font-bold text-olive-900 mb-2">Upcoming Transformations</h2>
          <p className="text-olive-600">Group experiences and learning journeys</p>
        </div>

        {!isMobile && (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={scrollLeft} className="rounded-full">
              <ChevronLeft className="h-4 w-4" strokeWidth="1.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={scrollRight} className="rounded-full">
              <ChevronRight className="h-4 w-4" strokeWidth="1.5" />
            </Button>
          </div>
        )}
      </div>

      <div
        ref={coursesScrollRef}
        className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {coursesAndWorkshops.map((item, index) => (
          <Card 
            key={item.id} 
            className="min-w-[320px] max-w-[320px] flex flex-col border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden animate-slide-up"
            style={{animationDelay: `${index * 0.1}s`}}
          >
            {/* Card Header with Gradient */}
            <div className="bg-gradient-to-br from-terracotta-100 to-sage-100 p-6 pb-8">
              <Badge
                variant={item.service_type.name === "course" ? "terracotta" : "sage"}
                className="mb-3"
              >
                <Sparkles className="h-3 w-3 mr-1" strokeWidth="1.5" />
                {item.service_type.name}
              </Badge>

              <h3 className="font-semibold text-xl text-olive-900 mb-2 line-clamp-2">{item.name}</h3>
              
              <p className="text-olive-700 line-clamp-2">{item.description}</p>
            </div>

            <CardContent className="flex flex-col h-full p-6 bg-cream-50 -mt-4 rounded-t-[2rem]">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-olive-700">
                  <Calendar className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                  <span className="text-sm">Next session starting soon</span>
                </div>
                
                <div className="flex items-center gap-2 text-olive-700">
                  <Clock className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                  <span className="text-sm">{item.duration} minutes</span>
                </div>

                <div className="flex items-center gap-2 text-olive-700">
                  <MapPin className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                  <span className="text-sm">{item.location_type.charAt(0).toUpperCase() + item.location_type.slice(1)}</span>
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center pt-4 border-t border-sage-100">
                <p className="text-2xl font-bold text-olive-900">{item.price ? item.price : "Free"}</p>

                <Button asChild size="sm" className="shadow-md hover:shadow-lg">
                  <Link href={`/${item.service_type.name}s/${item.id}`}>
                    {item.service_type.name === "course" ? "Start Journey" : "Reserve Spot"}
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
