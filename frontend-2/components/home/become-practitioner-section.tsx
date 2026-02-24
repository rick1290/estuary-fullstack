"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export default function BecomePractitionerSection() {
  return (
    <section className="py-20 bg-cream-50">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-3xl mx-auto bg-gradient-to-br from-terracotta-100/60 via-sage-100/40 to-sage-200/60 rounded-3xl px-8 py-16 sm:px-14 sm:py-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            For Practitioners
          </motion.span>

          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] text-olive-900 mb-5"
          >
            Are You a{" "}
            <em className="italic text-terracotta-600">Practitioner?</em>
          </motion.h2>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-olive-600 mb-8 max-w-lg mx-auto"
          >
            Share your gifts, grow your practice, and connect with clients who
            need you — all in one home.
          </motion.p>

          <motion.div variants={itemFade}>
            <Button
              asChild
              size="lg"
              className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-8"
            >
              <Link href="/become-practitioner">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
