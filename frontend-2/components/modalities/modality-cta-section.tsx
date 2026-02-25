"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface ModalityCtaSectionProps {
  heading: string
  description: string
  slug: string
}

export default function ModalityCtaSection({ heading, description, slug }: ModalityCtaSectionProps) {
  return (
    <section className="py-16 md:py-20 px-4 sm:px-6">
      <motion.div
        className="max-w-4xl mx-auto bg-gradient-to-br from-terracotta-100/60 via-sage-100/40 to-sage-200/60 rounded-3xl p-10 md:p-16 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2
          variants={itemFade}
          className="font-serif text-3xl sm:text-4xl font-light text-olive-900 mb-4"
        >
          {heading}
        </motion.h2>
        <motion.p
          variants={itemFade}
          className="text-lg font-light text-olive-600 mb-8 max-w-xl mx-auto"
        >
          {description}
        </motion.p>
        <motion.div variants={itemFade}>
          <Button
            className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-9 py-6"
            asChild
          >
            <Link href={`/marketplace?modality=${slug}`}>Explore Services</Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
