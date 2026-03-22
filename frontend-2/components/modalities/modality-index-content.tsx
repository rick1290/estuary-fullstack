"use client"

import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { modalitiesListOptions, modalityCategoriesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// Category-level fallback images — every modality in a category gets at least this
const CATEGORY_IMAGES: Record<string, string> = {
  divination: "https://images.unsplash.com/photo-1572435555646-7ad9a149ad91?w=600&h=400&fit=crop",
  psychic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
  dreamwork: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=400&fit=crop",
  energy: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=600&h=400&fit=crop",
  shamanic: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&h=400&fit=crop",
  yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
  breathwork: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  somatic: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600&h=400&fit=crop",
  bodywork: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&h=400&fit=crop",
  mindbody: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=600&h=400&fit=crop",
  expressive: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop",
  holistic: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=400&fit=crop",
  coaching: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
}

// Specific modality images where available — override category fallback
const MODALITY_IMAGES: Record<string, string> = {
  yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
  meditation: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  "massage-therapy": "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&h=400&fit=crop",
  acupuncture: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=400&fit=crop",
  reiki: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=600&h=400&fit=crop",
  breathwork: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  "sound-healing": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop",
  tarot: "https://images.unsplash.com/photo-1572435555646-7ad9a149ad91?w=600&h=400&fit=crop",
  "crystal-healing": "https://images.unsplash.com/photo-1615486511262-c7b5c1949b5a?w=600&h=400&fit=crop",
  "tai-chi": "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600&h=400&fit=crop",
  qigong: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=600&h=400&fit=crop",
  ayurveda: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&h=400&fit=crop",
  "art-therapy": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop",
  "holistic-life-coaching": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
  "nutritional-counseling": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop",
  hypnotherapy: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=400&fit=crop",
  astrology: "https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=600&h=400&fit=crop",
  mindfulness: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=600&h=400&fit=crop",
  aromatherapy: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=400&fit=crop",
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&h=400&fit=crop"

function getModalityImage(slug: string, categorySlug: string): string {
  return MODALITY_IMAGES[slug] || CATEGORY_IMAGES[categorySlug] || FALLBACK_IMAGE
}

export default function ModalityIndexContent() {
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
  })

  const { data: modalitiesData, isLoading: modalitiesLoading } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 200 } }),
  })

  const categories = categoriesData?.results || []
  const modalities = modalitiesData?.results || []
  const isLoading = categoriesLoading || modalitiesLoading

  // Group modalities by category slug
  const modalitiesByCategory = modalities.reduce<Record<string, typeof modalities>>((acc, mod) => {
    const catSlug = (mod as any).category_slug || "other"
    if (!acc[catSlug]) acc[catSlug] = []
    acc[catSlug].push(mod)
    return acc
  }, {})

  return (
    <main className="bg-cream-50 min-h-screen">
      {/* Hero */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full mb-6"
          >
            Wellness Modalities
          </motion.span>

          <motion.h1
            variants={itemFade}
            className="font-serif text-4xl sm:text-5xl font-light leading-[1.15] tracking-tight text-olive-900 mb-5"
          >
            Explore Wellness{" "}
            <em className="italic text-terracotta-600">Modalities</em>
          </motion.h1>

          <motion.p
            variants={itemFade}
            className="text-lg font-light leading-relaxed text-olive-600"
          >
            Discover the practices and traditions that resonate with you.
            Each modality offers a unique path to well-being.
          </motion.p>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* Category sections */}
      <section className="py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-6 bg-sage-100 rounded w-48 mb-6 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="bg-white rounded-2xl border border-sage-200/60 overflow-hidden animate-pulse">
                        <div className="h-36 bg-sage-100" />
                        <div className="p-4 space-y-2">
                          <div className="h-5 bg-sage-100 rounded w-2/3" />
                          <div className="h-3 bg-sage-100 rounded w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="space-y-16">
              {categories.map((category) => {
                const catModalities = modalitiesByCategory[category.slug ?? ""] || []
                if (catModalities.length === 0) return null

                return (
                  <motion.div
                    key={category.id}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-40px" }}
                    variants={stagger}
                  >
                    {/* Category header */}
                    <motion.div variants={itemFade} className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color || "#9CAF88" }}
                        />
                        <h2 className="font-serif text-2xl sm:text-3xl font-light text-olive-900">
                          {category.name}
                        </h2>
                        <span className="text-sm text-olive-400 font-light">
                          {catModalities.length} {catModalities.length === 1 ? "modality" : "modalities"}
                        </span>
                      </div>
                      {category.short_description && (
                        <p className="text-sm font-light text-olive-600 max-w-2xl ml-6">
                          {category.short_description}
                        </p>
                      )}
                    </motion.div>

                    {/* Modality cards */}
                    <motion.div
                      variants={stagger}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                      {catModalities.map((modality) => (
                        <motion.div key={modality.id} variants={itemFade}>
                          <Link
                            href={`/modalities/${modality.slug}`}
                            className="group block bg-white rounded-xl border border-sage-200/60 overflow-hidden hover:shadow-md hover:border-sage-300 transition-all"
                          >
                            <div className="relative h-32 overflow-hidden">
                              <Image
                                src={getModalityImage(modality.slug ?? "", category.slug ?? "")}
                                alt={modality.name ?? ""}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                            </div>

                            <div className="p-4">
                              <h3 className="font-medium text-olive-900 text-sm mb-1">{modality.name}</h3>
                              {(modality as any).short_description && (
                                <p className="text-xs font-light text-olive-600 leading-relaxed line-clamp-2">
                                  {(modality as any).short_description}
                                </p>
                              )}
                              {((modality.practitioner_count ?? 0) > 0 || (modality.service_count ?? 0) > 0) && (
                                <div className="flex items-center gap-2 text-[11px] text-olive-400 mt-2 pt-2 border-t border-sage-100">
                                  {(modality.practitioner_count ?? 0) > 0 && (
                                    <span>{modality.practitioner_count} practitioners</span>
                                  )}
                                  {(modality.practitioner_count ?? 0) > 0 && (modality.service_count ?? 0) > 0 && (
                                    <span className="text-sage-300">&middot;</span>
                                  )}
                                  {(modality.service_count ?? 0) > 0 && (
                                    <span>{modality.service_count} services</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-olive-500 font-light text-lg">
                Modalities are being added. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
