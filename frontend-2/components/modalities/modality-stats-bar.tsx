"use client"

import { Users, BookOpen, Star } from "lucide-react"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

interface ModalityStatsBarProps {
  practitionerCount: number
  serviceCount: number
  modalityName: string
}

export default function ModalityStatsBar({
  practitionerCount,
  serviceCount,
  modalityName,
}: ModalityStatsBarProps) {
  const stats = [
    {
      icon: Users,
      value: practitionerCount,
      label: practitionerCount === 1 ? "Practitioner" : "Practitioners",
      sublabel: `offering ${modalityName}`,
    },
    {
      icon: BookOpen,
      value: serviceCount,
      label: serviceCount === 1 ? "Service" : "Services",
      sublabel: "sessions, workshops & courses",
    },
    {
      icon: Star,
      value: "4.8",
      label: "Avg Rating",
      sublabel: "from verified clients",
    },
  ]

  // Don't render if there's no real data to show
  if (practitionerCount === 0 && serviceCount === 0) return null

  return (
    <section className="py-10 px-4 sm:px-6">
      <motion.div
        className="max-w-3xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={stagger}
      >
        <div className="bg-white rounded-2xl border border-sage-200/60 px-6 py-5">
          <div className="grid grid-cols-3 divide-x divide-sage-100">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemFade}
                className="flex flex-col items-center text-center px-4"
              >
                <stat.icon className="h-5 w-5 text-terracotta-500 mb-2" />
                <span className="text-2xl font-semibold text-olive-900 leading-none">
                  {stat.value}
                </span>
                <span className="text-sm font-medium text-olive-700 mt-1">
                  {stat.label}
                </span>
                <span className="text-xs text-olive-400 font-light hidden sm:block">
                  {stat.sublabel}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
