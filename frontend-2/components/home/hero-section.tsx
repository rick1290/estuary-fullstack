"use client"
import { useState } from "react"
import Link from "next/link"
import { SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery } from "@tanstack/react-query"
import { modalityCategoriesListOptions, publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
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

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch modality categories for hero pills
  const { data: categoriesData } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
    staleTime: 1000 * 60 * 10,
  })

  // Fetch a handful of practitioners for the facepile
  const { data: practitionersData } = useQuery({
    ...publicPractitionersListOptions({
      query: {
        is_featured: true,
        limit: 6,
        ordering: '-average_rating'
      }
    }),
    staleTime: 1000 * 60 * 10,
  })

  const categories = categoriesData?.results || []

  const facePractitioners = (() => {
    const raw = Array.isArray(practitionersData?.data?.results) ? practitionersData.data.results :
                Array.isArray(practitionersData?.results) ? practitionersData.results :
                Array.isArray(practitionersData) ? practitionersData : []
    return raw.slice(0, 6)
  })()

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/marketplace?q=${encodeURIComponent(searchQuery.trim())}`
    } else {
      window.location.href = "/marketplace"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <section className="bg-[#f8f5f0] py-20 md:py-28">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Eyebrow badge */}
          <motion.span
            variants={itemFade}
            className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full mb-6"
          >
            Your Wellness Journey
          </motion.span>

          {/* Heading */}
          <motion.h1
            variants={itemFade}
            className="font-serif text-3xl sm:text-5xl md:text-[56px] font-light leading-[1.15] tracking-tight text-[#2a2218] mb-5"
          >
            Find Your Path to{" "}
            <em className="italic text-[#c4856a]">
              Wellness &amp; Growth
            </em>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={itemFade}
            className={`text-base sm:text-lg font-light leading-relaxed text-[#6b6258] ${facePractitioners.length > 0 ? 'mb-8' : 'mb-6'}`}
          >
            Connect with expert practitioners, join transformative workshops,
            and discover your path — all in one place.
          </motion.p>

          {/* Facepile */}
          {facePractitioners.length > 0 && (
            <motion.div
              variants={itemFade}
              className="flex items-center justify-center gap-3 mb-10"
            >
              <div className="flex -space-x-3">
                {facePractitioners.map((p: any, i: number) => (
                  <img
                    key={p.public_uuid || p.id || i}
                    src={p.profile_image_url || ''}
                    alt={p.display_name || p.full_name || "Practitioner"}
                    className="w-9 h-9 rounded-full border-2 border-cream-50 object-cover"
                  />
                ))}
              </div>
              <p className="text-sm font-light text-olive-500">
                Join{" "}
                <span className="font-medium text-olive-700">
                  {facePractitioners.length > 0 ? `${facePractitioners.length * 10}+` : ""}
                </span>{" "}
                practitioners &amp; growing
              </p>
            </motion.div>
          )}

          {/* Search bar */}
          <motion.div
            variants={itemFade}
            className="bg-white rounded-2xl border border-sage-200/60 p-2 sm:p-3 shadow-sm mb-6 max-w-xl mx-auto"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center pl-1 sm:pl-2">
                <SearchIcon className="h-4 w-4 sm:h-5 sm:w-5 text-sage-500" strokeWidth="1.5" />
              </div>
              <Input
                className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm sm:text-base text-olive-800 placeholder:text-olive-500/70 bg-transparent"
                placeholder="Search practitioners, workshops, courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-6"
                size="sm"
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>
          </motion.div>

          {/* Secondary link */}
          <motion.p variants={itemFade} className="mb-10">
            <Link
              href="/become-practitioner"
              className="text-sm font-medium text-olive-500 hover:text-terracotta-600 transition-colors underline underline-offset-4 decoration-sage-300 hover:decoration-terracotta-400"
            >
              Are you a practitioner?
            </Link>
          </motion.p>
        </motion.div>

        {/* Category pills */}
        {categories.length > 0 && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto"
          >
            {categories.map((cat: any) => (
              <motion.div key={cat.id} variants={itemFade}>
                <Badge
                  variant="outline"
                  className="text-olive-700 bg-white hover:bg-sage-50 border-sage-200/60 px-4 py-2 text-sm font-light transition-colors cursor-pointer"
                  asChild
                >
                  <Link href={`/modalities#${cat.slug}`}>
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: cat.color || "#9CAF88" }}
                    />
                    {cat.name}
                  </Link>
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
