"use client"
import Link from "next/link"
import { ArrowRight, Star, MapPin, Sparkles, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useRef, useState, useEffect } from "react"

export default function FeaturedPractitionersSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Fetch featured practitioners from API
  const { data: practitionersData, isLoading, error } = useQuery({
    ...publicPractitionersListOptions({
      query: {
        is_featured: true,
        limit: 8,
        ordering: '-average_rating'
      }
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Extract practitioners array and handle both paginated and direct responses
  const apiPractitioners = Array.isArray(practitionersData?.data?.results) ? practitionersData.data.results :
                          Array.isArray(practitionersData?.results) ? practitionersData.results :
                          Array.isArray(practitionersData) ? practitionersData : []

  // Transform API data to component format
  const featuredPractitioners = apiPractitioners.map(practitioner => ({
    id: practitioner.public_uuid || practitioner.id,
    slug: practitioner.slug,
    name: practitioner.display_name || practitioner.full_name || 'Practitioner',
    specialty: practitioner.primary_specialty || practitioner.professional_title || 'Wellness Practitioner',
    location: practitioner.primary_location?.city || practitioner.location || 'Virtual',
    image: practitioner.profile_image_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    rating: practitioner.average_rating || 4.8,
    reviews: practitioner.total_reviews || 0,
    modalities: practitioner.modalities?.map(m => m.name) || practitioner.primary_services?.slice(0,3).map(s => s.name) || ['Wellness'],
    nextAvailable: 'Available',
  }))

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10)
    }
  }

  const scrollLeft = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' })
      setTimeout(checkScrollButtons, 300)
    }
  }

  const scrollRight = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' })
      setTimeout(checkScrollButtons, 300)
    }
  }

  // Initialize scroll button state
  useEffect(() => {
    checkScrollButtons()
    window.addEventListener('resize', checkScrollButtons)
    return () => window.removeEventListener('resize', checkScrollButtons)
  }, [featuredPractitioners])

  return (
    <section className="py-20 bg-gradient-to-b from-white via-sage-50/30 to-cream-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sage-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-terracotta-200/20 rounded-full blur-3xl" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center mb-12">
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-terracotta-600" strokeWidth="1.5" />
              <p className="text-sm text-olive-600 font-medium uppercase tracking-wide">Meet Your Guides</p>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-olive-900">Featured Practitioners</h2>
            <p className="text-olive-600 text-lg mt-2">Expert guides ready to support your transformation</p>
          </div>
          <Button variant="ghost" asChild className="text-sage-700 hover:text-sage-800 hover:bg-sage-100 animate-fade-in">
            <Link href="/marketplace/practitioners" className="flex items-center">
              Explore All Guides
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
            </Link>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-8 justify-center flex-wrap">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-36 h-36 rounded-full mb-4" />
                <Skeleton className="h-5 w-28 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert className="border-red-200 bg-red-50 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unable to load featured practitioners. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="relative">
            {/* Scroll buttons */}
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-olive-700" />
              </button>
            )}

            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5 text-olive-700" />
              </button>
            )}

            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScrollButtons}
              className="flex gap-6 lg:gap-10 overflow-x-auto scrollbar-hide pb-8 pt-4 scroll-smooth px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {featuredPractitioners.map((practitioner, index) => (
                <div
                  key={practitioner.id}
                  className="animate-slide-up flex-shrink-0"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <Link
                    href={`/practitioners/${practitioner.slug || practitioner.id}`}
                    className="group block"
                  >
                    {/* Avatar-centric card */}
                    <div className="relative flex flex-col items-center">
                      {/* Avatar container with hover effects */}
                      <div className="relative">
                        {/* Decorative ring that appears on hover */}
                        <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-sage-200/0 via-terracotta-200/0 to-sage-300/0 group-hover:from-sage-200/60 group-hover:via-terracotta-200/40 group-hover:to-sage-300/60 transition-all duration-500 blur-sm" />

                        {/* Main avatar */}
                        <div className="relative w-36 h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden shadow-xl border-4 border-white ring-2 ring-sage-200/50 group-hover:ring-sage-300 group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300">
                          <img
                            src={practitioner.image}
                            alt={practitioner.name}
                            className="w-full h-full object-cover"
                          />

                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-olive-900/80 via-olive-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-4">
                            <span className="text-white text-sm font-medium px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                              Visit Profile
                            </span>
                          </div>
                        </div>

                        {/* Rating badge */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-lg border border-sage-100">
                          <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" />
                          <span className="text-sm font-semibold text-olive-800">{practitioner.rating}</span>
                        </div>
                      </div>

                      {/* Info below avatar */}
                      <div className="mt-6 text-center">
                        <h3 className="text-lg font-semibold text-olive-900 group-hover:text-sage-700 transition-colors">
                          {practitioner.name}
                        </h3>
                        <p className="text-olive-600 text-sm mt-0.5">{practitioner.specialty}</p>

                        {/* Location - shows on hover */}
                        <div className="flex items-center justify-center gap-1 text-sm text-olive-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{practitioner.location}</span>
                        </div>

                        {/* Modalities pills */}
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-w-[200px]">
                          {practitioner.modalities.slice(0, 2).map((modality) => (
                            <span
                              key={modality}
                              className="text-xs px-2.5 py-1 bg-sage-100/80 text-olive-700 rounded-full group-hover:bg-sage-200/80 transition-colors"
                            >
                              {modality}
                            </span>
                          ))}
                          {practitioner.modalities.length > 2 && (
                            <span className="text-xs text-olive-500 self-center">
                              +{practitioner.modalities.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
