"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import {
  Calendar,
  Video,
  CreditCard,
  ClipboardList,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Globe,
  MessageCircle,
  Play,
} from "lucide-react"

interface PractitionerLandingClientProps {
  modality: any
}

export default function PractitionerLandingClient({ modality }: PractitionerLandingClientProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  const modalityName = modality.name || "Wellness"
  const modalityDescription = modality.description || modality.short_description || ""

  const handleCTA = () => {
    // Store modality for pre-selection in onboarding
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

  return (
    <div className="min-h-screen bg-cream-50">
      {/* ── Minimal Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-sage-200/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-[0.25em] text-[#3d2e1e]">
            ESTUARY
          </Link>
          <Button
            onClick={handleCTA}
            className="bg-olive-800 hover:bg-olive-900 text-white rounded-full px-6 h-10 text-sm font-medium"
          >
            List Your Services — Free
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d3b2d] via-[#3d5a3d] to-[#4a6e4a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,215,180,0.15),transparent_60%)]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-medium tracking-wide uppercase mb-6">
              <span className="text-base">{modality.icon || "✨"}</span>
              Built for {modalityName} Practitioners
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-[1.1] mb-6">
              Grow Your{" "}
              <em className="font-normal italic">{modalityName}</em>
              <br className="hidden sm:block" />
              {" "}Practice Online
            </h1>

            <p className="text-lg sm:text-xl text-white/70 font-light leading-relaxed max-w-xl mb-10">
              Everything you need in one place — bookings, payments, video sessions, intake forms, and client management. No monthly fees. Pay only when you earn.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleCTA}
                size="lg"
                className="bg-white text-olive-900 hover:bg-cream-50 rounded-full px-8 h-13 text-base font-medium shadow-lg shadow-black/10"
              >
                Start Your Free Profile
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full px-8 h-13 text-base border border-white/20"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Free to join
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                No monthly fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                5% only when you earn
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-sage-600 mb-3">The Problem</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-olive-900 mb-4">
              Stop Juggling <em className="font-normal italic">Five Different Tools</em>
            </h2>
            <p className="text-olive-500 font-light text-lg">
              Most {modalityName.toLowerCase()} practitioners cobble together Calendly for scheduling, Venmo for payments, Zoom for sessions, and spreadsheets for everything else. It shouldn't be this hard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { old: "Calendly + manual follow-ups", new: "Automated booking & reminders", icon: Calendar },
              { old: "Venmo / PayPal / invoices", new: "Built-in payments + auto payouts", icon: CreditCard },
              { old: "Zoom + separate recording tools", new: "HD video with one-click recording", icon: Video },
              { old: "Google Forms for intake", new: "Branded intake & consent forms", icon: ClipboardList },
              { old: "Word of mouth only", new: "Marketplace exposure to new clients", icon: Globe },
              { old: "No idea what's working", new: "Analytics & earnings dashboard", icon: BarChart3 },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-xl border border-sage-200/60 bg-cream-50/50">
                <item.icon className="h-5 w-5 text-sage-600 mb-3" />
                <p className="text-sm text-olive-400 line-through mb-1">{item.old}</p>
                <p className="text-sm font-medium text-olive-900">{item.new}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-sage-600 mb-3">Everything You Need</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-olive-900 mb-4">
              One Platform for Your Entire <em className="font-normal italic">{modalityName}</em> Practice
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                description: `Set your availability, and clients book ${modalityName.toLowerCase()} sessions directly. Automated reminders reduce no-shows.`,
              },
              {
                icon: Video,
                title: "Built-In Video Sessions",
                description: "HD video with screen sharing, session recording, and no third-party app needed. Clients join with one click.",
              },
              {
                icon: CreditCard,
                title: "Seamless Payments",
                description: "Accept credit cards instantly. Earnings tracked in real-time. Request payouts whenever you want.",
              },
              {
                icon: ClipboardList,
                title: "Intake & Consent Forms",
                description: "Custom intake questionnaires and consent forms. Clients fill them out before the session — you review from your dashboard.",
              },
              {
                icon: Users,
                title: "Workshops & Courses",
                description: `Run group ${modalityName.toLowerCase()} workshops or multi-session courses. Manage enrollment, waitlists, and attendance.`,
              },
              {
                icon: MessageCircle,
                title: "Client Messaging",
                description: "Built-in messaging to communicate with clients. Share resources, session notes, and follow-ups.",
              },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white border border-sage-200/60">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-sage-100 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-sage-700" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-light text-olive-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-olive-500 font-light leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-sage-600 mb-3">Get Started in Minutes</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-olive-900">
              Three Steps to Your First <em className="font-normal italic">Booking</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Profile",
                description: `Sign up free and build your ${modalityName.toLowerCase()} practitioner profile. Add your bio, credentials, and specializations.`,
              },
              {
                step: "02",
                title: "List Your Services",
                description: "Set your availability, pricing, and session types. Offer 1-on-1 sessions, group workshops, or multi-week courses.",
              },
              {
                step: "03",
                title: "Start Seeing Clients",
                description: "Share your profile link or let clients discover you on the marketplace. Book, meet, and get paid — all in one place.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-full bg-olive-800 text-white flex items-center justify-center mx-auto mb-5">
                  <span className="text-sm font-semibold">{item.step}</span>
                </div>
                <h3 className="font-serif text-xl font-light text-olive-900 mb-2">{item.title}</h3>
                <p className="text-sm text-olive-500 font-light leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-16 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-sage-200/60 bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-olive-800 to-olive-700 px-8 py-10 text-center">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-white/60 mb-2">Simple Pricing</p>
                <h2 className="font-serif text-3xl sm:text-4xl font-light text-white mb-2">
                  Free to List. <em className="font-normal italic">Always.</em>
                </h2>
                <p className="text-white/60 font-light">No subscriptions. No hidden fees. No catch.</p>
              </div>

              <div className="p-8">
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-5xl font-serif font-light text-olive-900">5%</span>
                  <span className="text-olive-500 font-light">per transaction</span>
                </div>

                <div className="space-y-3 max-w-sm mx-auto mb-8">
                  {[
                    "Create your profile — free",
                    "List unlimited services — free",
                    "Built-in video sessions — free",
                    "Intake & consent forms — free",
                    "Client messaging — free",
                    "5% only when a client pays you",
                    "Volume discounts at scale",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-sage-600 shrink-0" />
                      <span className="text-olive-700">{item}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleCTA}
                  className="w-full bg-olive-800 hover:bg-olive-900 text-white rounded-full h-12 text-base font-medium"
                >
                  Start Your Free {modalityName} Profile
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About the Modality (if description exists) ── */}
      {modalityDescription && (
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-sage-600 mb-3">About {modalityName}</p>
            <p className="text-olive-600 font-light text-lg leading-relaxed">
              {modalityDescription}
            </p>
            <Link
              href={`/modalities/${modality.slug}`}
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-sage-700 hover:text-sage-800 transition-colors"
            >
              Learn more about {modalityName}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[#2d3b2d] via-[#3d5a3d] to-[#4a6e4a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(200,215,180,0.1),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-4xl mb-6">{modality.icon || "🌿"}</div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-5">
            Ready to Grow Your{" "}
            <em className="font-normal italic">{modalityName}</em> Practice?
          </h2>
          <p className="text-lg text-white/60 font-light mb-10 max-w-xl mx-auto">
            Join a growing community of wellness practitioners. Create your profile in under 5 minutes — completely free.
          </p>
          <Button
            onClick={handleCTA}
            size="lg"
            className="bg-white text-olive-900 hover:bg-cream-50 rounded-full px-10 h-14 text-base font-medium shadow-xl shadow-black/10"
          >
            Create Your Free Profile
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-white/40 mt-5 font-light">
            No credit card required · Set up in 5 minutes · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Minimal Footer ── */}
      <footer className="bg-[#2d3b2d] border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="font-serif text-sm font-semibold tracking-[0.25em] text-white/40">
              ESTUARY
            </Link>
            <div className="flex items-center gap-6 text-xs text-white/30">
              <Link href="/about" className="hover:text-white/50 transition-colors">About</Link>
              <Link href="/marketplace" className="hover:text-white/50 transition-colors">Marketplace</Link>
              <Link href="/help/practitioners" className="hover:text-white/50 transition-colors">Help</Link>
              <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-white/20">© {new Date().getFullYear()} Estuary</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
