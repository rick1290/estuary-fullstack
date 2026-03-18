import Link from "next/link"
import {
  ArrowLeft,
  Radio,
  Layers,
  CreditCard,
  Library,
  Settings,
  Unlock,
  Lock,
} from "lucide-react"

export const metadata = {
  title: "Streams | Estuary Help",
  description: "Learn how to subscribe to practitioner streams, access free and premium content on Estuary.",
}

export default function StreamsPage() {
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
          Streams
        </h1>
        <p className="text-olive-500 mb-10">
          How to discover, subscribe to, and enjoy practitioner content on Estuary.
        </p>

        <div className="space-y-10">
          {/* What are streams */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">What are streams?</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Streams are content published by practitioners on Estuary. This includes articles, videos, audio recordings, and other media. Practitioners use streams to share their expertise, guided practices, educational content, and wellness insights. You can browse streams to learn from practitioners before booking or to continue your practice between sessions.
              </p>
            </div>
          </section>

          {/* Subscription tiers */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Subscription tiers</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Practitioners can offer content at different access levels:
              </p>
              <div className="space-y-4">
                {[
                  {
                    tier: "Free",
                    description: "Always available to everyone. No subscription needed. Browse and enjoy at no cost.",
                  },
                  {
                    tier: "Entry",
                    description: "A monthly subscription tier that unlocks additional content. Pricing is set by each practitioner.",
                  },
                  {
                    tier: "Premium",
                    description: "The highest tier, granting access to all content including exclusive premium material. Monthly fee set by the practitioner.",
                  },
                ].map((item) => (
                  <div key={item.tier} className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-sage-100/80 rounded-lg px-2.5 py-1 text-sage-700 text-xs font-medium mt-0.5">
                      {item.tier}
                    </div>
                    <p className="text-sm text-olive-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How to subscribe */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">How to subscribe</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-3">
                {[
                  { step: "1", text: "Visit a practitioner's stream page to see their available content and subscription options." },
                  { step: "2", text: "Choose the tier that interests you — Entry or Premium." },
                  { step: "3", text: "Click Subscribe and complete the payment through Stripe. Your subscription renews monthly." },
                  { step: "4", text: "Once subscribed, all content at your tier level (and below) is immediately accessible." },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-sage-100 text-sage-700 font-medium text-xs">
                      {item.step}
                    </div>
                    <p className="text-[15px] text-olive-600 leading-relaxed pt-0.5">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Accessing content */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Library className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Accessing your content</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                After subscribing, go to your Dashboard and select the My Streams section. Here you can browse all the content from practitioners you are subscribed to. Content is organized by practitioner and type, making it easy to find what you are looking for. New content from your subscribed practitioners appears automatically.
              </p>
            </div>
          </section>

          {/* Managing subscriptions */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Managing subscriptions</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                To manage your stream subscriptions, go to Settings and select the Subscriptions section. From there you can:
              </p>
              <ul className="space-y-2">
                {[
                  "View all your active subscriptions and their renewal dates.",
                  "Upgrade from Entry to Premium for more content.",
                  "Downgrade from Premium to Entry if you want to reduce your spend.",
                  "Cancel a subscription at any time. You retain access until the end of your current billing period.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Free content */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Free content</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Many practitioners offer free content that anyone can access without subscribing. This is a great way to explore a practitioner&apos;s style and expertise before committing to a subscription or booking. Free content is clearly marked and accessible directly from the practitioner&apos;s stream page.
              </p>
            </div>
          </section>

          {/* Premium content */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Premium content</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Premium content is indicated by a lock icon. To access it, you need an active subscription at the appropriate tier. If you see locked content you are interested in, click on it to see which subscription tier is required. You can subscribe directly from the content page.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/booking"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Booking & Payments
            </Link>
            <Link
              href="/help/journal"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Your Journal
            </Link>
          </div>
          <div className="text-center">
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
