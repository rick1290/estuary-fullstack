"use client"
import Link from "next/link"
import { ArrowRight, Star, MapPin, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useRef, useState, useEffect } from "react"
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
    <section className="py-20 bg-[#f8f5f0]">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span
                variants={itemFade}
                className="block text-xs font-medium tracking-widest uppercase text-[#7c9a7e] mb-4"
              >
                Meet Your Guides
              </motion.span>
              <motion.h2
                variants={itemFade}
                className="font-serif text-3xl sm:text-4xl font-light leading-[1.2] text-[#2a2218]"
              >
                Featured{" "}
                <em className="italic text-[#c4856a]">Practitioners</em>
              </motion.h2>
              <motion.p
                variants={itemFade}
                className="text-base font-light text-[#6b6258] mt-2"
              >
                Expert guides ready to support your transformation
              </motion.p>
            </motion.div>
            <Button variant="ghost" size="sm" asChild className="self-start sm:self-auto text-sage-700 hover:text-sage-800 hover:bg-sage-100 flex-shrink-0">
              <Link href="/marketplace/practitioners" className="flex items-center">
                Explore All Guides
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
              </Link>
            </Button>
          </div>
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
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-md hover:bg-white hover:scale-105 transition-all duration-200"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-olive-700" />
              </button>
            )}

            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-md hover:bg-white hover:scale-105 transition-all duration-200"
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
                <motion.div
                  key={practitioner.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="flex-shrink-0"
                >
                  <Link
                    href={`/practitioners/${practitioner.slug || practitioner.id}`}
                    className="group block"
                  >
                    {/* Avatar-centric card */}
                    <div className="relative flex flex-col items-center">
                      {/* Main avatar */}
                      <div className="relative">
                        <div className="relative w-36 h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden shadow-md border-4 border-white group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300">
                          <img
                            src={practitioner.image}
                            alt={practitioner.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Rating badge */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-sage-200/60">
                          <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" />
                          <span className="text-sm font-medium text-olive-800">{practitioner.rating}</span>
                        </div>
                      </div>

                      {/* Info below avatar */}
                      <div className="mt-6 text-center">
                        <h3 className="text-[15px] font-medium text-olive-900 group-hover:text-sage-700 transition-colors">
                          {practitioner.name}
                        </h3>
                        <p className="text-olive-500 text-sm font-light mt-0.5">{practitioner.specialty}</p>

                        {/* Location - shows on hover */}
                        <div className="flex items-center justify-center gap-1 text-sm text-olive-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-light">{practitioner.location}</span>
                        </div>

                        {/* Modalities pills */}
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-w-[200px]">
                          {practitioner.modalities.slice(0, 2).map((modality) => (
                            <span
                              key={modality}
                              className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light"
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
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
