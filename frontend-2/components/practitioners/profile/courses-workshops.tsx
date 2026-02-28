"use client"

import { useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, ChevronLeft, ChevronRight, Calendar, Sparkles } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { getServiceDetailUrl, getServiceCtaText } from "@/lib/service-utils"

interface Service {
  id: string | number
  slug?: string
  public_uuid?: string
  name: string
  description: string
  price: string
  duration?: number // Legacy field
  duration_minutes?: number // Actual API field
  location_type: string
  image_url?: string
  service_type: {
    id: string
    name: string
    code?: string
  }
  service_type_code?: string
  service_type_display?: string
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
    <div className="mt-12 mb-12">
      {/* Section title with enhanced spacing */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Explore</p>
          <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Upcoming Transformations</h2>
          <p className="text-[15px] font-light text-olive-600 leading-relaxed">Group experiences and learning journeys</p>
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
            className="min-w-[320px] max-w-[320px] flex flex-col border border-sage-200/60 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
          >
            {/* Card Header */}
            <div className="bg-sage-50 p-5 pb-6">
              <span className="text-xs px-2.5 py-1 bg-white text-olive-600 rounded-full font-light inline-flex items-center gap-1 mb-3">
                <Sparkles className="h-3 w-3" strokeWidth="1.5" />
                {item.service_type_display || item.service_type_code || item.service_type?.name}
              </span>

              <h3 className="text-base font-medium text-olive-900 mb-2 line-clamp-2">{item.name}</h3>

              <p className="text-[15px] font-light text-olive-600 leading-relaxed line-clamp-2">{item.description}</p>
            </div>

            <CardContent className="flex flex-col h-full p-5">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span className="text-xs font-light text-olive-600">Next session starting soon</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span className="text-xs font-light text-olive-600">{item.duration_minutes || item.duration} minutes</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                  <span className="text-xs font-light text-olive-600">{item.location_type.charAt(0).toUpperCase() + item.location_type.slice(1)}</span>
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center pt-4 border-t border-sage-200/40">
                <p className="text-lg font-semibold text-olive-900">{item.price ? `$${item.price}` : "Free"}</p>

                <Button asChild size="sm" className="bg-olive-800 hover:bg-olive-700 text-white rounded-full">
                  <Link href={getServiceDetailUrl(item)}>
                    {getServiceCtaText(item.service_type_code || item.service_type?.name)}
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
