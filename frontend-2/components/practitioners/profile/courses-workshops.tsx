"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { getServiceDetailUrl } from "@/lib/service-utils"
import ServiceCard from "@/components/ui/service-card"

interface Service {
  id: string | number
  slug?: string
  public_uuid?: string
  name: string
  description: string
  price: string
  duration?: number
  duration_minutes?: number
  location_type: string
  image_url?: string
  service_type: {
    id: string
    name: string
    code?: string
  }
  service_type_code?: string
  service_type_display?: string
  practitioner?: {
    id?: string | number
    public_uuid?: string
    display_name?: string
    profile_image_url?: string
  }
  primary_practitioner?: {
    id?: string | number
    public_uuid?: string
    display_name?: string
    profile_image_url?: string
  }
  categories?: { name: string }[]
  category?: { name: string }
  max_participants?: number
  capacity?: number
  average_rating?: number | string
  total_reviews?: number
  start_date?: string
  first_session_date?: string
  next_session_date?: string
  upcoming_sessions?: { start_time: string }[]
}

interface CoursesWorkshopsProps {
  coursesAndWorkshops: Service[]
}

export default function CoursesWorkshops({ coursesAndWorkshops }: CoursesWorkshopsProps) {
  const coursesScrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const scrollLeft = () => {
    if (coursesScrollRef.current) {
      coursesScrollRef.current.scrollBy({ left: -350, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (coursesScrollRef.current) {
      coursesScrollRef.current.scrollBy({ left: 350, behavior: "smooth" })
    }
  }

  if (coursesAndWorkshops.length === 0) {
    return null
  }

  return (
    <div className="mt-12 mb-12">
      {/* Section title */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Explore</p>
          <h2 className="font-serif text-xl font-normal text-olive-900 mb-2">Upcoming Transformations</h2>
          <p className="text-[15px] font-light text-olive-600 leading-relaxed">Group experiences and learning journeys</p>
        </div>

        {!isMobile && (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={scrollLeft} className="rounded-full border-sage-200/60 hover:bg-sage-50">
              <ChevronLeft className="h-4 w-4" strokeWidth="1.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={scrollRight} className="rounded-full border-sage-200/60 hover:bg-sage-50">
              <ChevronRight className="h-4 w-4" strokeWidth="1.5" />
            </Button>
          </div>
        )}
      </div>

      <div
        ref={coursesScrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory sm:snap-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {coursesAndWorkshops.map((item, index) => {
          const serviceType = (item.service_type_code || item.service_type?.code || item.service_type?.name || "workshop").toLowerCase()
          const cardType = serviceType === "course" ? "courses" : "workshops"
          const pract = item.practitioner || item.primary_practitioner

          // Get first upcoming session date
          const nextSessionDate = item.next_session_date ||
            (item.upcoming_sessions?.[0]?.start_time) ||
            item.start_date ||
            item.first_session_date

          // Build categories array
          const categories = item.categories?.map(c => c.name) ||
            (item.category?.name ? [item.category.name] : [])

          return (
            <div key={item.id} className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start">
              <ServiceCard
                id={item.id}
                title={item.name}
                type={cardType}
                description={item.description}
                price={item.price || "Free"}
                duration={item.duration_minutes || item.duration}
                location={item.location_type?.charAt(0).toUpperCase() + item.location_type?.slice(1) || "Virtual"}
                categories={categories}
                practitioner={{
                  id: pract?.public_uuid || pract?.id || "",
                  name: pract?.display_name || "Practitioner",
                  image: pract?.profile_image_url,
                }}
                image={item.image_url}
                href={getServiceDetailUrl(item)}
                index={index}
                capacity={item.max_participants || item.capacity}
                rating={typeof item.average_rating === "string" ? parseFloat(item.average_rating) : item.average_rating}
                reviewCount={item.total_reviews}
                date={nextSessionDate ? new Date(nextSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                nextSessionDate={cardType === "workshops" ? nextSessionDate : undefined}
                firstSessionDate={cardType === "courses" ? nextSessionDate : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
