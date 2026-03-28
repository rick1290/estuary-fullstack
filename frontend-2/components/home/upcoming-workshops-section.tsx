"use client"
import { useRef } from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { publicServicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import ServiceCard from "@/components/ui/service-card"
import { getServiceDetailUrl } from "@/lib/service-utils"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function UpcomingWorkshopsSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fetch upcoming workshops from API
  const { data: servicesData, isLoading, error } = useQuery({
    ...publicServicesListOptions({
      query: {
        service_type: 'workshop',
        ordering: 'start_date',
        limit: 5,
        upcoming: true
      }
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // Extract services array and handle both paginated and direct responses
  const services = Array.isArray(servicesData) ? servicesData :
                  (servicesData?.results && Array.isArray(servicesData.results)) ? servicesData.results : []

  // Transform API data to component format
  const upcomingWorkshops = services.map(service => ({
    id: service.id,
    slug: service.slug,
    title: service.name || service.title || 'Workshop',
    type: 'workshops' as const,
    practitioner: {
      id: service.practitioner?.public_uuid || service.practitioner?.id || service.primary_practitioner?.public_uuid || service.primary_practitioner?.id,
      name: service.practitioner?.display_name || service.primary_practitioner?.display_name || 'Practitioner',
      image: service.practitioner?.profile_image_url || service.primary_practitioner?.profile_image_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    },
    date: service.start_date ? new Date(service.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
    capacity: service.max_participants || service.capacity || 10,
    location: service.location_type === 'virtual'
      ? 'Virtual'
      : (service.practitioner_location?.city_name && service.practitioner_location?.state_code
          ? `${service.practitioner_location.city_name}, ${service.practitioner_location.state_code}`
          : service.practitioner_location?.full_address || service.practitioner_location?.name || 'In Person'),
    price: service.price_cents ? Math.floor(service.price_cents / 100) : service.price || 50,
    duration: service.duration_minutes || service.duration || 120,
    categories: service.categories?.map(c => c.name) || service.category ? [service.category.name] : ['Workshop'],
    description: service.description || 'Join this transformative workshop experience.',
    rating: service.average_rating || 4.8,
    reviewCount: service.total_reviews || 0,
    image: service.image_url || service.featured_image || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}?w=400&h=300&fit=crop`,
  }))

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: "smooth" })
    }
  }

  return (
    <section className="py-16 bg-cream-50">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span
                variants={itemFade}
                className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
              >
                Upcoming
              </motion.span>
              <motion.h2
                variants={itemFade}
                className="font-serif text-3xl sm:text-4xl font-normal leading-[1.2] text-olive-900"
              >
                Upcoming{" "}
                <em className="italic text-terracotta-600">Workshops</em>
              </motion.h2>
              <motion.p
                variants={itemFade}
                className="text-base font-light text-olive-600 mt-2"
              >
                Join our community for these transformative experiences
              </motion.p>
            </motion.div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={scrollLeft}
                className="hidden sm:inline-flex rounded-full border-sage-200/60 hover:bg-sage-50"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth="1.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={scrollRight}
                className="hidden sm:inline-flex rounded-full border-sage-200/60 hover:bg-sage-50"
              >
                <ChevronRight className="h-4 w-4" strokeWidth="1.5" />
              </Button>
              <Link href="/marketplace/workshops">
                <Button variant="ghost" size="sm" className="text-sage-700 hover:text-sage-800 hover:bg-sage-100">
                  View All Workshops
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[280px] sm:w-[350px]">
                <div className="bg-white rounded-2xl shadow-sm border border-sage-200/60 overflow-hidden flex flex-col">
                  <Skeleton className="w-full h-48 flex-shrink-0" />
                  <div className="p-6 flex-1 flex flex-col">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="mt-auto flex justify-between items-center">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert className="border-red-200 bg-red-50 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unable to load upcoming workshops. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {upcomingWorkshops.length > 0 ? (
                upcomingWorkshops.map((workshop, index) => (
                  <div key={workshop.id} className="flex-shrink-0 w-[280px] sm:w-[350px] snap-start">
                    <ServiceCard
                      {...workshop}
                      href={getServiceDetailUrl({ id: workshop.id, slug: workshop.slug, service_type_code: 'workshop' })}
                      index={index}
                    />
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-olive-600 text-base font-light">No upcoming workshops available at the moment.</p>
                  <Button asChild className="mt-4 bg-olive-800 hover:bg-olive-700 rounded-full">
                    <Link href="/marketplace/workshops">Browse All Workshops</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
