"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Check,
  X,
  Calendar,
  Video,
  BookOpen,
  Sparkles,
  CreditCard,
  MessageCircle,
  ArrowRight,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

// Animation variants
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

// Comparison data
const comparisonFeatures = [
  {
    feature: "Subscription Required",
    estuary: { value: "No", type: "no-good" as const },
    acuity: { value: "Yes", type: "yes-bad" as const },
    heallist: { value: "Optional", type: "no-bad" as const },
    flowdara: { value: "Yes", type: "yes-bad" as const },
    kajabi: { value: "Yes", type: "yes-bad" as const },
  },
  {
    feature: "Usage-Based Fees",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "Yes", type: "yes-good" as const },
    flowdara: { value: "Partial", type: "no-bad" as const },
    kajabi: { value: "No", type: "no-bad" as const },
  },
  {
    feature: "Online Booking & Scheduling",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "Yes", type: "yes-good" as const },
    heallist: { value: "Yes", type: "yes-good" as const },
    flowdara: { value: "Yes", type: "yes-good" as const },
    kajabi: { value: "Yes", type: "yes-good" as const },
  },
  {
    feature: "Built-In Video",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "Limited", type: "no-bad" as const },
    flowdara: { value: "No", type: "no-bad" as const },
    kajabi: { value: "No", type: "no-bad" as const },
  },
  {
    feature: "Session Recording",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "No", type: "no-bad" as const },
    flowdara: { value: "No", type: "no-bad" as const },
    kajabi: { value: "No", type: "no-bad" as const },
  },
  {
    feature: "Workshops & Group Events",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "Limited", type: "no-bad" as const },
    heallist: { value: "Limited", type: "no-bad" as const },
    flowdara: { value: "Limited", type: "no-bad" as const },
    kajabi: { value: "Add-on", type: "no-bad" as const },
  },
  {
    feature: "Online Course Hosting",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "No", type: "no-bad" as const },
    flowdara: { value: "No", type: "no-bad" as const },
    kajabi: { value: "Yes", type: "yes-good" as const },
  },
  {
    feature: "Content Publishing",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "No", type: "no-bad" as const },
    flowdara: { value: "No", type: "no-bad" as const },
    kajabi: { value: "Yes", type: "yes-good" as const },
  },
  {
    feature: "Membership Tools",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "No", type: "no-bad" as const },
    flowdara: { value: "No", type: "no-bad" as const },
    kajabi: { value: "Yes", type: "yes-good" as const },
  },
  {
    feature: "Hybrid (Online + In-Person)",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "Yes", type: "yes-good" as const },
    heallist: { value: "Limited", type: "no-bad" as const },
    flowdara: { value: "Limited", type: "no-bad" as const },
    kajabi: { value: "Limited", type: "no-bad" as const },
  },
  {
    feature: "Reduced Fees as You Grow",
    estuary: { value: "Yes", type: "yes-good" as const },
    acuity: { value: "No", type: "no-bad" as const },
    heallist: { value: "No", type: "no-bad" as const },
    flowdara: { value: "No", type: "no-bad" as const },
    kajabi: { value: "No", type: "no-bad" as const },
  },
]

function ComparisonCell({ value, type }: { value: string; type: string }) {
  if (type === "no-good") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-emerald-600 font-medium text-xs md:text-sm">
        <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
        {value}
      </span>
    )
  }
  if (type === "yes-good") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-emerald-600 font-medium text-xs md:text-sm">
        <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
        {value}
      </span>
    )
  }
  if (type === "no" || type === "no-bad") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-red-500 font-medium text-xs md:text-sm">
        <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
        {value}
      </span>
    )
  }
  if (type === "yes-bad") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-red-500 font-medium text-xs md:text-sm">
        <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
        {value}
      </span>
    )
  }
  // neutral
  return (
    <span className="inline-flex items-center justify-center gap-1 text-olive-500 font-medium text-xs md:text-sm">
      {value}
    </span>
  )
}

export default function BecomePractitionerPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // Handle redirect after user signs up/logs in
  useEffect(() => {
    if (isAuthenticated && shouldRedirect) {
      const timer = setTimeout(() => {
        router.push("/become-practitioner/onboarding")
        setShouldRedirect(false)
      }, 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, shouldRedirect])

  const handleGetStarted = async () => {
    if (!isAuthenticated) {
      setShouldRedirect(true)
      openAuthModal({
        defaultTab: "signup",
        serviceType: "practitioner-application",
        title: "Join as a Practitioner",
        description:
          "Create an account to start your wellness practice journey",
      })
      return
    }
    router.push("/become-practitioner/onboarding")
  }

  return (
    <div className="bg-cream-50 text-olive-900">
      {/* ─── HERO ─── */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.span
              variants={itemFade}
              className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full mb-7"
            >
              For Holistic Practitioners
            </motion.span>

            <motion.h1
              variants={itemFade}
              className="font-serif text-4xl sm:text-5xl md:text-[56px] font-light leading-[1.15] tracking-tight text-olive-900 mb-5"
            >
              You&apos;re Holding Space
              <br />
              for Everyone &mdash;
              <br />
              <em className="italic text-terracotta-600">
                Who&apos;s Holding It for You?
              </em>
            </motion.h1>

            <motion.p
              variants={itemFade}
              className="text-lg font-light leading-relaxed text-olive-600 max-w-lg mx-auto mb-9"
            >
              You became a practitioner to serve &mdash; not to manage five
              platforms before your first session. Estuary is one home for your
              sessions, courses, workshops, content, and community.{" "}
              <strong className="font-medium">No monthly fees.</strong>
            </motion.p>

            <motion.div
              variants={itemFade}
              className="flex flex-col sm:flex-row gap-3 items-center justify-center"
            >
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-9 py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Start Free
              </Button>
              <a
                href="#features"
                className="text-sm text-olive-500 hover:text-terracotta-600 border-b border-olive-300 hover:border-terracotta-600 pb-0.5 transition-colors"
              >
                See How It Works &darr;
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero image */}
        <div className="max-w-2xl mx-auto mt-12 px-2">
          <div className="rounded-3xl overflow-hidden shadow-lg relative h-60 md:h-80">
            <img
              src="/become-practitioner-hero-top.png"
              alt="Practitioners connecting online and in-person"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <div className="border-y border-sage-200/60 bg-sage-50/30 py-7 overflow-x-auto">
        <div className="flex gap-6 px-6 min-w-max md:min-w-0 md:flex-wrap md:justify-center">
          {[
            {
              quote:
                "\u201CI canceled four subscriptions the week I joined Estuary.\u201D",
              name: "Mara T.",
              role: "Somatic Coach",
            },
            {
              quote:
                "\u201CMy clients finally have one place to find everything I offer.\u201D",
              name: "Jordan L.",
              role: "Yoga Teacher",
            },
            {
              quote:
                "\u201CIt feels like it was built specifically for the way I work.\u201D",
              name: "Priya K.",
              role: "Energy Healer",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-sage-200/60 p-4 min-w-[240px] max-w-[260px]"
            >
              <p className="text-sm leading-relaxed text-olive-600 italic mb-2.5">
                {item.quote}
              </p>
              <span className="text-xs font-medium tracking-wide uppercase text-sage-600">
                {item.name} &mdash; {item.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── THE PROBLEM ─── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            The Problem
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] mb-5"
          >
            You Became a Practitioner
            <br />
            to Serve &mdash;{" "}
            <em className="italic text-terracotta-600">
              Not to Manage Software
            </em>
          </motion.h2>
          <motion.p variants={itemFade} className="text-base font-light leading-relaxed text-olive-600 mb-5">
            You hold space for transformation. You guide people through some of
            the most important moments of their lives.
          </motion.p>
          <motion.p variants={itemFade} className="text-base font-light leading-relaxed text-olive-600 mb-5">
            But somewhere along the way, you also became a part-time IT person
            &mdash; scheduling on one platform, streaming on another, hosting
            courses somewhere else, taking payments on a fourth app, and hoping
            none of the integrations break.
          </motion.p>
          <motion.blockquote
            variants={itemFade}
            className="font-serif text-xl sm:text-2xl italic text-olive-800 leading-snug my-7 pl-5 border-l-2 border-terracotta-500"
          >
            It works. But it drains you.
          </motion.blockquote>
          <motion.p variants={itemFade} className="text-base font-light leading-relaxed text-olive-600">
            You deserve infrastructure as intentional as your practice.
          </motion.p>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-16 md:py-20 px-4 sm:px-6 scroll-mt-20">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            The Solution
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] mb-5"
          >
            One Home for{" "}
            <em className="italic text-terracotta-600">Everything You Do</em>
          </motion.h2>
          <motion.p variants={itemFade} className="text-base font-light leading-relaxed text-olive-600 mb-8">
            No integrations. No brittle links. One login &mdash; for you and a
            seamless experience for every client.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid sm:grid-cols-2 gap-3"
          >
            {[
              {
                icon: <Calendar className="h-5 w-5 text-olive-600" />,
                title: "1:1 Sessions",
                desc: "Scheduling + HD video, built in \u2014 no Zoom required.",
              },
              {
                icon: <Video className="h-5 w-5 text-olive-600" />,
                title: "Workshops & Circles",
                desc: "Group hosting, intimate or large-scale.",
              },
              {
                icon: <BookOpen className="h-5 w-5 text-olive-600" />,
                title: "Courses & Programs",
                desc: "Create, deliver, and sell \u2014 all natively.",
              },
              {
                icon: <Sparkles className="h-5 w-5 text-olive-600" />,
                title: "Content & Community",
                desc: "Publish to clients and followers in one feed.",
              },
              {
                icon: <CreditCard className="h-5 w-5 text-olive-600" />,
                title: "Payments",
                desc: "Automated, built-in, no third-party accounts needed.",
              },
              {
                icon: <MessageCircle className="h-5 w-5 text-olive-600" />,
                title: "Messaging & Automations",
                desc: "Reminders, follow-ups, and client comms \u2014 handled.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="bg-white rounded-2xl border border-sage-200/60 p-5 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-olive-900 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-[13px] text-olive-500 font-light leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ─── PLATFORM COMPARISON ─── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={itemFade} className="text-center mb-10">
            <span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">
              Why Estuary
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] mb-5">
              Compare Estuary{" "}
              <em className="italic text-terracotta-600">With Others</em>
            </h2>
            <p className="text-base font-light leading-relaxed text-olive-600 max-w-xl mx-auto">
              Most platforms make you choose between booking, content, courses,
              or community. Estuary brings it all together &mdash; with no
              monthly subscription.
            </p>
          </motion.div>

          <motion.div
            variants={itemFade}
            className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-sage-200/60 shadow-sm"
          >
            {/* Swipe hint on mobile */}
            <div className="md:hidden flex items-center justify-end gap-1.5 px-4 pt-3 pb-0 text-olive-400">
              <span className="text-[11px] tracking-wide">Swipe to compare</span>
              <ArrowRight className="h-3 w-3" />
            </div>

            {/* Scrollable table for all sizes — sticky first two columns on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-sage-200">
                    <th className="text-left py-4 md:py-5 px-4 md:px-6 text-xs md:text-sm font-medium text-olive-500 sticky left-0 bg-white z-10 min-w-[140px]">
                      Feature
                    </th>
                    <th className="text-center py-4 md:py-5 px-3 md:px-5 text-xs md:text-sm font-semibold text-olive-900 sticky left-[140px] bg-sage-50/60 z-10 min-w-[90px] border-x border-sage-100">
                      Estuary
                    </th>
                    <th className="text-center py-4 md:py-5 px-3 md:px-5 text-xs md:text-sm font-medium text-olive-500 min-w-[90px]">
                      Acuity
                    </th>
                    <th className="text-center py-4 md:py-5 px-3 md:px-5 text-xs md:text-sm font-medium text-olive-500 min-w-[90px]">
                      Heallist
                    </th>
                    <th className="text-center py-4 md:py-5 px-3 md:px-5 text-xs md:text-sm font-medium text-olive-500 min-w-[90px]">
                      Flowdara
                    </th>
                    <th className="text-center py-4 md:py-5 px-3 md:px-5 text-xs md:text-sm font-medium text-olive-500 min-w-[90px]">
                      Kajabi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-sage-100 last:border-0 even:bg-sage-50/30"
                    >
                      <td className="py-3.5 md:py-4 px-4 md:px-6 text-xs md:text-sm text-olive-700 font-light sticky left-0 bg-white z-10 even:[&]:bg-sage-50/30">
                        {row.feature}
                      </td>
                      <td className="py-3.5 md:py-4 px-3 md:px-5 text-center sticky left-[140px] bg-sage-50/60 z-10 border-x border-sage-100">
                        <ComparisonCell {...row.estuary} />
                      </td>
                      <td className="py-3.5 md:py-4 px-3 md:px-5 text-center">
                        <ComparisonCell {...row.acuity} />
                      </td>
                      <td className="py-3.5 md:py-4 px-3 md:px-5 text-center">
                        <ComparisonCell {...row.heallist} />
                      </td>
                      <td className="py-3.5 md:py-4 px-3 md:px-5 text-center">
                        <ComparisonCell {...row.flowdara} />
                      </td>
                      <td className="py-3.5 md:py-4 px-3 md:px-5 text-center">
                        <ComparisonCell {...row.kajabi} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ─── PRICING ─── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto bg-olive-800 rounded-3xl p-8 sm:p-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-terracotta-300 mb-4"
          >
            Pricing
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] text-cream-50 mb-5"
          >
            You Only Pay
            <br />
            <em className="italic text-terracotta-400">
              When You&apos;re Earning
            </em>
          </motion.h2>
          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-cream-50/70 mb-7"
          >
            Most platforms charge you to exist &mdash; monthly fees whether you
            have one client or a hundred. Estuary is different.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid sm:grid-cols-2 gap-3 mb-7"
          >
            {[
              {
                badge: "$0/mo",
                badgeClass: "bg-sage-600",
                text: "No monthly subscription \u2014 ever",
              },
              {
                badge: "8%",
                badgeClass: "bg-terracotta-500",
                text: "Online work, starting rate \u2014 decreases as you grow",
              },
              {
                badge: "5%",
                badgeClass: "bg-terracotta-500",
                text: "In-person work \u2014 because embodied healing deserves encouragement",
              },
              {
                badge: "\u2193",
                badgeClass: "bg-terracotta-500",
                text: "Fees automatically drop as your revenue increases",
              },
            ].map((pill, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="bg-white/[0.08] border border-white/[0.12] rounded-xl p-4 flex items-center gap-3.5"
              >
                <span
                  className={`${pill.badgeClass} text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0`}
                >
                  {pill.badge}
                </span>
                <p className="text-sm text-cream-50/85 font-light">
                  {pill.text}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            variants={itemFade}
            className="font-serif text-xl italic text-sage-300 leading-snug mb-7"
          >
            The more you serve, the more you keep.
            <br />
            That&apos;s how it should work.
          </motion.p>

          <motion.div variants={itemFade}>
            <Button
              onClick={handleGetStarted}
              className="bg-cream-50 text-olive-800 hover:bg-sage-100 rounded-full px-9 py-5 text-base font-medium"
            >
              Start Free &rarr;
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── GROWTH ─── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            Growth
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] mb-5"
          >
            Built for Where You&apos;re Going &mdash;
            <br />
            <em className="italic text-terracotta-600">
              Not Just Where You Are
            </em>
          </motion.h2>
          <motion.p variants={itemFade} className="text-base font-light leading-relaxed text-olive-600 mb-8">
            Estuary scales with you &mdash; without switching platforms,
            re-learning tools, or paying more to unlock the next tier.
          </motion.p>

          <motion.div
            variants={stagger}
            className="flex flex-col sm:flex-row gap-4"
          >
            <motion.div
              variants={itemFade}
              className="flex-1 bg-sage-50/60 border border-sage-200/60 rounded-2xl p-7"
            >
              <span className="block text-[10px] font-medium tracking-widest uppercase text-sage-600 mb-3.5">
                Today
              </span>
              <h3 className="font-serif text-xl font-light leading-snug text-olive-900 mb-3">
                Running private sessions and local workshops.
              </h3>
              <p className="text-sm text-olive-500 font-light leading-relaxed">
                Estuary is your home from day one &mdash; simple, calm, and
                ready.
              </p>
            </motion.div>
            <motion.div
              variants={itemFade}
              className="flex-1 bg-terracotta-100/40 border border-terracotta-200/40 rounded-2xl p-7"
            >
              <span className="block text-[10px] font-medium tracking-widest uppercase text-terracotta-600 mb-3.5">
                Tomorrow
              </span>
              <h3 className="font-serif text-xl font-light leading-snug text-olive-900 mb-3">
                Leading sold-out events. Launching courses. Building community.
              </h3>
              <p className="text-sm text-olive-500 font-light leading-relaxed">
                Same platform. Richer capabilities. No migration, ever.
              </p>
            </motion.div>
          </motion.div>

          <motion.p
            variants={itemFade}
            className="text-sm text-olive-500 text-center mt-4"
          >
            One platform. One home. From first client to full practice.
          </motion.p>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            Real Stories
          </motion.span>
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] mb-8"
          >
            Real Practitioners.
            <br />
            <em className="italic text-terracotta-600">Real Relief.</em>
          </motion.h2>

          <motion.div
            variants={stagger}
            className="grid sm:grid-cols-2 gap-4"
          >
            {[
              {
                quote:
                  "\u201CI finally feel like my platform reflects the quality of my work. Everything is in one place and my clients notice the difference.\u201D",
                name: "Dr. Sarah Johnson",
                role: "Reiki Master + Coach",
              },
              {
                quote:
                  "\u201CThe fee structure alone saved me money in the first month. I didn\u2019t even need to think about it.\u201D",
                name: "Michael Rivera",
                role: "Breathwork Facilitator",
              },
              {
                quote:
                  "\u201CI was skeptical another platform would actually replace my stack. Estuary genuinely did.\u201D",
                name: "Jordan Lee",
                role: "Somatic Therapist",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="bg-white rounded-2xl border border-sage-200/60 p-6"
              >
                <blockquote className="font-serif text-lg italic font-light leading-relaxed text-olive-800 mb-4">
                  {t.quote}
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex-shrink-0" />
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
          </motion.div>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ─── MISSION ─── */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
          >
            Our Belief
          </motion.span>
          <motion.p
            variants={itemFade}
            className="font-serif text-2xl sm:text-3xl font-light leading-relaxed text-olive-800 mb-8"
          >
            Healing is{" "}
            <em className="italic text-terracotta-600">relational</em>. It&apos;s
            embodied. It unfolds slowly and deeply, and your tools should
            honor that.
          </motion.p>

          <motion.div variants={itemFade} className="rounded-2xl overflow-hidden shadow-lg mb-8">
            <img
              src="/benefit-3-community.png"
              alt="Practitioner leading a healing circle"
              className="w-full h-56 sm:h-72 object-cover"
            />
          </motion.div>

          <motion.p variants={itemFade} className="text-base font-light leading-relaxed text-olive-600">
            It&apos;s infrastructure that gets out of your way so you can do
            the work you came here to do.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="bg-gradient-to-br from-terracotta-100/60 via-sage-100/40 to-sage-200/60 py-16 md:py-24 px-4 sm:px-6 text-center">
        <motion.div
          className="max-w-xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={itemFade}
            className="font-serif text-4xl sm:text-5xl font-light leading-[1.15] mb-4"
          >
            Your Practice
            <br />
            <em className="italic text-terracotta-600">Has a Home Now</em>
          </motion.h2>
          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-olive-600 max-w-md mx-auto mb-9"
          >
            Join practitioners who&apos;ve stopped juggling &mdash; and started
            growing.
          </motion.p>
          <motion.div
            variants={itemFade}
            className="flex flex-col sm:flex-row gap-3 items-center justify-center"
          >
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-9 py-6 text-base font-medium shadow-lg"
            >
              Start Free &mdash; No Credit Card
            </Button>
            <a
              href="#"
              className="text-sm text-olive-500 hover:text-terracotta-600 border-b border-olive-300 hover:border-terracotta-600 pb-0.5 transition-colors"
            >
              Book a Demo
            </a>
          </motion.div>
          <motion.p
            variants={itemFade}
            className="text-xs text-olive-400 mt-5 tracking-wide"
          >
            Setup takes 15 minutes &middot; Cancel anytime
          </motion.p>
        </motion.div>
      </section>
    </div>
  )
}
