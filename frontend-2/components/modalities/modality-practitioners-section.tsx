"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { publicPractitionersListOptions } from "@/src/client/@tanstack/react-query.gen"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import ClientPractitionerCard from "@/components/practitioners/client-practitioner-card"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface ModalityPractitionersSectionProps {
  slug: string
  modalityName: string
}

export default function ModalityPractitionersSection({ slug, modalityName }: ModalityPractitionersSectionProps) {
  const { data, isLoading } = useQuery({
    ...publicPractitionersListOptions({
      query: { modality: slug, page_size: 6 },
    }),
  })

  const practitioners = (() => {
    const raw = Array.isArray(data?.data?.results)
      ? data.data.results
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : []
    return raw.slice(0, 6)
  })()

  return (
    <section id="practitioners-section" className="py-16 md:py-20 px-4 sm:px-6">
      <motion.div
        className="max-w-6xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div variants={itemFade} className="text-center mb-10">
          <span className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3 block">
            Expert Guides
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-olive-900">
            {modalityName} Practitioners
          </h2>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm h-[420px] animate-pulse" />
            ))}
          </div>
        ) : practitioners.length > 0 ? (
          <>
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {practitioners.map((practitioner: any) => (
                <motion.div key={practitioner.id || practitioner.public_uuid} variants={itemFade}>
                  <ClientPractitionerCard practitioner={practitioner} />
                </motion.div>
              ))}
            </motion.div>
            <motion.div variants={itemFade} className="text-center mt-10">
              <Link
                href={`/marketplace/practitioners?modality=${slug}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-olive-700 hover:text-terracotta-600 transition-colors"
              >
                View all practitioners
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </>
        ) : (
          <motion.div variants={itemFade} className="text-center py-12">
            <p className="text-olive-500 font-light">
              No practitioners available yet for {modalityName}. Check back soon!
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
