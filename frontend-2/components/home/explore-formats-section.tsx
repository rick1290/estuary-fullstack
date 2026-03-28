"use client"
import Link from "next/link"
import { Users, GraduationCap, User, ArrowRight } from "lucide-react"
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

// Format options
const FORMAT_OPTIONS = [
  {
    title: "Group Workshops",
    description: "Transform together in intimate group experiences led by expert practitioners",
    icon: <Users className="h-5 w-5 text-sage-700" strokeWidth="1.5" />,
    href: "/marketplace/workshops",
    features: ["Live interaction", "Community support", "Shared wisdom"],
  },
  {
    title: "Learning Journeys",
    description: "Embark on structured courses designed for deep, lasting transformation",
    icon: <GraduationCap className="h-5 w-5 text-sage-700" strokeWidth="1.5" />,
    href: "/marketplace/courses",
    features: ["Self-paced learning", "Comprehensive curriculum", "Certification"],
  },
  {
    title: "Personal Sessions",
    description: "Connect one-on-one with practitioners for personalized guidance",
    icon: <User className="h-5 w-5 text-sage-700" strokeWidth="1.5" />,
    href: "/marketplace/sessions",
    features: ["Tailored approach", "Deep connection", "Private space"],
  },
]

export default function ExploreFormatsSection() {
  return (
    <section className="py-20 bg-cream-50">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            Choose Your Path
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl font-normal leading-[1.2] text-olive-900 mb-4"
          >
            Explore by{" "}
            <em className="italic text-terracotta-600">Format</em>
          </motion.h2>
          <motion.p
            variants={itemFade}
            className="text-base font-light text-olive-600 max-w-2xl mx-auto"
          >
            Whether you thrive in community, prefer structured learning, or seek personal guidance — find the perfect way to begin your transformation
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {FORMAT_OPTIONS.map((format) => (
            <motion.div key={format.title} variants={itemFade}>
              <Link href={format.href} className="group block h-full">
                <div className="h-full bg-white rounded-2xl border border-sage-200/60 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center mb-5">
                    {format.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-[15px] font-medium text-olive-900 mb-2">{format.title}</h3>
                  <p className="text-[13px] text-olive-500 font-light leading-relaxed mb-5">{format.description}</p>

                  {/* Features */}
                  <div className="space-y-2 mb-5">
                    {format.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-[13px] text-olive-500 font-light">
                        <div className="w-1 h-1 rounded-full bg-sage-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center text-sm text-sage-700 font-medium group-hover:text-sage-800">
                    <span>Explore {format.title}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth="1.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
