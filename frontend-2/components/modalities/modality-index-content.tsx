"use client"

import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { modalitiesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// Placeholder images per modality slug — swap for real assets later
const MODALITY_IMAGES: Record<string, string> = {
  "yoga": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
  "meditation-breathwork": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  "massage-therapy": "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&h=400&fit=crop",
  "acupuncture": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=400&fit=crop",
  "life-coaching": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
  "counseling-therapy": "https://images.unsplash.com/photo-1573497019236-17f8177b81e8?w=600&h=400&fit=crop",
  "nutrition-coaching": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop",
  "energy-healing": "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=600&h=400&fit=crop",
  "chiropractic-care": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&h=400&fit=crop",
  "physical-therapy": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&h=400&fit=crop"

export default function ModalityIndexContent() {
  const { data, isLoading } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 100 } }),
  })

  const modalities = data?.results || []

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

      {/* Grid */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-sage-200/60 overflow-hidden animate-pulse">
                  <div className="h-44 bg-sage-100" />
                  <div className="p-5 space-y-2">
                    <div className="h-5 bg-sage-100 rounded w-2/3" />
                    <div className="h-3 bg-sage-100 rounded w-full" />
                    <div className="h-3 bg-sage-100 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : modalities.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={stagger}
            >
              {modalities.map((modality) => (
                <motion.div key={modality.id} variants={itemFade}>
                  <Link
                    href={`/modalities/${modality.slug}`}
                    className="group block bg-white rounded-2xl border border-sage-200/60 overflow-hidden hover:shadow-md hover:border-sage-300 transition-all"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <Image
                        src={MODALITY_IMAGES[modality.slug ?? ""] ?? FALLBACK_IMAGE}
                        alt={modality.name ?? ""}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      {modality.icon && (
                        <span className="absolute top-3 left-3 text-xl bg-white/90 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center">
                          {modality.icon}
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <h2 className="font-medium text-olive-900 text-lg mb-1.5">{modality.name}</h2>
                      {modality.description && (
                        <p className="text-sm font-light text-olive-600 leading-relaxed line-clamp-2 mb-3">
                          {modality.description}
                        </p>
                      )}
                      {((modality.practitioner_count ?? 0) > 0 || (modality.service_count ?? 0) > 0) && (
                        <div className="flex items-center gap-3 text-xs text-olive-400 pt-2.5 border-t border-sage-100">
                          {(modality.practitioner_count ?? 0) > 0 && (
                            <span>{modality.practitioner_count} {modality.practitioner_count === 1 ? "practitioner" : "practitioners"}</span>
                          )}
                          {(modality.practitioner_count ?? 0) > 0 && (modality.service_count ?? 0) > 0 && (
                            <span className="text-sage-300">&middot;</span>
                          )}
                          {(modality.service_count ?? 0) > 0 && (
                            <span>{modality.service_count} {modality.service_count === 1 ? "service" : "services"}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
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
