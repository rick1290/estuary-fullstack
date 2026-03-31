"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { modalityCategoriesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

// Curated icons per category slug
const CATEGORY_ICONS: Record<string, string> = {
  yoga: "🧘",
  breathwork: "🌬️",
  energy: "✨",
  somatic: "🏋️",
  bodywork: "🤲",
  mindbody: "🧠",
  meditation: "🕊️",
  divination: "🔮",
  psychic: "🌟",
  dreamwork: "🌙",
  shamanic: "🌿",
  expressive: "🎨",
  holistic: "🌻",
  coaching: "🧭",
}

export default function BrowseModalitiesSection() {
  const { data: categoriesData } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
    staleTime: 1000 * 60 * 10,
  })

  const categories = categoriesData?.results || []

  if (categories.length === 0) return null

  return (
    <section className="py-20" style={{ background: "#f8f5f0" }}>
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={itemFade} className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-7 h-px" style={{ background: "#7c9a7e" }} />
            <span className="text-[11px] font-medium tracking-[0.15em] uppercase" style={{ color: "#7c9a7e" }}>
              Discover What Resonates
            </span>
            <div className="w-7 h-px" style={{ background: "#7c9a7e" }} />
          </motion.div>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl font-light leading-[1.15]"
            style={{ color: "#2a2218" }}
          >
            Browse by <em className="italic" style={{ color: "#c4856a" }}>Modality</em>
          </motion.h2>
          <motion.p
            variants={itemFade}
            className="text-base font-light mt-4 max-w-xl mx-auto"
            style={{ color: "#6b6258" }}
          >
            From ancient healing traditions to modern mind-body practices — explore the modalities that call to you
          </motion.p>
        </motion.div>

        {/* Category cards */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          {categories.map((cat) => {
            const slug = (cat as any).slug ?? ""
            const icon = CATEGORY_ICONS[slug] || "✨"
            const count = (cat as any).modality_count ?? 0

            return (
              <motion.div key={cat.id} variants={itemFade}>
                <Link
                  href={`/modalities/category/${slug}`}
                  className="group block h-full"
                >
                  <div
                    className="h-full rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden"
                    style={{ background: "white", border: "1px solid #e0d8ce" }}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${cat.color || "#9CAF88"}15`, border: `1px solid ${cat.color || "#9CAF88"}25` }}
                    >
                      <span className="text-lg sm:text-xl">{icon}</span>
                    </div>

                    {/* Name */}
                    <h3
                      className="text-sm sm:text-[15px] font-medium mb-1 group-hover:opacity-80 transition-opacity"
                      style={{ color: "#2a2218" }}
                    >
                      {cat.name}
                    </h3>

                    {/* Count */}
                    {count > 0 && (
                      <p className="text-[11px] font-light mb-3" style={{ color: "#9b9088" }}>
                        {count} {count === 1 ? "modality" : "modalities"}
                      </p>
                    )}

                    {/* Description — hidden on mobile to keep cards compact */}
                    {cat.short_description && (
                      <p
                        className="hidden sm:block text-[12px] font-light leading-relaxed line-clamp-2 mb-3"
                        style={{ color: "#6b6258" }}
                      >
                        {cat.short_description}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="flex items-center text-[11px] font-medium group-hover:gap-1.5 transition-all" style={{ color: "#7c9a7e" }}>
                      <span>Explore</span>
                      <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" strokeWidth="1.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        {/* View all link */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/modalities"
            className="inline-flex items-center gap-2 text-[13px] font-medium transition-colors hover:opacity-70"
            style={{ color: "#3d2e1e" }}
          >
            View all modalities
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
