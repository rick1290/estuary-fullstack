"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import {
  ArrowRight,
  Check,
  X,
  ChevronDown,
  Star,
} from "lucide-react"

interface PractitionerLandingClientProps {
  modality: any
}

export default function PractitionerLandingClient({ modality }: PractitionerLandingClientProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const modalityName = modality.name || "Wellness"
  const modalityDescription = modality.description || modality.short_description || ""

  const handleCTA = () => {
    if (modality.slug) {
      sessionStorage.setItem("onboarding_modality", modality.slug)
    }

    if (isAuthenticated) {
      router.push("/become-practitioner/onboarding")
    } else {
      openAuthModal({
        defaultTab: "signup",
        redirectUrl: "/become-practitioner/onboarding",
        serviceType: "practitioner-application",
        title: `Start Your ${modalityName} Practice`,
        description: "Create your free account — takes 30 seconds",
      })
    }
  }

  const relatedModalities = [
    { name: "Breathwork", slug: "breathwork-facilitators" },
    { name: "Sound Healing", slug: "sound-healing-practitioners" },
    { name: "Crystal Healing", slug: "crystal-healing-practitioners" },
    { name: "Somatic Coaching", slug: "somatic-coaches" },
    { name: "Meditation", slug: "meditation-teachers" },
    { name: "Yoga", slug: "yoga-teachers" },
    { name: "Shamanic Healing", slug: "shamanic-practitioners" },
    { name: "Human Design", slug: "human-design-practitioners" },
    { name: "Chakra Balancing", slug: "chakra-balancing-practitioners" },
    { name: "Pranic Healing", slug: "pranic-healing-practitioners" },
    { name: "Healing Touch", slug: "healing-touch-practitioners" },
  ].filter((m) => m.slug !== modality.slug)

  const faqItems = [
    {
      q: "Is Estuary really free to start?",
      a: `Yes — there is no monthly subscription, ever. You pay a small percentage only when a client pays you. There's no credit card required to sign up, and no commitment. Setup takes about 15 minutes.`,
    },
    {
      q: `Do I need Zoom if I use Estuary?`,
      a: `No. Estuary has HD video built in. Your clients join directly from their booking confirmation — no separate app, no link-hunting, no dropped sessions. Your ${modalityName.toLowerCase()} sessions run entirely inside your Estuary practice.`,
    },
    {
      q: `Can I run a full ${modalityName} certification program on Estuary?`,
      a: `Yes. Estuary supports multi-module courses with video, documents, and resources — all delivered natively. You can create tiered programs, drip content schedules, and track student progress.`,
    },
    {
      q: "What if I do both distance and in-person sessions?",
      a: `Estuary is built for hybrid practices. You can offer both in-person and online sessions from the same profile, with separate booking flows and pricing. In-person work is always charged at the lower 5% fee rate.`,
    },
    {
      q: "Can I offer group sessions, not just 1:1?",
      a: `Yes. Estuary supports group events of any size — from intimate circles of 6 to open community workshops. You can set capacity limits, manage registration, and take payment all in one place.`,
    },
    {
      q: `Is Estuary built specifically for ${modalityName.toLowerCase()} practitioners?`,
      a: `Yes — unlike Kajabi, Acuity, or generic booking tools, Estuary is built specifically for the healing practitioner community. The language, structure, and features are designed around how you actually work.`,
    },
  ]

  const comparisonRows = [
    { feature: "Monthly subscription required", estuary: "No", acuity: "Yes", heallist: "Optional", kajabi: "Yes", estuaryWin: true },
    { feature: "Online booking & scheduling", estuary: true, acuity: true, heallist: true, kajabi: "Add-on" },
    { feature: "Built-in video (no Zoom)", estuary: true, acuity: false, heallist: "Limited", kajabi: false },
    { feature: "Session recording", estuary: true, acuity: false, heallist: false, kajabi: false },
    { feature: "Workshop & group event hosting", estuary: true, acuity: "Limited", heallist: "Limited", kajabi: "Add-on" },
    { feature: "Online course hosting", estuary: true, acuity: false, heallist: false, kajabi: true },
    { feature: "Content publishing & community", estuary: true, acuity: false, heallist: false, kajabi: true },
    { feature: "Hybrid (online + in-person)", estuary: true, acuity: true, heallist: "Limited", kajabi: "Limited" },
    { feature: "Fees decrease as you grow", estuary: true, acuity: false, heallist: false, kajabi: false },
    { feature: "Built specifically for healing practitioners", estuary: true, acuity: false, heallist: "Partially", kajabi: false },
  ]

  const renderCheck = (val: boolean | string, highlight = false) => {
    if (val === true) return <span className={`text-[#4a5e4a] text-base ${highlight ? "font-medium" : ""}`}><Check className="h-4 w-4 inline" /></span>
    if (val === false) return <span className="text-[#ccc4b8]"><X className="h-4 w-4 inline" /></span>
    if (typeof val === "string" && val.startsWith("No")) return <span className="text-[#4a5e4a] font-medium text-sm">No <Check className="h-3.5 w-3.5 inline" /></span>
    if (typeof val === "string") return <span className="text-[#c4856a] text-xs">{val}</span>
    return null
  }

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0", color: "#2a2218" }}>

      {/* ===== NAV ===== */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between h-[62px] px-6 md:px-12 border-b"
        style={{ background: "rgba(248,245,240,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "#e0d8ce" }}
      >
        <Link href="/" className="font-serif font-medium text-xl tracking-[0.14em] uppercase" style={{ color: "#3d2e1e" }}>
          Estuary<span style={{ color: "#7c9a7e" }}>.</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-[13.5px]" style={{ color: "#6b6258" }}>
            Sign in
          </Link>
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors"
            style={{ background: "#3d2e1e", color: "#f8f5f0" }}
          >
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" style={{ background: "#3d2e1e" }}>
        {/* decorative gradients */}
        <div className="absolute -top-[120px] -right-[120px] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,154,126,0.13) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-[100px] left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(196,133,106,0.09) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-20 lg:py-[88px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-16 items-center">
            {/* Left column */}
            <div>
              <div className="inline-flex items-center gap-2.5 text-[11px] font-medium tracking-[0.14em] uppercase mb-6" style={{ color: "#7c9a7e" }}>
                <div className="w-7 h-px" style={{ background: "#7c9a7e" }} />
                For {modalityName} Practitioners
              </div>

              <h1 className="font-serif text-[34px] sm:text-[42px] lg:text-[60px] font-light leading-[1.06] mb-5 tracking-[-0.01em]" style={{ color: "#f8f5f0" }}>
                Your Practice<br />
                Finally Has<br />
                a <em className="italic" style={{ color: "#d4a08c" }}>Home.</em>
              </h1>

              <p className="text-base leading-[1.75] max-w-[480px] mb-10" style={{ color: "rgba(248,245,240,0.65)" }}>
                Sessions, workshops, courses, and payments — all in one place. No monthly fees. No Zoom. No juggling five apps before your first {modalityName.toLowerCase()} session. Built for the way you actually work.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                <button
                  onClick={handleCTA}
                  className="inline-flex items-center gap-2 text-[14.5px] font-medium px-7 py-3.5 rounded-full transition-all hover:-translate-y-px"
                  style={{ background: "#4a5e4a", color: "white" }}
                >
                  Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-1.5 text-sm pb-0.5 transition-colors"
                  style={{ color: "rgba(248,245,240,0.5)", borderBottom: "1px solid rgba(248,245,240,0.2)" }}
                >
                  See how it works <span className="text-xs">&#8595;</span>
                </button>
              </div>

              {/* Trust proof stats */}
              <div className="flex items-center gap-6 sm:gap-8 flex-wrap mt-14 pt-10" style={{ borderTop: "1px solid rgba(248,245,240,0.1)" }}>
                {[
                  { num: "$0", label: "Monthly fee — ever" },
                  { num: "15 min", label: "Setup time" },
                  { num: "1", label: "Platform for everything" },
                  { num: "\u2193", label: "Fees as you grow" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-6 sm:gap-8">
                    {i > 0 && <div className="w-px h-10" style={{ background: "rgba(248,245,240,0.1)" }} />}
                    <div>
                      <div className="font-serif text-[32px] font-light leading-none mb-1" style={{ color: "#f8f5f0" }}>{s.num}</div>
                      <div className="text-[11px] tracking-[0.05em]" style={{ color: "rgba(248,245,240,0.4)" }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — comparison card (hidden on mobile) */}
            <div className="hidden lg:block rounded-[18px] p-7" style={{ background: "rgba(248,245,240,0.06)", border: "1px solid rgba(248,245,240,0.1)", backdropFilter: "blur(12px)" }}>
              <div className="font-serif text-[17px] italic mb-5" style={{ color: "rgba(248,245,240,0.8)" }}>
                What you&apos;re paying now vs. Estuary
              </div>
              <div className="space-y-0">
                {[
                  { key: "Acuity Scheduling", val: "$20/mo" },
                  { key: "Zoom Pro", val: "$15/mo" },
                  { key: "Kajabi", val: "$149/mo" },
                  { key: "Stripe fees", val: "2.9%" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 text-[13px]" style={{ borderBottom: "1px solid rgba(248,245,240,0.07)" }}>
                    <span style={{ color: "rgba(248,245,240,0.45)" }}>{row.key}</span>
                    <span className="font-medium" style={{ color: "rgba(248,245,240,0.9)" }}>{row.val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3.5 mt-1" style={{ borderTop: "1px solid rgba(248,245,240,0.1)" }}>
                  <span className="font-serif text-[17px] italic" style={{ color: "rgba(248,245,240,0.8)" }}>Estuary</span>
                  <span className="font-serif text-[20px] font-medium" style={{ color: "#7c9a7e" }}>$0/mo</span>
                </div>
              </div>
              <div className="mt-5">
                <button
                  onClick={handleCTA}
                  className="w-full inline-flex items-center justify-center gap-2 text-[13.5px] font-medium py-3 rounded-full transition-colors"
                  style={{ background: "#4a5e4a", color: "white" }}
                >
                  Start Free — No Card Needed <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-center text-[11px] mt-2.5" style={{ color: "rgba(248,245,240,0.3)" }}>
                Setup takes 15 minutes &middot; Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF STRIP ===== */}
      <div className="px-6 md:px-12 py-5 overflow-hidden" style={{ background: "#5c4435" }}>
        <div className="max-w-[1080px] mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase mr-2 whitespace-nowrap" style={{ color: "rgba(248,245,240,0.35)" }}>
            Practitioners say
          </span>
          <span className="font-serif text-[15px] italic" style={{ color: "rgba(248,245,240,0.65)" }}>
            &ldquo;I canceled four subscriptions the week I joined.&rdquo;
          </span>
          <span className="text-[11.5px] whitespace-nowrap" style={{ color: "rgba(248,245,240,0.35)" }}>
            — Mara T., Somatic Coach
          </span>
          <div className="w-px h-5 flex-shrink-0 hidden sm:block" style={{ background: "rgba(248,245,240,0.1)" }} />
          <span className="font-serif text-[15px] italic hidden sm:inline" style={{ color: "rgba(248,245,240,0.65)" }}>
            &ldquo;It feels like it was built specifically for the way I work.&rdquo;
          </span>
          <span className="text-[11.5px] whitespace-nowrap hidden sm:inline" style={{ color: "rgba(248,245,240,0.35)" }}>
            — Priya K., Energy Healer
          </span>
        </div>
      </div>

      {/* ===== PROBLEM SECTION ===== */}
      <section style={{ background: "#f0ede8", borderTop: "1px solid #e0d8ce", borderBottom: "1px solid #e0d8ce" }}>
        <div className="max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-5 h-px" style={{ background: "#7c9a7e" }} />
            <span className="text-[11px] font-medium tracking-[0.13em] uppercase" style={{ color: "#7c9a7e" }}>The problem</span>
          </div>
          <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1] mb-4" style={{ color: "#2a2218" }}>
            You Became a Healer<br />to <em className="italic" style={{ color: "#c4856a" }}>Heal People</em>
          </h2>
          <p className="text-[15.5px] leading-[1.75] max-w-[540px] mb-14" style={{ color: "#6b6258" }}>
            Not to manage software. But somewhere along the way you also became a part-time IT person — and every hour spent managing tools is an hour not spent with clients.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-12 items-start">
            {/* Problem items */}
            <div className="flex flex-col gap-4">
              {[
                { icon: "\uD83D\uDCC5", title: "Scheduling on one platform", desc: "Acuity, Calendly, or a Google Form cobbled together — all requiring clients to leave your world before they've even met you." },
                { icon: "\uD83D\uDCF9", title: "Sessions on another", desc: "A Zoom link you send manually, hope the client finds, and pray doesn't drop mid-session." },
                { icon: "\uD83C\uDF93", title: "Courses somewhere else entirely", desc: "Kajabi, Teachable, or a Google Drive folder — a different login, a different experience, a different you." },
                { icon: "\uD83D\uDCB3", title: "Payments on a fourth app", desc: "Venmo requests, manual Stripe invoices, or PayPal links that feel anything but professional." },
                { icon: "\uD83D\uDCB8", title: "Paying monthly whether you earn or not", desc: "$150\u2013200/month in subscriptions before you book a single session. Most platforms charge you to exist." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 p-[18px_20px] rounded-xl border transition-colors hover:border-[#c4856a]"
                  style={{ background: "white", borderColor: "#e0d8ce" }}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium mb-0.5" style={{ color: "#2a2218" }}>{item.title}</div>
                    <div className="text-[13px] leading-[1.55]" style={{ color: "#6b6258" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial callout */}
            <div className="relative rounded-[18px] p-8 md:sticky md:top-20 overflow-hidden" style={{ background: "#3d2e1e" }}>
              <div className="absolute -top-[60px] -right-[60px] w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,154,126,0.12) 0%, transparent 70%)" }} />
              <div className="relative z-10">
                <div className="text-[10px] font-medium tracking-[0.13em] uppercase mb-3.5" style={{ color: "#7c9a7e" }}>
                  What practitioners tell us
                </div>
                <div className="font-serif text-[22px] font-light italic leading-[1.5] mb-5" style={{ color: "#f8f5f0" }}>
                  &ldquo;I finally feel like my platform reflects the quality of my work. Everything is in one place and my clients notice the difference.&rdquo;
                </div>
                <div className="text-xs mb-8" style={{ color: "rgba(248,245,240,0.4)" }}>
                  Dr. Sarah Johnson — {modalityName} Practitioner + Coach
                </div>
                <button
                  onClick={handleCTA}
                  className="inline-flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors"
                  style={{ background: "#4a5e4a", color: "white" }}
                >
                  See how Estuary fixes this <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES / SOLUTION SECTION ===== */}
      <section id="how-it-works" className="max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-5 h-px" style={{ background: "#7c9a7e" }} />
          <span className="text-[11px] font-medium tracking-[0.13em] uppercase" style={{ color: "#7c9a7e" }}>The solution</span>
        </div>
        <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1] mb-4" style={{ color: "#2a2218" }}>
          One Home for<br /><em className="italic" style={{ color: "#c4856a" }}>Everything You Do</em>
        </h2>
        <p className="text-[15.5px] leading-[1.75] max-w-[540px] mb-14" style={{ color: "#6b6258" }}>
          No integrations. No brittle links. One login — for you and a seamless experience for every client who books with you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: "\uD83D\uDCF9", title: "Built-in HD video — no Zoom", desc: `Run distance ${modalityName.toLowerCase()}, energy healing, and mentorship sessions entirely inside Estuary. Clients never leave your platform.`, tag: "Replaces Zoom" },
            { icon: "\uD83D\uDCC5", title: "Scheduling, built in", desc: `Book 1:1 ${modalityName.toLowerCase()} sessions and group events in one place. Automated reminders and intake forms handled without lifting a finger.`, tag: "Replaces Acuity" },
            { icon: "\uD83C\uDF93", title: "Courses & programs, natively hosted", desc: `Teach a ${modalityName} certification, run a multi-week program, or offer self-paced courses — delivered, sold, and managed all in one place.`, tag: "Replaces Kajabi" },
            { icon: "\uD83C\uDF00", title: "Workshops & group sessions", desc: `From intimate groups of 8 to open community events — Estuary holds whatever form your ${modalityName.toLowerCase()} group work takes, with built-in registration and payment.`, tag: "Built in" },
            { icon: "\uD83D\uDCB3", title: "Payments, fully automated", desc: "Sessions, packages, subscriptions, and courses — all paid and tracked in one dashboard. No third-party payment accounts. No manual invoicing.", tag: "Replaces Stripe dashboard" },
            { icon: "\u2709\uFE0F", title: "Client messaging & automations", desc: "Session reminders, post-session follow-ups, and client communications — handled automatically so you can focus on the work, not the admin.", tag: "Built in" },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-[18px] p-7 border transition-all hover:border-[#7c9a7e] hover:-translate-y-0.5"
              style={{ background: "white", borderColor: "#e0d8ce", boxShadow: "0 1px 4px rgba(61,46,30,0.06), 0 2px 8px rgba(61,46,30,0.04)" }}
            >
              <span className="text-[26px] block mb-4">{card.icon}</span>
              <div className="text-[15px] font-medium mb-2" style={{ color: "#2a2218" }}>{card.title}</div>
              <div className="text-[13.5px] leading-[1.65] mb-3.5" style={{ color: "#6b6258" }}>{card.desc}</div>
              <span
                className="inline-flex text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                style={{ color: "#4a5e4a", background: "#e8ede8", border: "1px solid rgba(74,94,74,0.15)" }}
              >
                {card.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      <section style={{ background: "#f0ede8", borderTop: "1px solid #e0d8ce", borderBottom: "1px solid #e0d8ce" }}>
        <div className="max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-5 h-px" style={{ background: "#7c9a7e" }} />
            <span className="text-[11px] font-medium tracking-[0.13em] uppercase" style={{ color: "#7c9a7e" }}>How Estuary compares</span>
          </div>
          <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1] mb-4" style={{ color: "#2a2218" }}>
            Built Different —<br /><em className="italic" style={{ color: "#c4856a" }}>On Purpose</em>
          </h2>
          <p className="text-[15.5px] leading-[1.75] max-w-[540px] mb-9" style={{ color: "#6b6258" }}>
            Most platforms make you choose between booking, content, courses, or community. Estuary brings it all together — with no monthly subscription.
          </p>

          <div className="overflow-x-auto rounded-[18px] border" style={{ background: "white", borderColor: "#e0d8ce", boxShadow: "0 1px 4px rgba(61,46,30,0.06)" }}>
            <table className="w-full text-[13.5px] min-w-[640px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="text-left px-5 py-4 text-xs font-medium" style={{ color: "#9b9088", background: "#f0ede8", borderBottom: "1px solid #e0d8ce" }}>Feature</th>
                  <th className="text-left px-5 py-4 text-xs font-medium" style={{ color: "#4a5e4a", background: "#e8ede8", borderBottom: "1px solid #e0d8ce" }}>Estuary</th>
                  <th className="text-left px-5 py-4 text-xs font-medium" style={{ color: "#9b9088", background: "#f0ede8", borderBottom: "1px solid #e0d8ce" }}>Acuity</th>
                  <th className="text-left px-5 py-4 text-xs font-medium" style={{ color: "#9b9088", background: "#f0ede8", borderBottom: "1px solid #e0d8ce" }}>Heallist</th>
                  <th className="text-left px-5 py-4 text-xs font-medium" style={{ color: "#9b9088", background: "#f0ede8", borderBottom: "1px solid #e0d8ce" }}>Kajabi</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="group hover:bg-[#f8f5f0]">
                    <td className="px-5 py-3.5 font-normal" style={{ color: "#2a2218", borderBottom: i < comparisonRows.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                      {row.feature}
                    </td>
                    <td className="px-5 py-3.5 font-medium group-hover:bg-[rgba(232,237,232,0.5)]" style={{ background: "rgba(232,237,232,0.3)", color: "#2a2218", borderBottom: i < comparisonRows.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                      {renderCheck(row.estuary, true)}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "#6b6258", borderBottom: i < comparisonRows.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                      {renderCheck(row.acuity)}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "#6b6258", borderBottom: i < comparisonRows.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                      {renderCheck(row.heallist)}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "#6b6258", borderBottom: i < comparisonRows.length - 1 ? "1px solid #e0d8ce" : "none" }}>
                      {renderCheck(row.kajabi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-5 h-px" style={{ background: "#7c9a7e" }} />
          <span className="text-[11px] font-medium tracking-[0.13em] uppercase" style={{ color: "#7c9a7e" }}>Real practitioners</span>
        </div>
        <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1]" style={{ color: "#2a2218" }}>
          What Healers<br /><em className="italic" style={{ color: "#c4856a" }}>Actually Say</em>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {[
            { quote: "I finally feel like my platform reflects the quality of my work. Everything is in one place and my clients notice the difference.", name: "Dr. Sarah Johnson", role: `${modalityName} Practitioner + Coach`, initial: "S" },
            { quote: "The fee structure alone saved me money in the first month. I didn't even need to think about it — it just made sense.", name: "Michael Rivera", role: "Breathwork Facilitator", initial: "M" },
            { quote: "I was skeptical another platform would actually replace my whole stack. Estuary genuinely did. I canceled four subscriptions the week I joined.", name: "Jordan Lee", role: "Somatic Therapist", initial: "J" },
          ].map((t, i) => (
            <div
              key={i}
              className="rounded-[18px] p-7 border flex flex-col"
              style={{ background: "white", borderColor: "#e0d8ce", boxShadow: "0 1px 4px rgba(61,46,30,0.06)" }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-[#c4856a]" style={{ color: "#c4856a" }} />
                ))}
              </div>
              <div className="font-serif text-lg font-light italic leading-[1.5] flex-1 mb-5" style={{ color: "#2a2218" }}>
                &ldquo;{t.quote}&rdquo;
              </div>
              <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid #e0d8ce" }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-serif text-base flex-shrink-0"
                  style={{ background: "#e8ede8", color: "#4a5e4a", border: "1px solid rgba(74,94,74,0.15)" }}
                >
                  {t.initial}
                </div>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: "#2a2218" }}>{t.name}</div>
                  <div className="text-[11.5px]" style={{ color: "#9b9088" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="relative overflow-hidden" style={{ background: "#3d2e1e" }}>
        <div className="absolute -top-[150px] -right-[150px] w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,154,126,0.10) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-[100px] left-[10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(196,133,106,0.08) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
          <div className="mb-14">
            <div className="text-[11px] font-medium tracking-[0.13em] uppercase mb-3.5" style={{ color: "#7c9a7e" }}>
              Pricing — aligned with your growth
            </div>
            <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1] mb-3.5" style={{ color: "#f8f5f0" }}>
              You Only Pay<br />When You&apos;re <em className="italic" style={{ color: "#d4a08c" }}>Earning</em>
            </h2>
            <p className="text-[15px] leading-[1.7] max-w-[480px]" style={{ color: "rgba(248,245,240,0.55)" }}>
              Most platforms charge you to exist — monthly fees whether you have one client or a hundred. Estuary is different. We only make money when you do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              {
                label: "Monthly subscription",
                amount: "$0",
                period: "per month — forever",
                desc: "No monthly fee. No annual fee. No fee to exist. You pay nothing until a client pays you.",
                detail: "This never changes, no matter how large your practice grows.",
                featured: false,
              },
              {
                label: "Online sessions & courses",
                amount: "8",
                sup: "%",
                period: "starting rate — decreases as you grow",
                desc: "A small percentage on what you earn online. This rate automatically drops as your revenue increases — the more you serve, the more you keep.",
                detail: "Your rate drops in tiers as your practice grows. No action required.",
                featured: true,
              },
              {
                label: "In-person & embodied work",
                amount: "5",
                sup: "%",
                period: "always lower — because it matters",
                desc: `Embodied healing — the kind that happens in a room, with bodies, in presence — is charged at a lower rate. We believe gathering in person is worth encouraging.`,
                detail: "Always 3% lower than your online rate, at every tier.",
                featured: false,
              },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-[18px] p-7 border transition-colors"
                style={{
                  background: card.featured ? "rgba(124,154,126,0.08)" : "rgba(248,245,240,0.05)",
                  borderColor: card.featured ? "rgba(124,154,126,0.35)" : "rgba(248,245,240,0.1)",
                }}
              >
                <div className="text-[10px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: "#7c9a7e" }}>{card.label}</div>
                <div className="font-serif text-[42px] font-light leading-none mb-1.5" style={{ color: "#f8f5f0" }}>
                  {card.amount}{card.sup && <sup className="text-lg align-super" style={{ color: "rgba(248,245,240,0.5)" }}>{card.sup}</sup>}
                </div>
                <div className="text-xs mb-5" style={{ color: "rgba(248,245,240,0.4)" }}>{card.period}</div>
                <div className="text-[13.5px] leading-[1.65] mb-5" style={{ color: "rgba(248,245,240,0.6)" }}>{card.desc}</div>
                <div className="text-xs italic leading-[1.6]" style={{ color: "rgba(248,245,240,0.35)" }}>{card.detail}</div>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-5 text-sm text-center leading-[1.7]"
            style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(248,245,240,0.08)", color: "rgba(248,245,240,0.5)" }}
          >
            <strong className="font-medium" style={{ color: "rgba(248,245,240,0.8)" }}>The more you serve, the more you keep.</strong>{" "}
            That&apos;s how it should work. No tiers to unlock, no features held hostage behind higher plans. Start free today — your rate improves automatically.
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-5 h-px" style={{ background: "#7c9a7e" }} />
          <span className="text-[11px] font-medium tracking-[0.13em] uppercase" style={{ color: "#7c9a7e" }}>Questions & answers</span>
        </div>
        <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1] mb-12" style={{ color: "#2a2218" }}>
          Things {modalityName} Practitioners<br /><em className="italic" style={{ color: "#c4856a" }}>Always Ask Us</em>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border p-6 cursor-pointer transition-colors hover:border-[#7c9a7e]"
              style={{ background: "white", borderColor: "#e0d8ce" }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-[15px] font-medium leading-[1.4]" style={{ color: "#2a2218" }}>{item.q}</div>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 mt-1 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  style={{ color: "#9b9088" }}
                />
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-[300px] opacity-100 mt-2.5" : "max-h-0 opacity-0"}`}
              >
                <div className="text-[13.5px] leading-[1.7]" style={{ color: "#6b6258" }}>{item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== RELATED MODALITIES ===== */}
      <section style={{ background: "#f0ede8", borderTop: "1px solid #e0d8ce" }}>
        <div className="max-w-[1080px] mx-auto px-6 md:px-12 py-16 sm:py-24">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-5 h-px" style={{ background: "#7c9a7e" }} />
            <span className="text-[11px] font-medium tracking-[0.13em] uppercase" style={{ color: "#7c9a7e" }}>Also built for</span>
          </div>
          <h2 className="font-serif text-[34px] sm:text-[44px] font-light leading-[1.1] mb-4" style={{ color: "#2a2218" }}>
            Estuary Works for Every<br /><em className="italic" style={{ color: "#c4856a" }}>Healing Modality</em>
          </h2>
          <p className="text-[15.5px] leading-[1.75] max-w-[540px]" style={{ color: "#6b6258" }}>
            {modalityName} is just the beginning. Estuary is home to practitioners across the full spectrum of healing and beyond.
          </p>

          <div className="flex flex-wrap gap-2.5 mt-8">
            {relatedModalities.map((m, i) => (
              <Link
                key={i}
                href={`/for/${m.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] border transition-all hover:border-[#7c9a7e] hover:text-[#4a5e4a] hover:bg-[#e8ede8]"
                style={{ background: "white", borderColor: "#e0d8ce", color: "#6b6258" }}
              >
                {m.name} <span className="opacity-40 text-xs">&#8594;</span>
              </Link>
            ))}
            <Link
              href="/modalities"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] border border-dashed transition-all hover:border-[#7c9a7e] hover:text-[#4a5e4a] hover:bg-[#e8ede8]"
              style={{ background: "white", borderColor: "#e0d8ce", color: "#6b6258" }}
            >
              Browse all modalities <span className="opacity-40 text-xs">&#8594;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="px-6 md:px-12 py-16 sm:py-24" style={{ background: "#f8f5f0" }}>
        <div className="max-w-[640px] mx-auto text-center">
          <div className="text-[11px] font-medium tracking-[0.13em] uppercase mb-5" style={{ color: "#7c9a7e" }}>
            Your practice has a home now
          </div>
          <h2 className="font-serif text-[36px] sm:text-[48px] font-light leading-[1.1] mb-4" style={{ color: "#2a2218" }}>
            Stop Juggling.<br /><em className="italic" style={{ color: "#c4856a" }}>Start Healing.</em>
          </h2>
          <p className="text-[15px] leading-[1.75] mb-10" style={{ color: "#6b6258" }}>
            Join practitioners who&apos;ve replaced four apps with one — and started spending that time doing the work they actually came here to do.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-5">
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 text-[14.5px] font-medium px-7 py-3.5 rounded-full transition-all hover:-translate-y-px"
              style={{ background: "#3d2e1e", color: "#f8f5f0" }}
            >
              Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-sm px-6 py-3.5 rounded-full border transition-all hover:border-[#2a2218] hover:text-[#2a2218]"
              style={{ borderColor: "#e0d8ce", color: "#6b6258" }}
            >
              Book a Demo
            </Link>
          </div>
          <div className="text-xs" style={{ color: "#9b9088" }}>
            Setup takes 15 minutes &middot; No monthly fee &middot; Cancel anytime
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: "#3d2e1e", borderTop: "1px solid rgba(248,245,240,0.08)" }}>
        <div className="max-w-[1080px] mx-auto px-6 md:px-12 py-14 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12">
            <div>
              <div className="font-serif font-medium text-xl tracking-[0.14em] uppercase mb-3" style={{ color: "rgba(248,245,240,0.8)" }}>Estuary</div>
              <div className="text-[13px] leading-[1.65]" style={{ color: "rgba(248,245,240,0.35)" }}>
                Your sanctuary for wellness, growth, and meaningful connections.
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase mb-4" style={{ color: "rgba(248,245,240,0.3)" }}>Explore</div>
              <div className="flex flex-col gap-2.5">
                {["Marketplace", "Find Practitioners", "Sessions", "Workshops", "Courses", "Modalities"].map((l) => (
                  <Link key={l} href={`/${l.toLowerCase().replace(" ", "-")}`} className="text-[13.5px] transition-colors hover:text-[rgba(248,245,240,0.85)]" style={{ color: "rgba(248,245,240,0.5)" }}>
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase mb-4" style={{ color: "rgba(248,245,240,0.3)" }}>Company</div>
              <div className="flex flex-col gap-2.5">
                {["About", "Mission", "Pricing", "Careers", "Blog", "Contact"].map((l) => (
                  <Link key={l} href={`/${l.toLowerCase()}`} className="text-[13.5px] transition-colors hover:text-[rgba(248,245,240,0.85)]" style={{ color: "rgba(248,245,240,0.5)" }}>
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase mb-4" style={{ color: "rgba(248,245,240,0.3)" }}>Practitioners</div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Start Free", href: "#" },
                  { label: "Practitioner Guide", href: "/guide" },
                  { label: "Help Center", href: "/help" },
                  { label: "FAQ", href: "/faq" },
                  { label: "Community", href: "/community" },
                ].map((l) => (
                  <Link key={l.label} href={l.href} className="text-[13.5px] transition-colors hover:text-[rgba(248,245,240,0.85)]" style={{ color: "rgba(248,245,240,0.5)" }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(248,245,240,0.07)" }}>
            <div className="text-xs" style={{ color: "rgba(248,245,240,0.25)" }}>
              &copy; {new Date().getFullYear()} Estuary. All rights reserved.
            </div>
            <div className="flex gap-5">
              {["Terms", "Privacy", "Cookies", "Accessibility"].map((l) => (
                <Link key={l} href={`/${l.toLowerCase()}`} className="text-xs transition-colors hover:text-[rgba(248,245,240,0.5)]" style={{ color: "rgba(248,245,240,0.25)" }}>
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
