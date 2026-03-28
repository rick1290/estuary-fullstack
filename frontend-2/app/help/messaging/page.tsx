import Link from "next/link"
import {
  ArrowLeft,
  MessageSquare,
  Inbox,
  Send,
  Users,
  Bell,
} from "lucide-react"

export const metadata = {
  title: "Messaging | Estuary Help",
  description: "Learn how to send and receive messages on Estuary, communicate with practitioners and clients.",
}

export default function MessagingPage() {
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
          Messaging
        </h1>
        <p className="text-olive-500 mb-10">
          How to communicate with practitioners and clients through the Estuary messaging system.
        </p>

        <div className="space-y-10">
          {/* Starting a conversation */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Starting a conversation</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                To start a conversation, go to a booking detail page and click &quot;Message Practitioner&quot; (or &quot;Message Client&quot; if you are a practitioner). This opens a direct message thread between you and the other person. Conversations are always linked to a booking, so both parties have context about the session being discussed.
              </p>
            </div>
          </section>

          {/* Viewing messages */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Inbox className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Viewing your messages</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                All your conversations are accessible from your Dashboard under the Messages tab. Here is what you will see:
              </p>
              <ul className="space-y-2">
                {[
                  "A list of all active conversations, sorted by most recent activity.",
                  "Unread indicators showing which conversations have new messages.",
                  "The name of the person and a preview of the last message in each thread.",
                  "Click on any conversation to open the full message history.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Sending messages */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Sending messages</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Once inside a conversation, type your message in the text box at the bottom and press Send. Messages are delivered instantly. Keep your communication professional and relevant to your booking or session. If you need to share important details like preparation instructions or follow-up notes, messaging is the best way to do it.
              </p>
            </div>
          </section>

          {/* Who can you message */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Who can you message</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <ul className="space-y-2">
                {[
                  "Clients can message practitioners they have an active or past booking with.",
                  "Practitioners can message clients who have booked their services.",
                  "You cannot message someone you do not have a booking relationship with.",
                  "Messaging is available before, during, and after a session.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Message notifications</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                When you receive a new message, you will see an unread indicator in your dashboard. You can also opt in to email notifications for new messages. To configure this, go to Settings and adjust your notification preferences. Email notifications can be turned on or off independently from other notification types.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/notifications"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Managing Notifications
            </Link>
            <Link
              href="/help/sessions"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Your Sessions
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
