"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const INTENT_CARDS = [
  {
    emoji: "🌿",
    title: "Stress & Anxiety",
    description: "Breathwork, meditation, and nervous system regulation",
    count: "45 practitioners",
    bg: "#E8EDE4",
    href: "/marketplace?intent=stress-anxiety",
  },
  {
    emoji: "🦋",
    title: "Trauma & Healing",
    description: "Somatic therapy, EMDR, and gentle processing",
    count: "32 practitioners",
    bg: "#F5EAE0",
    href: "/marketplace?intent=trauma-healing",
  },
  {
    emoji: "✨",
    title: "Spiritual Growth",
    description: "Energy healing, intuitive guidance, and sacred practice",
    count: "58 practitioners",
    bg: "#EDE8E0",
    href: "/marketplace?intent=spiritual-growth",
  },
  {
    emoji: "💪",
    title: "Physical Wellness",
    description: "Yoga, movement, nutrition, and bodywork",
    count: "41 practitioners",
    bg: "#E8EBE4",
    href: "/marketplace?intent=physical-wellness",
  },
  {
    emoji: "💛",
    title: "Relationships",
    description: "Couples coaching, communication, and boundaries",
    count: "22 practitioners",
    bg: "#F0E8E0",
    href: "/marketplace?intent=relationships",
  },
  {
    emoji: "🧭",
    title: "Self-Discovery",
    description: "Astrology, human design, and personality mapping",
    count: "36 practitioners",
    bg: "#E5E8E2",
    href: "/marketplace?intent=self-discovery",
  },
  {
    emoji: "🎨",
    title: "Creativity & Expression",
    description: "Art therapy, sound healing, and expressive arts",
    count: "18 practitioners",
    bg: "#F2EDE4",
    href: "/marketplace?intent=creativity",
  },
  {
    emoji: "🌱",
    title: "Life Transitions",
    description: "Career change, grief, parenthood, and new beginnings",
    count: "28 practitioners",
    bg: "#E8E5E0",
    href: "/marketplace?intent=life-transitions",
  },
]

export default function ExploreCategoriesSection() {
  return (
    <section className="py-16 md:py-24 bg-[#f8f5f0]">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-[11px] font-medium tracking-[2px] uppercase text-sage-600 mb-3"
          >
            Explore by Intent
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl font-normal text-olive-900"
          >
            What Brings You{" "}
            <em className="italic text-terracotta-600">Here?</em>
          </motion.h2>
          <motion.p
            variants={itemFade}
            className="text-base font-light text-olive-500 mt-3 max-w-lg mx-auto"
          >
            Whatever you&apos;re navigating, there&apos;s a practitioner and modality that meets you where you are.
          </motion.p>
        </motion.div>

        {/* Intent Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          {INTENT_CARDS.map((card, i) => (
            <motion.div key={i} variants={itemFade}>
              <Link href={card.href} className="group block">
                <div
                  className="relative rounded-[14px] p-5 sm:p-6 h-full overflow-hidden border border-transparent transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-[3px] hover:shadow-[0_10px_30px_rgba(74,63,53,0.06)]"
                  style={{ backgroundColor: card.bg }}
                >
                  <span className="block text-[28px] mb-3">{card.emoji}</span>
                  <h4 className="font-serif text-[17px] sm:text-lg font-medium text-olive-900 mb-1.5 relative z-10">
                    {card.title}
                  </h4>
                  <p className="text-[12.5px] text-olive-500 leading-relaxed mb-3 relative z-10">
                    {card.description}
                  </p>
                  <span className="text-[11px] text-olive-400 relative z-10">
                    {card.count}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
