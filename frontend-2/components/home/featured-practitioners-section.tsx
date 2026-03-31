"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

// Warm gradients for placeholder images
const PLACEHOLDER_GRADIENTS = [
  "from-[#E8EDE4] to-[#F5EDE2]",
  "from-[#E8C9A8] to-[#FAF7F2]",
  "from-[#E8E5E0] to-[#E8EDE4]",
  "from-[#F5EDE2] to-[#F0EDE8]",
  "from-[#F0DDB4] to-[#FAF7F2]",
]

export default function FeaturedPractitionersSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const { data: practitionersData, isLoading } = useQuery({
    ...publicPractitionersListOptions({
      query: {
        is_featured: true,
        limit: 8,
        ordering: "-average_rating",
      },
    }),
    staleTime: 1000 * 60 * 10,
  })

  const practitioners = (() => {
    const raw = Array.isArray(practitionersData?.data?.results)
      ? practitionersData.data.results
      : Array.isArray(practitionersData?.results)
        ? practitionersData.results
        : Array.isArray(practitionersData)
          ? practitionersData
          : []
    return raw.slice(0, 8)
  })()

  const updateScrollState = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    updateScrollState()
    return () => el.removeEventListener("scroll", updateScrollState)
  }, [practitioners])

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    })
  }

  if (!isLoading && practitioners.length === 0) return null

  return (
    <section className="py-16 md:py-24 bg-[#f8f5f0]">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={itemFade}>
            <span className="block text-[11px] font-medium tracking-[2px] uppercase text-sage-600 mb-3">
              Meet Your Guides
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-olive-900">
              Featured{" "}
              <em className="italic text-terracotta-600">Practitioners</em>
            </h2>
            <p className="text-base font-light text-olive-500 mt-2">
              Expert guides ready to support your transformation
            </p>
          </motion.div>
          <motion.div variants={itemFade} className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="rounded-full border-sage-200/60 hover:bg-sage-50 h-9 w-9 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="rounded-full border-sage-200/60 hover:bg-sage-50 h-9 w-9 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Link
              href="/marketplace/practitioners"
              className="text-sm font-medium text-sage-600 hover:text-olive-900 transition-colors flex items-center gap-1"
            >
              Explore All Guides <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Practitioner Cards */}
        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[280px]">
                <div className="bg-white rounded-[18px] overflow-hidden">
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {practitioners.map((p: any, i: number) => {
              const slug = p.slug || p.public_uuid
              const name = p.display_name || p.full_name || "Practitioner"
              const title = p.professional_title || ""
              const image = p.profile_image_url || ""
              const rating = p.average_rating || p.average_rating_float || 0
              const reviewCount = p.total_reviews || p.review_count || 0
              const tagline = p.bio ? (p.bio.length > 90 ? p.bio.slice(0, 90) + "..." : p.bio) : ""
              const gradient = PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]
              const yearsExp = p.years_experience || p.experience_years || 0
              const location = p.primary_location?.city_name || p.location || ""
              const modalities = (p.specializations || p.modalities || []).slice(0, 2).map((m: any) => typeof m === 'string' ? m : m.name || '').filter(Boolean)
              const priceRange = p.price_range

              return (
                <motion.div
                  key={p.id || p.public_uuid || i}
                  className="flex-shrink-0 w-[260px] sm:w-[280px] snap-start"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <Link href={`/practitioners/${slug}`} className="group block h-full">
                    <div className="h-full bg-white rounded-[18px] overflow-hidden border border-[rgba(74,63,53,0.05)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(74,63,53,0.1)]">
                      {/* Square image */}
                      <div className="w-full aspect-square overflow-hidden relative">
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <span className="text-5xl font-serif text-olive-400/60">
                              {name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-5">
                        {/* Specialty eyebrow */}
                        {title && (
                          <p className="text-[11px] font-semibold tracking-[1px] uppercase mb-1.5" style={{ color: "#7A8B6F" }}>
                            {title}
                          </p>
                        )}

                        {/* Name */}
                        <h3 className="font-serif text-[20px] font-medium mb-1.5 group-hover:text-terracotta-800 transition-colors" style={{ color: "#4A3F35" }}>
                          {name}
                        </h3>

                        {/* Tagline */}
                        {tagline && (
                          <p className="text-[13px] leading-[1.5] mb-3 line-clamp-2" style={{ color: "#6B6560" }}>
                            {tagline}
                          </p>
                        )}

                        {/* Modality badges */}
                        {modalities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {modalities.map((m: string, mi: number) => (
                              <span key={mi} className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8EDE4] text-[#6B6560]">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats row */}
                        <div className="flex items-center gap-4 text-[12px]" style={{ color: "#9B9590" }}>
                          {rating > 0 && (
                            <span className="flex items-center gap-1">
                              <span style={{ color: "#D4A84B" }}>★</span>
                              <span className="font-medium" style={{ color: "#4A3F35" }}>{Number(rating).toFixed(1)}</span>
                            </span>
                          )}
                          {(p.total_bookings || p.session_count || 0) > 0 && (
                            <span>· {p.total_bookings || p.session_count}+ sessions</span>
                          )}
                          {yearsExp > 0 && (
                            <span>· {yearsExp}y exp</span>
                          )}
                          {!yearsExp && (
                            <span>· {p.location_type === 'in_person' ? 'In-person' : p.location_type === 'hybrid' ? 'Online & In-person' : 'Online'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
