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

export default function BlogPage() {
  return (
    <div className="bg-cream-50 min-h-[70vh] flex items-center">
      <motion.div
        className="container max-w-2xl px-6 text-center mx-auto py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.span
          variants={itemFade}
          className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full mb-6"
        >
          Blog
        </motion.span>

        <motion.h1
          variants={itemFade}
          className="font-serif text-4xl sm:text-5xl font-normal leading-[1.15] tracking-tight text-olive-900 mb-5"
        >
          Stories &amp; Wisdom —{" "}
          <em className="italic text-terracotta-600">Coming Soon</em>
        </motion.h1>

        <motion.p
          variants={itemFade}
          className="text-base font-light leading-relaxed text-olive-600 mb-10 max-w-md mx-auto"
        >
          We&rsquo;re working on a space for practitioner insights, wellness
          research, and stories from our community. In the meantime, explore
          what our practitioners are sharing on Streams.
        </motion.p>

        <motion.div
          variants={itemFade}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            asChild
            size="lg"
            className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-8"
          >
            <Link href="/streams">
              Browse Streams
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
            </Link>
          </Button>
          <Link
            href="/"
            className="text-sm font-medium text-olive-500 hover:text-terracotta-600 transition-colors underline underline-offset-4 decoration-sage-300 hover:decoration-terracotta-400"
          >
            Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
