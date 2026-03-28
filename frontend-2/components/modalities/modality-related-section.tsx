"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { modalitiesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

interface ModalityRelatedSectionProps {
  slugs: string[]
}

export default function ModalityRelatedSection({ slugs }: ModalityRelatedSectionProps) {
  const { data: modalitiesData } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 200 } }),
    staleTime: 1000 * 60 * 10,
  })

  const allModalities = modalitiesData?.results || []
  const related = slugs
    .map((s) => allModalities.find((m) => m.slug === s))
    .filter(Boolean)

  if (related.length === 0) return null

  return (
    <section className="py-16 md:py-20 px-4 sm:px-6">
      <motion.div
        className="max-w-3xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div variants={itemFade} className="text-center mb-8">
          <span className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3 block">
            You Might Also Like
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-olive-900">
            Related Modalities
          </h2>
        </motion.div>

        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {related.map((mod: any) => (
            <motion.div key={mod.id} variants={itemFade}>
              <Link
                href={`/modalities/${mod.slug}`}
                className="group flex items-center gap-4 bg-white rounded-xl border border-sage-200/60 p-4 hover:shadow-md hover:border-sage-300 transition-all"
              >
                {mod.category_color && (
                  <div
                    className="w-2 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: mod.category_color }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-olive-900 group-hover:text-terracotta-700 transition-colors">
                    {mod.name}
                  </h3>
                  {mod.short_description && (
                    <p className="text-xs font-light text-olive-500 line-clamp-1 mt-0.5">
                      {mod.short_description}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-sage-400 group-hover:text-sage-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
