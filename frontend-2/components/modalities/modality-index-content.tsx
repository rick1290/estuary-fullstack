"use client"

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
                <div key={i} className="bg-white rounded-2xl border border-sage-200/60 p-6 h-40 animate-pulse" />
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
              {modalities.map((modality: any) => (
                <motion.div key={modality.id} variants={itemFade}>
                  <Link
                    href={`/modalities/${modality.slug}`}
                    className="block bg-white rounded-2xl border border-sage-200/60 p-6 hover:shadow-md hover:border-sage-300 transition-all"
                  >
                    {modality.icon && (
                      <span className="text-2xl mb-3 block">{modality.icon}</span>
                    )}
                    <h2 className="font-medium text-olive-900 text-lg mb-2">{modality.name}</h2>
                    {modality.description && (
                      <p className="text-sm font-light text-olive-600 leading-relaxed line-clamp-3">
                        {modality.description}
                      </p>
                    )}
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
