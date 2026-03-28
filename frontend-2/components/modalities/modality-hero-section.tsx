"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { ModalityEditorialContent } from "@/lib/modality-content"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface ModalityHeroSectionProps {
  content: ModalityEditorialContent
}

export default function ModalityHeroSection({ content }: ModalityHeroSectionProps) {
  return (
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
          Wellness Modality
        </motion.span>

        <motion.h1
          variants={itemFade}
          className="font-serif text-3xl sm:text-4xl md:text-[48px] font-normal leading-[1.15] tracking-tight text-olive-900 mb-5"
        >
          {content.heroTitle}{" "}
          <em className="italic text-terracotta-600">{content.heroTitleAccent}</em>
        </motion.h1>

        <motion.p
          variants={itemFade}
          className="text-lg font-light leading-relaxed text-olive-600 mb-10"
        >
          {content.heroDescription}
        </motion.p>

        <motion.div variants={itemFade} className="flex flex-wrap justify-center gap-3">
          <Button
            className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-8 py-5"
            onClick={() =>
              document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Browse Services
          </Button>
          <Button
            variant="outline"
            className="border-sage-300 text-olive-700 hover:bg-sage-50 rounded-full px-8 py-5"
            onClick={() =>
              document.getElementById("practitioners-section")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Find Practitioners
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
