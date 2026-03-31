"use client"

import { useState } from "react"
import Link from "next/link"
import { SearchIcon, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery } from "@tanstack/react-query"
import { modalityCategoriesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { motion } from "framer-motion"

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const DISCOVERY_PATHS = [
  {
    emoji: "🧭",
    title: "Find a Practitioner",
    description: "Browse by modality, specialty, or availability",
    href: "/marketplace/practitioners",
    gradient: "hover:bg-gradient-to-br hover:from-[rgba(122,139,111,0.06)] hover:to-transparent",
  },
  {
    emoji: "✨",
    title: "Join a Workshop",
    description: "Live & recorded sessions starting this week",
    href: "/marketplace/workshops",
    gradient: "hover:bg-gradient-to-br hover:from-[rgba(196,149,106,0.06)] hover:to-transparent",
  },
  {
    emoji: "🌿",
    title: "Explore Modalities",
    description: "Discover 148 healing & growth practices",
    href: "/modalities",
    gradient: "hover:bg-gradient-to-br hover:from-[rgba(212,168,75,0.06)] hover:to-transparent",
  },
]

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")

  const { data: categoriesData } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
    staleTime: 1000 * 60 * 10,
  })

  const categories = categoriesData?.results || []

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/marketplace?q=${encodeURIComponent(searchQuery.trim())}`
    } else {
      window.location.href = "/marketplace"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <section className="relative overflow-hidden bg-[#f8f5f0]">
      {/* Background — gradient mesh + solid organic shapes */}
      <div className="absolute inset-0 z-0">
        {/* Radial gradient mesh for warmth */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(122, 139, 111, 0.12) 0%, transparent 70%)",
              "radial-gradient(ellipse 60% 50% at 80% 60%, rgba(196, 149, 106, 0.10) 0%, transparent 70%)",
              "radial-gradient(ellipse 50% 40% at 50% 80%, rgba(196, 149, 106, 0.06) 0%, transparent 70%)",
            ].join(", "),
          }}
        />

        {/* Solid organic shapes — low opacity, positioned off-screen edges */}
        <div
          className="absolute rounded-full opacity-[0.06] animate-[heroFloat1_20s_ease-in-out_infinite]"
          style={{ width: 600, height: 600, background: "#7A8B6F", top: -200, right: -150 }}
        />
        <div
          className="absolute rounded-full opacity-[0.06] animate-[heroFloat2_16s_ease-in-out_infinite]"
          style={{ width: 400, height: 400, background: "#C4956A", bottom: -100, left: -100 }}
        />
        <div
          className="absolute rounded-full opacity-[0.06] animate-[heroFloat3_14s_ease-in-out_infinite]"
          style={{ width: 200, height: 200, background: "#B8C4AE", top: "30%", left: "10%" }}
        />
      </div>

      {/* Content */}
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 md:pt-20 md:pb-16 relative z-10">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Social proof eyebrow */}
          <motion.div
            variants={itemFade}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium tracking-[1.5px] uppercase mb-6"
            style={{ background: "rgba(122, 139, 111, 0.1)", color: "#7A8B6F" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sage-600" />
            </span>
            420+ practitioners · 2,800+ sessions booked
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemFade}
            className="font-serif font-light leading-[1.1] tracking-tight text-[#4A3F35] mb-5"
            style={{ fontSize: "clamp(42px, 6vw, 72px)" }}
          >
            Find Your Path to
            <br />
            Wellness &amp;{" "}
            <em className="italic" style={{ color: "#C4956A" }}>Growth</em>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={itemFade}
            className="font-light leading-[1.65] text-[#6B6560] mb-11 max-w-[560px] mx-auto"
            style={{ fontSize: "17px" }}
          >
            Connect with vetted practitioners, join transformative workshops, and discover modalities that meet you where you are.
          </motion.p>

          {/* Discovery Path Cards */}
          <motion.div
            variants={itemFade}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-[720px] mx-auto mb-10"
          >
            {DISCOVERY_PATHS.map((path, i) => (
              <Link key={i} href={path.href} className="group">
                <div className={`relative text-left p-6 sm:p-7 bg-white/70 backdrop-blur-[12px] border border-[rgba(74,63,53,0.06)] rounded-2xl transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(74,63,53,0.08)] hover:border-transparent ${path.gradient}`}>
                  <ArrowRight className="absolute top-6 right-6 h-4 w-4 text-olive-300 group-hover:text-olive-600 group-hover:translate-x-0.5 transition-all" />
                  <div className="mb-3">
                    <span className="text-[28px]">{path.emoji}</span>
                  </div>
                  <h3 className="font-serif text-[20px] font-medium text-[#4A3F35] mb-1.5">
                    {path.title}
                  </h3>
                  <p className="text-[13px] text-[#9B9590] leading-[1.5]">
                    {path.description}
                  </p>
                </div>
              </Link>
            ))}
          </motion.div>

          {/* Search bar */}
          <motion.div
            variants={itemFade}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[rgba(74,63,53,0.06)] p-2 sm:p-3 shadow-sm mb-5 max-w-xl mx-auto"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center pl-1 sm:pl-2">
                <SearchIcon className="h-4 w-4 sm:h-5 sm:w-5 text-olive-400" strokeWidth="1.5" />
              </div>
              <Input
                className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm sm:text-base text-olive-800 placeholder:text-olive-400 bg-transparent"
                placeholder='Try "reiki near me" or "breathwork workshop"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                className="bg-olive-800 hover:bg-olive-700 text-white rounded-full px-6"
                size="sm"
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>
          </motion.div>

          {/* Are you a practitioner */}
          <motion.p variants={itemFade} className="mb-10">
            <Link
              href="/become-practitioner"
              className="text-sm text-olive-400 hover:text-terracotta-600 transition-colors"
            >
              Are you a practitioner?{" "}
              <span className="underline underline-offset-4 decoration-olive-300 hover:decoration-terracotta-400">
                Join Estuary
              </span>
            </Link>
          </motion.p>
        </motion.div>

        {/* Modality tags — single line, horizontal scroll */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-5 -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            <div
              className="flex gap-2 overflow-x-auto justify-start sm:justify-center pb-2 sm:pb-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {categories.map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/modalities/category/${cat.slug}`}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] text-[#6B6560] bg-white/50 border border-[rgba(74,63,53,0.08)] hover:bg-white hover:border-[rgba(74,63,53,0.15)] transition-all"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* CSS for floating shape animations */}
      <style jsx global>{`
        @keyframes heroFloat1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-30px, 20px) rotate(5deg); }
        }
        @keyframes heroFloat2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20px, -15px) rotate(-3deg); }
        }
        @keyframes heroFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 10px); }
        }
      `}</style>
    </section>
  )
}
