import Link from "next/link"
import {
  Search,
  Sparkles,
  CreditCard,
  Video,
  XCircle,
  Settings,
  Map,
  Briefcase,
  CalendarClock,
  DollarSign,
  Users,
  FileText,
  ArrowRight,
  Mail,
  Gift,
  MessageSquare,
  Bell,
  MonitorSmartphone,
  Coins,
  Radio,
  BookOpen,
} from "lucide-react"
import { SUPPORT_EMAIL } from "@/lib/constants"

export const metadata = {
  title: "Help Center | Estuary",
  description: "Find answers, guides, and support for using the Estuary wellness marketplace.",
}

const clientCategories = [
  {
    title: "Getting Started",
    description: "Create your account, find practitioners, and book your first session.",
    icon: Sparkles,
    href: "/help/getting-started",
  },
  {
    title: "Booking & Payments",
    description: "How to book sessions, workshops, courses, and packages. Payment options explained.",
    icon: CreditCard,
    href: "/help/booking",
  },
  {
    title: "Your Sessions",
    description: "Joining video sessions, in-person details, recordings, and rescheduling.",
    icon: Video,
    href: "/help/sessions",
  },
  {
    title: "Cancellations & Refunds",
    description: "Our cancellation policy, how refunds work, and what to expect.",
    icon: XCircle,
    href: "/help/cancellations",
  },
  {
    title: "Your Account",
    description: "Profile settings, payment methods, notifications, and credits.",
    icon: Settings,
    href: "/help/account",
  },
  {
    title: "My Journeys",
    description: "Track your progress, write journal entries, and leave reviews.",
    icon: Map,
    href: "/help/journeys",
  },
  {
    title: "Referrals",
    description: "Invite friends, earn credits, and track your referral rewards.",
    icon: Gift,
    href: "/help/referrals",
  },
  {
    title: "Messaging",
    description: "Send and receive messages with practitioners and clients.",
    icon: MessageSquare,
    href: "/help/messaging",
  },
  {
    title: "Notifications",
    description: "Manage your notification preferences, reminders, and email alerts.",
    icon: Bell,
    href: "/help/notifications",
  },
  {
    title: "Video Sessions",
    description: "Join video sessions, troubleshoot camera and mic issues, and more.",
    icon: MonitorSmartphone,
    href: "/help/video",
  },
  {
    title: "Credits",
    description: "Earn, manage, and spend platform credits on bookings.",
    icon: Coins,
    href: "/help/credits",
  },
  {
    title: "Streams",
    description: "Subscribe to practitioner content — articles, videos, and audio.",
    icon: Radio,
    href: "/help/streams",
  },
  {
    title: "Journal",
    description: "Write private reflections, intentions, and takeaways for each session.",
    icon: BookOpen,
    href: "/help/journal",
  },
]

const practitionerCategories = [
  {
    title: "Getting Started",
    description: "Set up your practitioner profile and create your first service listing.",
    icon: Briefcase,
    href: "/become-practitioner",
  },
  {
    title: "Managing Services",
    description: "Create and edit sessions, workshops, courses, and packages.",
    icon: FileText,
    href: "/help/booking",
  },
  {
    title: "Availability & Schedule",
    description: "Set your working hours, block off time, and manage your calendar.",
    icon: CalendarClock,
    href: "/help/sessions",
  },
  {
    title: "Earnings & Payouts",
    description: "Track your revenue, understand commission rates, and request payouts.",
    icon: DollarSign,
    href: "/help/booking",
  },
  {
    title: "Managing Clients",
    description: "View bookings, communicate with clients, and manage sessions.",
    icon: Users,
    href: "/help/sessions",
  },
  {
    title: "Content & Streams",
    description: "Publish articles, videos, and audio content for your audience.",
    icon: FileText,
    href: "/streams",
  },
]

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <div className="bg-gradient-to-b from-sage-100/60 to-cream-50 pt-12 sm:pt-16 pb-10 sm:pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-olive-900 mb-3">
            How can we help?
          </h1>
          <p className="text-olive-500 mb-8 text-lg">
            Guides, answers, and resources for getting the most out of Estuary.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-olive-500" />
            <input
              type="text"
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-sage-200/80 bg-white text-olive-700 placeholder:text-olive-500 focus:outline-none focus:ring-2 focus:ring-sage-300/50 text-[15px] min-h-[44px]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-12 sm:space-y-16">
        {/* For Clients */}
        <section>
          <h2 className="text-xl font-serif font-medium text-olive-800 mb-6">For Clients</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientCategories.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group bg-white border border-sage-200/60 rounded-xl p-4 sm:p-5 hover:border-sage-300 hover:shadow-sm transition-all min-h-[44px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-sage-100/80 rounded-lg p-2 text-sage-600 mt-0.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-olive-800 group-hover:text-sage-700 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-sm text-olive-500 mt-1 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* For Practitioners */}
        <section>
          <h2 className="text-xl font-serif font-medium text-olive-800 mb-6">For Practitioners</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {practitionerCategories.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group bg-white border border-sage-200/60 rounded-xl p-4 sm:p-5 hover:border-sage-300 hover:shadow-sm transition-all min-h-[44px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-olive-100/80 rounded-lg p-2 text-olive-600 mt-0.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-olive-800 group-hover:text-olive-600 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-sm text-olive-500 mt-1 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Practitioner Guide + FAQ links */}
        <section className="grid sm:grid-cols-2 gap-6">
          <Link href="/help/practitioners" className="block group">
            <div className="bg-white border border-sage-200/60 rounded-xl p-6 h-full hover:border-sage-400 hover:shadow-md transition-all">
              <h3 className="font-serif text-lg font-medium text-olive-800 mb-2">
                Practitioner Guide
              </h3>
              <p className="text-sm text-olive-500 mb-4">
                Everything practitioners need — onboarding, service setup, earnings, payouts, and client management.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-sage-600 group-hover:text-sage-700">
                View guide
                <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </div>
          </Link>
          <Link href="/help/faq" className="block group">
            <div className="bg-white border border-sage-200/60 rounded-xl p-6 h-full hover:border-sage-400 hover:shadow-md transition-all">
              <h3 className="font-serif text-lg font-medium text-olive-800 mb-2">
                Frequently Asked Questions
              </h3>
              <p className="text-sm text-olive-500 mb-4">
                Quick answers about bookings, payments, sessions, accounts, and becoming a practitioner.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-sage-600 group-hover:text-sage-700">
                View FAQ
                <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </div>
          </Link>
        </section>

        {/* Contact */}
        <section className="bg-white border border-sage-200/60 rounded-xl p-5 sm:p-8 text-center">
          <h2 className="font-serif text-xl font-medium text-olive-800 mb-2">
            Can't find what you're looking for?
          </h2>
          <p className="text-sm text-olive-500 mb-6 max-w-md mx-auto">
            Our support team is here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors min-h-[44px]"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
            <Link
              href="/help/getting-started"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-sage-200 text-olive-700 text-sm font-medium rounded-xl hover:bg-sage-50 transition-colors min-h-[44px]"
            >
              Browse All Articles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
