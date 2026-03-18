import Link from "next/link"
import {
  ArrowLeft,
  UserCircle,
  KeyRound,
  CreditCard,
  Bell,
  Coins,
  Trash2,
} from "lucide-react"

export const metadata = {
  title: "Your Account | Estuary Help",
  description: "Manage your Estuary account — profile, password, payment methods, notifications, credits, and more.",
}

const sections = [
  {
    icon: UserCircle,
    title: "Profile",
    content: [
      "Your profile includes your name, bio, and avatar. To update any of these, go to Settings and select Account.",
      "Your name and avatar are visible to practitioners you book with. Your bio is optional and only shown if you choose to fill it out.",
      "To update your avatar, click the current image (or placeholder) and upload a new photo. We recommend a square image at least 200x200 pixels.",
    ],
  },
  {
    icon: KeyRound,
    title: "Password",
    content: [
      "To change your password, go to Settings and select Password. You'll need to enter your current password and then choose a new one.",
      "If you've forgotten your password, use the \"Forgot Password\" link on the login page. We'll send a reset link to the email address on your account.",
      "For security, choose a password that's at least 8 characters long and includes a mix of letters and numbers.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payment methods",
    content: [
      "You can manage your saved cards in Settings under Payment Methods. This is where you add new cards, remove old ones, or set a default payment method.",
      "When you add a card, it's securely stored through Stripe — Estuary never sees or stores your full card number.",
      "If a card expires or is declined, you'll be prompted to update it the next time you try to make a booking.",
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    content: [
      "Control what emails you receive in Settings under Notifications. You can toggle preferences for booking confirmations, reminders, practitioner messages, and marketing updates.",
      "Booking-related emails (confirmations, cancellations, and reminders) are always sent for active bookings. You can opt out of promotional and newsletter emails.",
      "If you're not receiving emails, check your spam folder and add support@estuary.com to your contacts.",
    ],
  },
  {
    icon: Coins,
    title: "Credits",
    content: [
      "Your credit balance is shown in Settings under Credits. Credits come from refunds, promotions, or gifts and can be applied toward any booking on the platform.",
      "You'll also see a full transaction history showing when credits were added and when they were used.",
      "Credits don't expire and are automatically offered as a payment option at checkout.",
    ],
  },
  {
    icon: Trash2,
    title: "Deleting your account",
    content: [
      "If you'd like to close your account, go to Settings and select Account. Scroll to the bottom and click \"Delete Account.\"",
      "Before deleting, make sure you don't have any upcoming bookings. Active bookings must be cancelled first.",
      "Deleting your account is permanent. Your profile, booking history, journal entries, and reviews will be removed. Any remaining credit balance will be forfeited.",
      "If you're having an issue and considering deleting your account, reach out to our support team first — we may be able to help.",
    ],
  },
]

export default function AccountPage() {
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
          Your Account
        </h1>
        <p className="text-olive-500 mb-10">
          How to manage your profile, security settings, payment methods, and account preferences.
        </p>

        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <section key={section.title}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-5 w-5 text-sage-600" />
                  <h2 className="text-lg font-medium text-olive-800">{section.title}</h2>
                </div>
                <div className="bg-white border border-sage-200/60 rounded-xl p-6">
                  <div className="space-y-3">
                    {section.content.map((paragraph, i) => (
                      <p key={i} className="text-[15px] text-olive-600 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/cancellations"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Cancellations & Refunds
            </Link>
            <Link
              href="/help/journeys"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              My Journeys
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
