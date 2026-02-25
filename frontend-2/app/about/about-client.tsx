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

const VALUES = [
  {
    num: "01",
    title: "Healing work is sacred — not transactional.",
    description:
      "The work you do with clients deserves infrastructure that reflects its depth, not software designed for selling widgets.",
    bg: "bg-cream-50 border-sage-200/60",
  },
  {
    num: "02",
    title: "You should pay when you earn — not just to exist.",
    description:
      "Monthly subscriptions punish early-stage practitioners. We only make money when you do. That alignment matters to us.",
    bg: "bg-terracotta-50/60 border-terracotta-200/40",
  },
  {
    num: "03",
    title: "Complexity is a form of friction — and friction steals energy.",
    description:
      "Every app you juggle, every login you manage, every integration you pray holds together — that's energy you could be giving to your clients.",
    bg: "bg-sage-50/60 border-sage-200/50",
  },
  {
    num: "04",
    title: "Your practice should grow without switching platforms.",
    description:
      "From your first session to your thousandth student, Estuary should feel like home — not a stepping stone.",
    bg: "bg-cream-100/60 border-sage-200/60",
  },
]

const AUDIENCE = [
  "Somatic coaches & therapists",
  "Yoga & movement teachers",
  "Reiki & energy healers",
  "Breathwork facilitators",
  "Meditation & mindfulness guides",
  "Nutritionists & wellness coaches",
  "Astrologers & human design readers",
  "Therapists & counselors building private practices",
  "Sound healers & ceremony facilitators",
  "Any practitioner building something meaningful",
]

const PROMISES = [
  {
    icon: "\u{1F331}",
    title: "We grow with you",
    description:
      "Fees decrease automatically as your revenue increases. No calls, no negotiations.",
  },
  {
    icon: "\u{1F3E1}",
    title: "One home, always",
    description:
      "No feature tiers that lock you out. What you build here is yours to keep.",
  },
  {
    icon: "\u{1F91D}",
    title: "Real humans behind it",
    description:
      "Support from people who understand your work — not ticket queues and bots.",
  },
  {
    icon: "\u26A1",
    title: "Built in response to you",
    description:
      "Our roadmap is shaped by practitioners. If you need it, we want to know.",
  },
]

export default function AboutPage() {
  return (
    <div className="bg-cream-50">
      {/* ── Hero ── */}
      <section className="py-20 md:py-28">
        <motion.div
          className="container max-w-2xl px-6 text-center mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="inline-block text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full mb-6"
          >
            Our Story
          </motion.span>

          <motion.h1
            variants={itemFade}
            className="font-serif text-4xl sm:text-5xl md:text-[56px] font-light leading-[1.12] tracking-tight text-olive-900 mb-6"
          >
            We Built the Home
            <br />
            We Wished <em className="italic text-terracotta-600">You Had</em>
          </motion.h1>

          <motion.p
            variants={itemFade}
            className="text-lg font-light leading-relaxed text-olive-600"
          >
            Estuary exists because the most meaningful work in the world
            deserves better infrastructure than a patchwork of apps held together
            with hope.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Image band placeholder ── */}
      <div className="mx-4 sm:mx-8 h-64 sm:h-80 rounded-3xl bg-gradient-to-br from-sage-200/60 via-cream-100 to-terracotta-200/40 flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-olive-400 font-medium">
          Founder / Team Photograph
        </span>
      </div>

      {/* ── Origin story ── */}
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
              How We Got Here
            </motion.span>

            <motion.h2
              variants={itemFade}
              className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] text-olive-900 mb-10"
            >
              It Started With
              <br />a{" "}
              <em className="italic text-terracotta-600">
                Familiar Frustration
              </em>
            </motion.h2>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-8 sm:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {/* Main text */}
            <div className="flex-1 space-y-5">
              <motion.p
                variants={itemFade}
                className="text-base font-light leading-relaxed text-olive-600"
              >
                We kept meeting practitioners — coaches, healers, teachers,
                therapists — doing genuinely transformative work. People who had
                spent years developing their craft, building trust with clients,
                creating real change in the world.
              </motion.p>
              <motion.p
                variants={itemFade}
                className="text-base font-light leading-relaxed text-olive-600"
              >
                And every single one of them was spending hours each week inside
                software that was never built for them. Scheduling on one
                platform, streaming on another, hosting courses somewhere else.
                Paying monthly fees whether they had one client or one hundred.
                Fighting tools that made their work feel transactional.
              </motion.p>
              <motion.p
                variants={itemFade}
                className="text-base font-light leading-relaxed text-olive-600"
              >
                We asked ourselves a simple question: what would it look like if
                someone built infrastructure specifically for this kind of work?
                Not as an afterthought. Not as a niche feature set bolted onto a
                generic business platform.
              </motion.p>
              <motion.blockquote
                variants={itemFade}
                className="font-serif text-xl italic font-light leading-snug text-olive-800 pl-5 border-l-2 border-terracotta-400 my-8"
              >
                What if the platform understood the work — and was built to
                honor it?
              </motion.blockquote>
              <motion.p
                variants={itemFade}
                className="text-base font-light leading-relaxed text-olive-600"
              >
                Estuary is our answer to that question.
              </motion.p>
            </div>

            {/* Aside quote */}
            <motion.aside
              variants={itemFade}
              className="sm:max-w-[240px] flex-shrink-0 bg-cream-100/60 border border-sage-200/60 rounded-2xl p-6"
            >
              <p className="font-serif text-lg italic font-light leading-relaxed text-olive-800">
                &ldquo;We didn&rsquo;t want to build another tool. We wanted to
                build a home — somewhere practitioners could do their best work
                without the overhead stealing from it.&rdquo;
              </p>
              <span className="block mt-4 text-[10px] font-medium tracking-widest uppercase text-sage-600">
                — The Estuary Team
              </span>
            </motion.aside>
          </motion.div>
        </div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ── Values ── */}
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
              What We Believe
            </motion.span>

            <motion.h2
              variants={itemFade}
              className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] text-olive-900 mb-4"
            >
              The Values That
              <br />
              <em className="italic text-terracotta-600">Shape Everything</em>
            </motion.h2>

            <motion.p
              variants={itemFade}
              className="text-base font-light leading-relaxed text-olive-600 mb-10"
            >
              Every decision we make — from how we price to how we build — comes
              back to four core beliefs.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {VALUES.map((v) => (
              <motion.div
                key={v.num}
                variants={itemFade}
                className={`relative rounded-2xl border p-6 overflow-hidden ${v.bg}`}
              >
                <span className="absolute -top-2 right-4 font-serif text-[72px] font-light leading-none text-sage-200/50 pointer-events-none select-none">
                  {v.num}
                </span>
                <h3 className="font-serif text-lg font-normal text-olive-900 mb-2 relative z-10">
                  {v.title}
                </h3>
                <p className="text-[13px] font-light leading-relaxed text-olive-500 relative z-10">
                  {v.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="h-px bg-sage-200/60 mx-6" />

      {/* ── Who we serve ── */}
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
              Who We Serve
            </motion.span>

            <motion.h2
              variants={itemFade}
              className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] text-olive-900 mb-4"
            >
              Built for the Full
              <br />
              Spectrum of{" "}
              <em className="italic text-terracotta-600">Healing Work</em>
            </motion.h2>

            <motion.p
              variants={itemFade}
              className="text-base font-light leading-relaxed text-olive-600 mb-8"
            >
              Estuary was built for practitioners across every modality —
              wherever you&rsquo;re guiding transformation, we want to support
              it.
            </motion.p>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-sage-200/60 overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {AUDIENCE.map((item, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="flex items-center gap-4 px-5 py-4 bg-white border-b border-sage-200/60 last:border-b-0 hover:bg-cream-50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-terracotta-400 flex-shrink-0" />
                <span className="text-[15px] font-light text-olive-800">
                  {item}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Our promise (dark section) ── */}
      <section className="py-16 md:py-20 px-4 sm:px-8">
        <motion.div
          className="max-w-3xl mx-auto bg-olive-800 rounded-3xl px-7 py-14 sm:px-12 sm:py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.span
            variants={itemFade}
            className="block text-xs font-medium tracking-widest uppercase text-terracotta-300 mb-4"
          >
            Our Promise
          </motion.span>

          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[42px] font-light leading-[1.2] text-cream-50 mb-5"
          >
            We&rsquo;re In This
            <br />
            <em className="italic text-terracotta-400">With You</em>
          </motion.h2>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-cream-50/70 mb-4"
          >
            We&rsquo;re not a faceless SaaS company optimizing for growth at all
            costs. We&rsquo;re a small team that genuinely cares about the
            practitioners we serve — and we measure our success by yours.
          </motion.p>

          <motion.blockquote
            variants={itemFade}
            className="font-serif text-xl italic font-light leading-snug text-cream-100/90 pl-5 border-l-2 border-terracotta-400 my-8"
          >
            When your practice thrives, Estuary thrives. That&rsquo;s not a
            tagline. It&rsquo;s the business model.
          </motion.blockquote>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8"
            variants={stagger}
          >
            {PROMISES.map((p, i) => (
              <motion.div
                key={i}
                variants={itemFade}
                className="bg-white/[0.07] border border-white/[0.1] rounded-xl p-4 flex items-start gap-3.5"
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                <div>
                  <h4 className="text-sm font-medium text-cream-50 mb-1">
                    {p.title}
                  </h4>
                  <p className="text-[13px] font-light text-cream-50/60 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 md:py-24">
        <motion.div
          className="max-w-3xl mx-auto bg-gradient-to-br from-terracotta-100/60 via-cream-100 to-sage-200/60 rounded-3xl px-8 py-16 sm:px-14 sm:py-20 text-center mx-4 sm:mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[50px] font-light leading-[1.2] text-olive-900 mb-5"
          >
            Ready to Come{" "}
            <em className="italic text-terracotta-600">Home?</em>
          </motion.h2>

          <motion.p
            variants={itemFade}
            className="text-base font-light leading-relaxed text-olive-600 max-w-md mx-auto mb-8"
          >
            Join practitioners who&rsquo;ve stopped juggling — and started
            growing on a platform that was actually built for them.
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
              href="/become-practitioner"
              className="text-sm font-medium text-olive-600 hover:text-terracotta-600 transition-colors underline underline-offset-4 decoration-sage-300 hover:decoration-terracotta-400"
            >
              Book a Demo
            </Link>
          </motion.div>

          <motion.p
            variants={itemFade}
            className="text-xs text-olive-400 font-light mt-5 tracking-wide"
          >
            Setup takes 15 minutes · Cancel anytime
          </motion.p>
        </motion.div>
      </section>
    </div>
  )
}
