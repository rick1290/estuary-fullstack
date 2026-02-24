"use client"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const TESTIMONIALS = [
  {
    quote:
      "Estuary gave me a home for my practice. Booking, payments, content — it just works.",
    name: "Sarah K.",
    role: "Breathwork Facilitator",
  },
  {
    quote:
      "I found my meditation teacher here and it changed everything. The experience feels so personal.",
    name: "James L.",
    role: "Client",
  },
  {
    quote:
      "I went from juggling five tools to one calm space. My clients notice the difference.",
    name: "Priya M.",
    role: "Yoga & Sound Healer",
  },
]

export default function TestimonialsStrip() {
  return (
    <section className="py-16 bg-cream-50">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-5xl mx-auto"
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-8 text-center"
          >
            Their Words
          </motion.span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="bg-white rounded-2xl border border-sage-200/60 p-6"
              >
                <blockquote className="font-serif text-[15px] italic font-light leading-relaxed text-olive-800 mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-olive-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-sage-600 font-light">
                      {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
