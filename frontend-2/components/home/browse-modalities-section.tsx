"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { modalityCategoriesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// Curated icons per category slug (simple emoji for now)
const CATEGORY_ICONS: Record<string, string> = {
  yoga: "\u{1F9D8}",
  breathwork: "\u{1F32C}\u{FE0F}",
  energy: "\u{2728}",
  somatic: "\u{1F3CB}\u{FE0F}",
  bodywork: "\u{1F932}",
  mindbody: "\u{1F9E0}",
  meditation: "\u{1F54A}\u{FE0F}",
  divination: "\u{1F52E}",
  psychic: "\u{1F31F}",
  dreamwork: "\u{1F319}",
  shamanic: "\u{1F33F}",
  expressive: "\u{1F3A8}",
  holistic: "\u{1F33B}",
  coaching: "\u{1F9ED}",
}

export default function BrowseModalitiesSection() {
  const { data: categoriesData } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
    staleTime: 1000 * 60 * 10,
  })

  const categories = categoriesData?.results || []

  if (categories.length === 0) return null

  return (
    <section className="py-20 bg-[#f8f5f0]">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-[#7c9a7e] mb-4"
          >
            Discover What Resonates
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl font-light leading-[1.2] text-[#2a2218] mb-4"
          >
            Browse by{" "}
            <em className="italic text-[#c4856a]">Modality</em>
          </motion.h2>
          <motion.p
            variants={itemFade}
            className="text-base font-light text-[#6b6258] max-w-2xl mx-auto"
          >
            From ancient healing traditions to modern mind-body practices — explore
            the modalities that call to you
          </motion.p>
        </motion.div>

        {/* Category cards — horizontal scroll on mobile, grid on desktop */}
        <motion.div
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:pb-0"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          {categories.map((cat) => {
            const icon = CATEGORY_ICONS[(cat as any).slug ?? ""] || "\u{2728}"
            const count = (cat as any).modality_count ?? 0

            return (
              <motion.div
                key={cat.id}
                variants={itemFade}
                className="snap-start shrink-0 w-[260px] md:w-auto"
              >
                <Link
                  href={`/modalities#${(cat as any).slug}`}
                  className="group block h-full"
                >
                  <div className="h-full bg-white rounded-2xl border border-sage-200/60 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden">
                    {/* Color accent bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ backgroundColor: cat.color || "#9CAF88" }}
                    />

                    {/* Icon + count row */}
                    <div className="flex items-center justify-between mb-3 mt-1">
                      <span className="text-2xl">{icon}</span>
                      {count > 0 && (
                        <span className="text-[11px] font-medium text-olive-500 bg-sage-50 px-2 py-0.5 rounded-full">
                          {count} {count === 1 ? "modality" : "modalities"}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-[15px] font-medium text-olive-900 mb-1.5 group-hover:text-terracotta-700 transition-colors">
                      {cat.name}
                    </h3>

                    {/* Description */}
                    {cat.short_description && (
                      <p className="text-[13px] text-olive-500 font-light leading-relaxed line-clamp-2 mb-4">
                        {cat.short_description}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="flex items-center text-xs text-sage-600 font-medium group-hover:text-sage-800 mt-auto">
                      <span>Explore</span>
                      <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth="1.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        {/* View all link */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/modalities"
            className="inline-flex items-center gap-2 text-sm font-medium text-olive-700 hover:text-terracotta-600 transition-colors"
          >
            View all modalities
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
