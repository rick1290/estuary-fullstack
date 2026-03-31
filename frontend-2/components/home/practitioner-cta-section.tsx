"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const STATS = [
  { value: "$0/mo", label: "Monthly Fees" },
  { value: "Built-in", label: "HD Video" },
  { value: "5%", label: "Commission Only" },
]

export default function PractitionerCtaSection() {
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const router = useRouter()

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "signup",
        serviceType: "practitioner-application",
        title: "Join as a Practitioner",
        description: "Create an account to start your wellness practice journey",
      })
      return
    }
    router.push("/become-practitioner/onboarding")
  }

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#4A3F35" }}>
      {/* Radial gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(122,139,111,0.15) 0%, transparent 70%)",
            "radial-gradient(ellipse 40% 60% at 20% 80%, rgba(196,149,106,0.1) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative z-10">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Left — Quote */}
          <motion.div variants={itemFade}>
            <blockquote className="font-serif text-[22px] sm:text-[26px] font-light italic leading-[1.5] text-white/95 mb-6">
              &ldquo;I canceled four subscriptions the week I joined. My clients finally have one place to find everything I offer — sessions, courses, content. It just works.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                🧘‍♀️
              </div>
              <div>
                <div className="text-[15px] font-medium text-white">Mara Thompson</div>
                <div className="text-[13px] text-white/60">Somatic Coach · 8 years</div>
              </div>
            </div>
          </motion.div>

          {/* Right — CTA content */}
          <motion.div variants={itemFade}>
            <h2 className="font-serif text-3xl sm:text-[38px] font-light leading-[1.2] text-white mb-4">
              Your Practice{" "}
              <br className="hidden sm:block" />
              Deserves a{" "}
              <em className="italic" style={{ color: "#D4AA83" }}>Home</em>
            </h2>
            <p className="text-[15px] leading-[1.7] text-white/70 mb-8">
              Sessions, workshops, courses, and content — all in one platform. No monthly fees. You only pay when you&apos;re earning.
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04]"
                >
                  <span className="text-base font-serif font-medium text-white">{stat.value}</span>
                  <span className="text-xs text-white/50">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <Button
                onClick={handleGetStarted}
                className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-8 py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Link
                href="/become-practitioner"
                className="text-sm text-white/60 hover:text-white/90 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/50 py-3"
              >
                Learn more about Estuary
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
