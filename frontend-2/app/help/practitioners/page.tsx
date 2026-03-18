import Link from "next/link"
import {
  ChevronRight,
  ArrowRight,
  Rocket,
  Layers,
  CalendarClock,
  DollarSign,
  Users,
  Radio,
} from "lucide-react"

export default function PractitionerHelpPage() {
  const categories = [
    {
      title: "Getting Started",
      icon: <Rocket className="h-6 w-6" />,
      description:
        "Apply to become a practitioner, complete onboarding, and set up your profile for success.",
      href: "/help/practitioners/getting-started",
    },
    {
      title: "Managing Services",
      icon: <Layers className="h-6 w-6" />,
      description:
        "Create sessions, workshops, courses, and packages. Learn about pricing, media, and publishing.",
      href: "/help/practitioners/services",
    },
    {
      title: "Availability & Schedule",
      icon: <CalendarClock className="h-6 w-6" />,
      description:
        "Configure your working hours, block time off, and manage your calendar across timezones.",
      href: "/help/practitioners/availability",
    },
    {
      title: "Earnings & Payouts",
      icon: <DollarSign className="h-6 w-6" />,
      description:
        "Understand the 5% commission, 48-hour hold period, and how to request payouts via Stripe Connect.",
      href: "/help/practitioners/earnings",
    },
    {
      title: "Managing Clients",
      icon: <Users className="h-6 w-6" />,
      description:
        "View bookings, message clients, handle cancellations, and respond to reviews.",
      href: "/help/practitioners/clients",
    },
    {
      title: "Content & Streams",
      icon: <Radio className="h-6 w-6" />,
      description:
        "Publish articles, videos, and audio. Set subscription tiers and grow your audience.",
      href: "/help/practitioners/streams",
    },
  ]

  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <div className="container max-w-5xl py-12">
        {/* Back link */}
        <Link
          href="/help"
          className="inline-flex items-center text-sm text-[#7A6F5D] hover:text-[#5a5243] mb-8"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Back to Help Center
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-[#4a5240] tracking-tight mb-4">
            Practitioner Guide
          </h1>
          <p className="text-lg text-[#7A6F5D] max-w-2xl">
            Everything you need to build a thriving practice on Estuary. From
            setting up your profile to managing earnings, we have you covered.
          </p>
        </div>

        {/* Category cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {categories.map((category) => (
            <Link key={category.title} href={category.href}>
              <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-6 h-full hover:border-[#9CAF88] hover:shadow-md transition-all">
                <div className="bg-[#9CAF88]/10 p-3 rounded-xl w-fit mb-4 text-[#4a5240]">
                  {category.icon}
                </div>
                <h2 className="text-lg font-serif font-semibold text-[#4a5240] mb-2">
                  {category.title}
                </h2>
                <p className="text-sm text-[#7A6F5D] mb-4 leading-relaxed">
                  {category.description}
                </p>
                <span className="inline-flex items-center text-sm font-medium text-[#9CAF88]">
                  Learn more
                  <ArrowRight className="h-4 w-4 ml-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Can&apos;t find what you&apos;re looking for? Our practitioner
            support team is here to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-[#9CAF88] text-white rounded-xl hover:bg-[#8a9e78] transition-colors font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
