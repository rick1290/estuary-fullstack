import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCheck,
  Mail,
  Clock,
  Briefcase,
} from "lucide-react"

export const metadata = {
  title: "Notifications | Estuary Help",
  description: "Learn how to manage your notifications, email preferences, and reminders on Estuary.",
}

export default function NotificationsPage() {
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

        <h1 className="font-serif text-3xl font-normal text-olive-900 mb-2">
          Notifications
        </h1>
        <p className="text-olive-500 mb-10">
          How to stay informed about your bookings, messages, and account activity on Estuary.
        </p>

        <div className="space-y-10">
          {/* Notification types */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BellRing className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Types of notifications</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Estuary sends notifications to keep you updated on important activity:
              </p>
              <ul className="space-y-2">
                {[
                  "Booking confirmations — when you successfully book a service.",
                  "Session reminders — sent 24 hours and 30 minutes before your session.",
                  "Cancellations — when a booking is cancelled by you or the practitioner.",
                  "Payment receipts — confirmation of charges and refunds.",
                  "Messages — when someone sends you a new message.",
                  "Reviews — when a client leaves a review (for practitioners).",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Notification bell */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">The notification bell</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                The bell icon in the top navigation bar shows your recent notifications. A badge appears when you have unread notifications. Click the bell to see a dropdown of your latest activity. Each notification links to the relevant page — for example, clicking a booking confirmation takes you to that booking&apos;s detail page.
              </p>
            </div>
          </section>

          {/* Mark as read */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCheck className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Managing notifications</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <ul className="space-y-2">
                {[
                  "Click on any notification to mark it as read and navigate to the related page.",
                  "Use the \"Mark all read\" option to clear all unread notifications at once.",
                  "Notifications are kept in your history so you can refer back to them later.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Email preferences */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Email preferences</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                You can control which notifications are also sent to your email. Go to Settings, then the Notifications section, to toggle individual email notifications on or off. Options include:
              </p>
              <ul className="space-y-2">
                {[
                  "Booking confirmations and updates.",
                  "Session reminders (24 hours and 30 minutes before).",
                  "New messages from practitioners or clients.",
                  "Payment and refund receipts.",
                  "Marketing and promotional emails.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Booking reminders */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Booking reminders</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Estuary automatically sends you reminders before your upcoming sessions. You will receive a reminder 24 hours before and another 30 minutes before the session starts. These reminders include the session details and a direct link to join. Reminders are sent both as in-app notifications and via email (if enabled in your settings).
              </p>
            </div>
          </section>

          {/* Practitioner notifications */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Practitioner notifications</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Practitioners receive additional notification types related to their practice:
              </p>
              <ul className="space-y-2">
                {[
                  "New bookings — when a client books one of your services.",
                  "Cancellations — when a client cancels a booking.",
                  "Client messages — when a client sends you a message.",
                  "Earnings summaries — periodic updates on your earnings and payouts.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/messaging"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Messaging
            </Link>
            <Link
              href="/help/account"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Your Account
            </Link>
          </div>
          <div className="text-center">
            <p className="text-sm text-olive-500">Still need help?</p>
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
