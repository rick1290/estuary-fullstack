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

const PILLARS = [
  {
    num: "1",
    title: "We only make money when you do",
    description:
      "No monthly subscriptions. No fees for existing. We apply a small percentage only when you earn — and that rate drops automatically as your practice grows. Our incentives are aligned with yours.",
  },
  {
    num: "2",
    title: "We reduce friction, not increase it",
    description:
      "Every tool we add to Estuary has to justify its place. If it doesn't make your practice simpler, cleaner, or more impactful — it doesn't ship. Complexity is a form of harm we take seriously.",
  },
  {
    num: "3",
    title: "We honor in-person work differently",
    description:
      "Embodied healing — the kind that happens in a room, with bodies, in community — is charged at a lower rate. Because we believe gathering in person is something worth encouraging, not taxing.",
  },
  {
    num: "4",
    title: "We build for the long arc of a practice",
    description:
      "From your first private session to a thriving community of thousands — Estuary is designed to be the last platform you ever need to migrate away from. Your home grows with you.",
  },
  {
    num: "5",
    title: "We listen to practitioners, not just metrics",
    description:
      "Our roadmap is shaped by the people using Estuary. Not by what optimizes a dashboard — but by what genuinely makes your practice better. If you have something to say, we're listening.",
  },
]

const MANIFESTO = [
  {
    heading:
      "We believe healing work is one of the most important professions in the world.",
    body: "Not because it's trending. Not because wellness is a growing market. But because the capacity to hold someone through transformation — to guide them back into their body, their breath, their sense of self — is rare, skilled, and necessary. It deserves to be treated that way.",
  },
  {
    heading:
      "We believe that access to good tools shouldn't depend on already being successful.",
    body: "The practitioner just starting out — the one with six clients and a dream — deserves the same quality of infrastructure as the one with six hundred. That's why Estuary has no monthly fee. You shouldn't have to pay to exist while you're still finding your footing.",
  },
  {
    heading:
      "We believe that seamless client experiences are part of the healing.",
    body: "When a client has to navigate three different apps to book a session, watch a replay, and send a message — that friction lives in their body too. A simple, beautiful, unified experience isn't just a nice-to-have. It extends the quality of your care into every touchpoint.",
  },
  {
    heading:
      "We believe community is the future of healing practice — and it needs infrastructure.",
    body: "The most transformative work often happens in groups. In circles. In communities built around shared intention. Estuary is built to hold that — from intimate gatherings of eight to membership communities of thousands. The form changes. The home stays the same.",
  },
  {
    heading:
      "We believe the world gets better when healers can focus on healing.",
    body: "Every hour a practitioner spends managing software is an hour not spent on a session, a program, a student, a client in need. Estuary's deepest purpose is to give that time back — so the people doing this work can do more of it.",
  },
]

const WORLD_NOW = [
  "Five apps to run one practice",
  "Monthly fees that penalize early growth",
  "Platforms built for generic businesses, not healing work",
  "Client experiences that feel fragmented and transactional",
  "Energy spent managing software instead of serving people",
]

const WORLD_FUTURE = [
  "One place where their entire practice lives",
  "Infrastructure that costs nothing until they earn",
  "Tools built specifically for the rhythms of healing work",
  "Client experiences that feel seamless and cared-for",
  "More energy for the sessions that change lives",
]

export default function MissionPage() {
  return (
    <div className="bg-cream-50">
      {/* ── Dark Hero ── */}
      <section className="relative bg-olive-800 overflow-hidden">
        <motion.div
          className="container max-w-2xl px-6 py-24 md:py-36 text-center mx-auto relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-300 bg-terracotta-500/20 border border-terracotta-500/30 px-4 py-1.5 rounded-full mb-8"
          >
            Our Mission
          </motion.span>

          <motion.h1
            variants={itemFade}
            className="font-serif text-4xl sm:text-5xl md:text-[62px] font-normal leading-[1.1] tracking-tight text-cream-50 mb-7"
          >
            To Make Space
            <br />
            for the Work
            <br />
            That <em className="italic text-terracotta-300">Heals the World</em>
          </motion.h1>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-cream-50/65 max-w-lg mx-auto"
          >
            We believe the practitioners doing the deepest, most necessary work
            deserve infrastructure that holds them — not drains them. Estuary
            exists to make that possible.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Mission Statement (large serif prose) ── */}
      <section className="py-20 md:py-24">
        <motion.div
          className="container max-w-2xl px-6 text-center mx-auto space-y-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.p
            variants={itemFade}
            className="font-serif text-2xl sm:text-3xl font-normal leading-relaxed text-olive-800"
          >
            Somewhere in your city, a somatic coach is helping someone live in
            their body for the first time in years.
          </motion.p>
          <motion.p
            variants={itemFade}
            className="font-serif text-2xl sm:text-3xl font-normal leading-relaxed text-olive-800"
          >
            A breathwork facilitator is guiding someone through grief
            they&rsquo;ve carried for a decade.
          </motion.p>
          <motion.p
            variants={itemFade}
            className="font-serif text-2xl sm:text-3xl font-normal leading-relaxed text-olive-800"
          >
            A meditation teacher is showing a burned-out parent how to find five
            minutes of{" "}
            <em className="italic text-terracotta-600">stillness</em>.
          </motion.p>
          <motion.p
            variants={itemFade}
            className="font-serif text-2xl sm:text-3xl font-normal leading-relaxed text-olive-800"
          >
            This work is <span className="font-normal">not peripheral</span>.
            It is essential. And the people doing it deserve to be supported —
            not buried under the weight of tools that were never built for them.
          </motion.p>
        </motion.div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ── The Problem We're Solving (contrast cards) ── */}
      <section className="py-16 md:py-20 bg-cream-100/40">
        <div className="container max-w-3xl px-6 mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.span
              variants={itemFade}
              className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
            >
              The Problem We&rsquo;re Solving
            </motion.span>
            <motion.h2
              variants={itemFade}
              className="font-serif text-3xl sm:text-4xl md:text-[42px] font-normal leading-[1.2] text-olive-900 mb-10"
            >
              Two Worlds —
              <br />
              <em className="italic text-terracotta-600">
                We&rsquo;re Building the Second
              </em>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* World as it is */}
            <motion.div
              variants={itemFade}
              className="bg-white rounded-2xl border border-sage-200/60 p-7"
            >
              <span className="block text-[10px] font-medium tracking-widest uppercase text-olive-500 mb-5">
                The world as it is
              </span>
              <h3 className="font-serif text-lg font-normal leading-snug text-olive-900 mb-4">
                Practitioners are underserved by the tools they&rsquo;re given
              </h3>
              <ul className="space-y-2.5">
                {WORLD_NOW.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[13px] font-light leading-relaxed text-olive-500"
                  >
                    <span className="text-sage-300 flex-shrink-0 mt-0.5">
                      &mdash;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* World we're building */}
            <motion.div
              variants={itemFade}
              className="bg-olive-800 rounded-2xl p-7"
            >
              <span className="block text-[10px] font-medium tracking-widest uppercase text-terracotta-300 mb-5">
                The world we&rsquo;re building
              </span>
              <h3 className="font-serif text-lg font-normal leading-snug text-cream-50 mb-4">
                Practitioners have a home that honors the work
              </h3>
              <ul className="space-y-2.5">
                {WORLD_FUTURE.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[13px] font-light leading-relaxed text-cream-50/70"
                  >
                    <span className="text-terracotta-400/60 flex-shrink-0 mt-0.5">
                      &mdash;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ── How We Do It (pillars) ── */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl px-6 mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.span
              variants={itemFade}
              className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4"
            >
              How We Do It
            </motion.span>
            <motion.h2
              variants={itemFade}
              className="font-serif text-3xl sm:text-4xl md:text-[42px] font-normal leading-[1.2] text-olive-900 mb-4"
            >
              Mission Isn&rsquo;t a Poster —
              <br />
              <em className="italic text-terracotta-600">
                It&rsquo;s a Product Decision
              </em>
            </motion.h2>
            <motion.p
              variants={itemFade}
              className="text-base font-light leading-relaxed text-olive-600 mb-10"
            >
              Every feature we build, every pricing choice we make, every
              support interaction we have is a reflection of what we actually
              believe. Here&rsquo;s where that shows up.
            </motion.p>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-sage-200/60 overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {PILLARS.map((pillar) => (
              <motion.div
                key={pillar.num}
                variants={itemFade}
                className="flex gap-5 items-start px-6 py-6 bg-white border-b border-sage-200/60 last:border-b-0 hover:bg-cream-50 transition-colors"
              >
                <span className="font-serif text-3xl font-normal text-sage-200 leading-none flex-shrink-0 w-8 mt-0.5">
                  {pillar.num}
                </span>
                <div>
                  <h3 className="text-[15px] font-medium text-olive-900 mb-1.5">
                    {pillar.title}
                  </h3>
                  <p className="text-[13px] font-light leading-relaxed text-olive-500">
                    {pillar.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ── Manifesto ── */}
      <section className="py-16 md:py-20">
        <div className="container max-w-xl px-6 mx-auto">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-12 text-center"
          >
            What We Stand For
          </motion.span>

          <motion.div
            className="space-y-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {MANIFESTO.map((block, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="pb-10 mb-10 border-b border-sage-200/60 last:border-b-0 last:mb-0 last:pb-0"
              >
                <h3 className="font-serif text-xl sm:text-2xl italic font-normal leading-snug text-terracotta-600 mb-4">
                  {block.heading}
                </h3>
                <p className="text-[15px] font-light leading-[1.85] text-olive-500">
                  {block.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Impact Numbers (terracotta band) ── */}
      <section className="py-16 md:py-20 px-4 sm:px-8">
        <motion.div
          className="max-w-3xl mx-auto bg-terracotta-600 rounded-3xl px-7 py-14 sm:px-12 sm:py-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-cream-50/55 mb-8"
          >
            The Ripple Effect
          </motion.span>

          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl font-normal leading-[1.2] text-cream-50 mb-4"
          >
            Every Practice
            <br />
            Touches Many Lives
          </motion.h2>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-cream-50/70 max-w-md mx-auto mb-12"
          >
            When a practitioner has the infrastructure they need, the impact
            compounds. Their clients heal. Their students grow. Their community
            expands.
          </motion.p>

          <motion.div
            variants={itemFade}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0"
          >
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="font-serif text-5xl font-normal text-cream-50 leading-none">
                1
              </span>
              <span className="text-xs font-light tracking-wide uppercase text-cream-50/55 max-w-[140px]">
                Platform — for your whole practice
              </span>
            </div>
            <div className="hidden sm:block w-px h-10 bg-cream-50/20" />
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="font-serif text-5xl font-normal text-cream-50 leading-none">
                0
              </span>
              <span className="text-xs font-light tracking-wide uppercase text-cream-50/55 max-w-[140px]">
                Monthly fees — ever
              </span>
            </div>
            <div className="hidden sm:block w-px h-10 bg-cream-50/20" />
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="font-serif text-5xl font-normal text-cream-50 leading-none">
                &infin;
              </span>
              <span className="text-xs font-light tracking-wide uppercase text-cream-50/55 max-w-[140px]">
                Room to grow, without switching
              </span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 md:py-24">
        <motion.div
          className="max-w-3xl mx-auto bg-gradient-to-br from-terracotta-100/60 via-cream-100 to-sage-200/60 rounded-3xl px-8 py-16 sm:px-14 sm:py-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[50px] font-normal leading-[1.2] text-olive-900 mb-5"
          >
            Be Part of
            <br />
            <em className="italic text-terracotta-600">
              What We&rsquo;re Building
            </em>
          </motion.h2>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-olive-600 max-w-md mx-auto mb-8"
          >
            When you join Estuary, you&rsquo;re not just finding a better
            platform. You&rsquo;re part of a community of practitioners
            committed to doing their work well — and being supported in it.
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
              <Link href="/become-practitioner">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
              </Link>
            </Button>
            <Link
              href="/contact"
              className="text-sm font-medium text-olive-600 hover:text-terracotta-600 transition-colors underline underline-offset-4 decoration-sage-300 hover:decoration-terracotta-400"
            >
              Book a Demo
            </Link>
          </motion.div>

          <motion.p
            variants={itemFade}
            className="text-xs text-olive-500 font-light mt-5 tracking-wide"
          >
            Setup takes 15 minutes &middot; Cancel anytime
          </motion.p>
        </motion.div>
      </section>
    </div>
  )
}
