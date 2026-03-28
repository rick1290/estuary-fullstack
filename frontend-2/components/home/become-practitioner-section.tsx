"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
    <section className="relative bg-[#3d2e1e] py-20 sm:py-24 overflow-hidden">
      {/* Subtle radial gradient orbs like the artifact */}
      <div
        className="absolute -top-[100px] -right-[100px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,154,126,0.12) 0%, transparent 65%)' }}
      />
      <div
        className="absolute -bottom-[80px] left-[25%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(196,133,106,0.10) 0%, transparent 65%)' }}
      />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div
            variants={itemFade}
            className="inline-flex items-center gap-2.5 mb-6"
          >
            <div className="w-5 h-px bg-[#7c9a7e]" />
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#7c9a7e]">
              For Practitioners
            </span>
          </motion.div>

          <motion.h2
            variants={itemFade}
            className="font-serif text-3xl sm:text-4xl md:text-[44px] font-light leading-[1.1] text-[#f8f5f0] mb-5"
          >
            Your Practice<br className="hidden sm:block" />
            Finally Has a{" "}
            <em className="italic text-[#d4a08c]">Home.</em>
          </motion.h2>

          <motion.p
            variants={itemFade}
            className="text-base sm:text-[15.5px] font-light leading-relaxed text-[#f8f5f0]/65 mb-10 max-w-lg mx-auto"
          >
            Sessions, workshops, courses, and payments — all in one place.
            No monthly fees. Built for the way you actually work.
          </motion.p>

          <motion.div
            variants={itemFade}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/become-practitioner"
              className="inline-flex items-center gap-2 bg-[#4a5e4a] text-white text-[14.5px] font-medium px-7 py-3.5 rounded-full hover:bg-[#6b7f6b] transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" strokeWidth="1.5" />
            </Link>
            <Link
              href="/about"
              className="text-[14px] text-[#f8f5f0]/50 border-b border-[#f8f5f0]/20 pb-0.5 hover:text-[#f8f5f0]/80 hover:border-[#f8f5f0]/40 transition-colors"
            >
              Learn more about Estuary
            </Link>
          </motion.div>

          {/* Social proof stats */}
          <motion.div
            variants={itemFade}
            className="mt-14 pt-10 border-t border-[#f8f5f0]/10 flex items-center justify-center gap-8 sm:gap-12 flex-wrap"
          >
            <div className="text-center">
              <div className="font-serif text-[28px] font-light text-[#f8f5f0] leading-none mb-1">0%</div>
              <div className="text-[11px] text-[#f8f5f0]/40 tracking-wide">Monthly Fees</div>
            </div>
            <div className="w-px h-10 bg-[#f8f5f0]/10" />
            <div className="text-center">
              <div className="font-serif text-[28px] font-light text-[#f8f5f0] leading-none mb-1">Built-in</div>
              <div className="text-[11px] text-[#f8f5f0]/40 tracking-wide">Video Sessions</div>
            </div>
            <div className="w-px h-10 bg-[#f8f5f0]/10" />
            <div className="text-center">
              <div className="font-serif text-[28px] font-light text-[#f8f5f0] leading-none mb-1">5%</div>
              <div className="text-[11px] text-[#f8f5f0]/40 tracking-wide">Commission Only</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
