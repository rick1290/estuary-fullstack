import Link from "next/link"
import {
  ArrowLeft,
  UserPlus,
  Search,
  CalendarCheck,
  Video,
  Star,
  Lightbulb,
} from "lucide-react"

export const metadata = {
  title: "Getting Started | Estuary Help",
  description: "Learn how to create your Estuary account, find practitioners, and book your first wellness session.",
}

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    description:
      "Sign up with your email address or continue with Google. You'll be asked for your name and email — that's all you need to get started. You can fill out the rest of your profile later from your account settings.",
  },
  {
    icon: Search,
    title: "Browse practitioners",
    description:
      "Head to the Marketplace to explore practitioners across a range of wellness modalities — from coaching and breathwork to therapy and meditation. Each practitioner has a detailed profile with their background, specialties, reviews, and available services.",
  },
  {
    icon: CalendarCheck,
    title: "Book your first session",
    description:
      "Found someone you'd like to work with? Select a service from their profile, pick an available time slot, and proceed to checkout. You'll receive a confirmation email with all the details, including how to join your session.",
  },
  {
    icon: Video,
    title: "Join your session",
    description:
      "When it's time, go to My Journeys in your dashboard. Your session will show a \"Join\" button 15 minutes before the scheduled start. Click it to enter the lobby, check your camera and microphone, and join the video room when you're ready.",
  },
  {
    icon: Star,
    title: "Leave a review",
    description:
      "After your session, you'll be able to leave a review for your practitioner. Your feedback helps other users find the right fit and helps practitioners grow. You can rate your experience and write about what stood out.",
  },
]

const tips = [
  "Use filters on the Marketplace page to narrow results by modality, session type, price range, or practitioner location.",
  "Save practitioners you're interested in by clicking the heart icon on their profile — you'll find them later in your Saved list.",
  "Check out Streams for free articles, videos, and audio content from practitioners before booking.",
  "If you're not sure what modality is right for you, browse by category to learn about different approaches.",
]

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm text-olive-500 hover:text-sage-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>

        <h1 className="font-serif text-3xl font-light text-olive-900 mb-2">
          Welcome to Estuary
        </h1>
        <p className="text-olive-500 mb-10">
          Everything you need to get started on the platform, from signing up to attending your first session.
        </p>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="bg-white border border-sage-200/60 rounded-xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-sage-100 text-sage-700 font-medium text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-sage-600" />
                      <h2 className="text-[15px] font-medium text-olive-800">
                        {step.title}
                      </h2>
                    </div>
                    <p className="text-[15px] text-olive-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-olive-500" />
            <h2 className="text-lg font-medium text-olive-800">Helpful tips</h2>
          </div>
          <div className="bg-white border border-sage-200/60 rounded-xl p-6">
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                  <p className="text-[15px] text-olive-600 leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-olive-400">Ready to explore?</p>
            <div className="flex gap-4">
              <Link
                href="/marketplace"
                className="text-sm text-sage-600 hover:text-sage-700 font-medium"
              >
                Browse the Marketplace
              </Link>
              <span className="text-olive-300">|</span>
              <Link
                href="/help/booking"
                className="text-sm text-sage-600 hover:text-sage-700 font-medium"
              >
                How Booking Works
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-olive-400">Still need help?</p>
            <a
              href="mailto:support@estuary.com"
              className="text-sm text-sage-600 hover:text-sage-700"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
