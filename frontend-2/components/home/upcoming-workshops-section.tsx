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
    id: service.id, // Keep for key prop
    slug: service.slug, // Add slug for URL routing
    title: service.name || service.title || 'Workshop',
    type: 'workshops' as const,
    practitioner: {
      id: service.practitioner?.public_uuid || service.practitioner?.id || service.primary_practitioner?.public_uuid || service.primary_practitioner?.id,
      name: service.practitioner?.display_name || service.primary_practitioner?.display_name || 'Practitioner',
      image: service.practitioner?.profile_image_url || service.primary_practitioner?.profile_image_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    },
    date: service.start_date ? new Date(service.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
    capacity: service.max_participants || service.capacity || 10,
    location: service.location_type === 'virtual' ? 'Virtual' : 'In-person',
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
    <section className="py-16 bg-gradient-to-b from-cream-50 to-sage-50/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-terracotta-200/30 blur-3xl top-[-100px] left-[-100px] z-0" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-sage-200/40 blur-3xl bottom-[50px] right-[10%] z-0" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-olive-900">Upcoming Transformations</h2>
            <p className="text-olive-600 text-lg mt-2">Join our community for these transformative experiences</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="rounded-full border-sage-300 hover:bg-sage-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth="1.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="rounded-full border-sage-300 hover:bg-sage-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth="1.5" />
            </Button>
            <Link href="/marketplace/workshops" className="ml-4">
              <Button variant="ghost" className="text-sage-700 hover:text-sage-800 hover:bg-sage-100">
                View All Workshops
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="min-w-[350px] max-w-[350px] flex">
                <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <div className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex justify-between items-center">
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
              className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {upcomingWorkshops.length > 0 ? (
                upcomingWorkshops.map((workshop, index) => (
                  <div key={workshop.id} className="min-w-[350px] max-w-[350px] flex">
                    <ServiceCard
                      {...workshop}
                      href={getServiceDetailUrl({ id: workshop.id, slug: workshop.slug, service_type_code: 'workshop' })}
                      index={index}
                    />
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-olive-600 text-lg">No upcoming workshops available at the moment.</p>
                  <Button asChild className="mt-4">
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