import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function FAQPage() {
  const sections = [
    {
      title: "General",
      questions: [
        {
          q: "What is Estuary?",
          a: "Estuary is a wellness marketplace that connects clients with qualified practitioners offering sessions, workshops, courses, and content across a wide range of wellness modalities. Our platform makes it easy to discover, book, and experience transformative wellness services from anywhere.",
        },
        {
          q: "How does Estuary work?",
          a: "Browse the marketplace to find practitioners and services that resonate with you. When you find something you like, choose an available time (for sessions) or register for a specific date (for workshops and courses), complete payment, and you are all set. You will receive a confirmation email with everything you need to join your session.",
        },
        {
          q: "Is Estuary free to use?",
          a: "Creating an account and browsing the marketplace is completely free. You only pay when you book a service or subscribe to premium stream content. There are no membership fees or hidden charges.",
        },
        {
          q: "What types of wellness services are available?",
          a: "Estuary offers a broad spectrum of wellness services including coaching, therapy, meditation, yoga, breathwork, energy healing, nutrition counseling, sound healing, and more. Services come in four formats: one-on-one sessions, group workshops, multi-session courses, and bundled packages.",
        },
        {
          q: "How do referrals work?",
          a: "Estuary has a referral program that rewards both you and the person you invite. Share your unique referral link or code with a friend. When they sign up and make their first purchase, you earn $20 in platform credits and they get $10 off. You can find your referral link in your Dashboard under the Referrals tab.",
        },
      ],
    },
    {
      title: "Booking & Payments",
      questions: [
        {
          q: "How do I book a session?",
          a: "Find a service you are interested in, view the practitioner's available time slots, select the time that works for you, and complete the checkout process. You will receive an instant confirmation email with session details and a link to join if it is a virtual session.",
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover), as well as Apple Pay and Google Pay. All payments are processed securely through Stripe.",
        },
        {
          q: "How do credits work?",
          a: "Credits are a digital balance on your Estuary account that work like cash for bookings. You can earn credits through referrals, receive them as refunds when you cancel a booking, or get them from promotions. At checkout, toggle \"Apply Credits\" to use your balance. Credits are applied first, and any remaining amount is charged to your card. Credits do not expire and can be viewed under Settings in the Credits tab.",
        },
        {
          q: "What's the cancellation policy?",
          a: "For sessions and workshops, cancellations made more than 24 hours before the scheduled time receive a full refund. Cancellations within 24 hours are not eligible for a refund. For courses, you can cancel within 14 days of enrollment for a full refund, regardless of when the first session is scheduled.",
        },
        {
          q: "What happens if my practitioner cancels?",
          a: "If a practitioner cancels your session, you automatically receive a full refund regardless of timing. You will be notified by email and can rebook with the same practitioner or choose a different one. Our support team is available if you need help finding an alternative.",
        },
      ],
    },
    {
      title: "Sessions",
      questions: [
        {
          q: "How do I join a virtual session?",
          a: "When your session time arrives, go to your bookings in your dashboard and click \"Join Session.\" You will be taken to a lobby where your practitioner will admit you. You can also use the direct link from your confirmation email.",
        },
        {
          q: "What equipment do I need for virtual sessions?",
          a: "You need a device with a camera and microphone (computer, tablet, or phone), a stable internet connection, and a supported web browser (Chrome, Firefox, Safari, or Edge). No additional software downloads are required.",
        },
        {
          q: "Are sessions recorded?",
          a: "Sessions are not recorded by default for privacy reasons. If a practitioner wishes to record a session for any reason, they must obtain your explicit consent beforehand. You can decline recording at any time.",
        },
        {
          q: "Can I reschedule a session?",
          a: "Yes, you can reschedule from your dashboard as long as you do so more than 24 hours before the original session time. Go to your bookings, find the session, and click \"Reschedule\" to choose a new available time slot.",
        },
        {
          q: "What if I miss a session?",
          a: "If you miss a session without cancelling, it is treated as a no-show and no refund is issued. If you are running late, message your practitioner — many are willing to accommodate a delayed start if time permits. We recommend setting a reminder before your session.",
        },
        {
          q: "What if I have camera or mic issues?",
          a: "First, check that your browser has permission to access your camera and microphone — look for the camera icon in your browser's address bar. Make sure no other app (like Zoom or FaceTime) is using your camera. Try refreshing the page and re-entering the lobby. If the issue persists, switch to a different supported browser (Chrome, Firefox, Safari, or Edge). For external devices, verify they are properly connected.",
        },
        {
          q: "Can I message my practitioner before the session?",
          a: "Yes. Once you have a booking, you can message your practitioner at any time — before, during, or after the session. Go to your booking detail page and click \"Message Practitioner\" to start a conversation. You can also access all your conversations from the Messages tab in your Dashboard.",
        },
      ],
    },
    {
      title: "For Practitioners",
      questions: [
        {
          q: "How do I become a practitioner on Estuary?",
          a: "Visit the \"Become a Practitioner\" page and submit your application. You will need to provide information about your background, specializations, and credentials. Applications are typically reviewed within 48 hours. Once approved, you complete onboarding and can start publishing services.",
        },
        {
          q: "How much does it cost to list services?",
          a: "There are no listing fees, monthly fees, or upfront costs. Estuary only charges a commission when you earn money. You can list as many services as you like at no charge.",
        },
        {
          q: "What commission does Estuary take?",
          a: "Estuary charges a standard 5% commission on all transactions. For a $100 session, you earn $95. There are no additional processing fees or hidden charges. Commission tiers may be available for high-volume practitioners.",
        },
        {
          q: "How do I get paid?",
          a: "Earnings are paid out through Stripe Connect. After a session is delivered, there is a 48-hour hold period, after which your earnings become available. You can request a payout at any time, and funds typically arrive in your bank account within 1-3 business days.",
        },
        {
          q: "Can I offer both virtual and in-person sessions?",
          a: "Yes, when creating a service you can specify whether it is virtual, in-person, or both. For in-person sessions, you can list your location so clients know where to go. Virtual sessions use our built-in video platform.",
        },
      ],
    },
    {
      title: "Account",
      questions: [
        {
          q: "How do I change my password?",
          a: "Go to your account settings and select \"Security.\" From there you can update your password. You will need to enter your current password and then your new password twice to confirm. If you have forgotten your password, use the \"Forgot Password\" link on the login page.",
        },
        {
          q: "How do I update my payment method?",
          a: "Navigate to your account settings and select \"Billing.\" You can add, remove, or update your payment methods there. Your default payment method is used for all future bookings unless you choose a different one during checkout.",
        },
        {
          q: "How do I delete my account?",
          a: "Go to your account settings and scroll to the bottom of the page. Click \"Delete Account\" and follow the confirmation steps. Please note that account deletion is permanent and cannot be undone. Any active bookings must be completed or cancelled first.",
        },
        {
          q: "How do I contact support?",
          a: "You can reach our support team through the Contact page, by emailing support@estuary.com, or by using the in-app messaging feature. We aim to respond to all inquiries within 24 hours during business days.",
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <div className="container max-w-4xl py-12">
        {/* Back link */}
        <Link
          href="/help"
          className="inline-flex items-center text-sm text-[#7A6F5D] hover:text-[#5a5243] mb-8"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Back to Help Center
        </Link>

        {/* Header */}
        <h1 className="text-4xl font-serif font-bold text-[#4a5240] tracking-tight mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Quick answers to the most common questions about using Estuary.
        </p>

        {/* FAQ sections */}
        {sections.map((section) => (
          <div key={section.title} className="mb-10">
            <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-4">
              {section.title}
            </h2>
            <div className="bg-white border border-[#9CAF88]/30 rounded-xl overflow-hidden divide-y divide-[#9CAF88]/10">
              {section.questions.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-[#4a5240] font-medium hover:bg-[#FAF3E0]/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    <span className="pr-4">{faq.q}</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#9CAF88] transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 pb-5 pt-0">
                    <p className="text-sm text-[#7A6F5D] leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Can&apos;t find the answer you are looking for? Our support team is
            here to help.
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
