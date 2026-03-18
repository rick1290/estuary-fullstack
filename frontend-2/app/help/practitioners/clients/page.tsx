import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function ClientsHelpPage() {
  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <div className="container max-w-4xl py-12">
        {/* Back link */}
        <Link
          href="/help/practitioners"
          className="inline-flex items-center text-sm text-[#7A6F5D] hover:text-[#5a5243] mb-8"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Back to Practitioner Guide
        </Link>

        {/* Header */}
        <h1 className="text-4xl font-serif font-bold text-[#4a5240] tracking-tight mb-4">
          Managing Clients
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Keep track of your bookings, communicate with clients, and handle
          scheduling changes with ease.
        </p>

        {/* Viewing bookings */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Viewing Bookings
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Your Client Bookings page shows all reservations across your
            services. Access it from your Practitioner Dashboard under
            &ldquo;Bookings.&rdquo;
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Upcoming:</span>{" "}
                Sessions scheduled for the future, sorted by date. See client
                name, service, time, and session type at a glance.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Past:</span>{" "}
                Completed sessions with history of what was delivered, when, and
                to whom.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Cancelled:</span>{" "}
                Any bookings that were cancelled by you or the client, with the
                cancellation reason and date.
              </span>
            </li>
          </ul>
          <p className="text-sm text-[#7A6F5D] mt-4 leading-relaxed">
            You can filter bookings by service type, date range, or status to
            quickly find what you need.
          </p>
        </div>

        {/* Client profiles */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Client Profiles
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Click on any client name from your bookings to see their profile.
            This gives you context about your relationship with each client.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Booking history:
                </span>{" "}
                See every session this client has booked with you, including
                dates, services, and completion status
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Notes:</span>{" "}
                Add private notes about a client that only you can see. Useful
                for tracking progress, preferences, or session details between
                appointments
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Communication:
                </span>{" "}
                View your full message history with this client in one thread
              </span>
            </li>
          </ul>
        </div>

        {/* Messaging */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Messaging Clients
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Estuary has built-in messaging so you can communicate with clients
            before and after sessions. You do not need to share personal email
            addresses or phone numbers.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Before a session:
                </span>{" "}
                Send preparation instructions, intake forms, or a welcome
                message. Clients can also reach out with questions beforehand.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  After a session:
                </span>{" "}
                Follow up with resources, homework, or next steps. This
                personal touch helps build lasting client relationships.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Notifications:
                </span>{" "}
                You receive email and in-app notifications when a client sends
                you a message, so you never miss an important communication.
              </span>
            </li>
          </ul>
          <p className="text-sm text-[#7A6F5D] mt-4 leading-relaxed">
            Access all your conversations from the &ldquo;Messages&rdquo;
            section in your dashboard. Messages are organized by client for
            easy reference.
          </p>
        </div>

        {/* Cancellations */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Handling Cancellations
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Life happens, and sometimes sessions need to be cancelled. Here is
            how the cancellation policy works for both sides.
          </p>

          <div className="space-y-5">
            <div className="border-b border-[#9CAF88]/10 pb-5">
              <h3 className="font-semibold text-[#4a5240] mb-2">
                When a client cancels
              </h3>
              <ul className="text-sm text-[#7A6F5D] space-y-2">
                <li className="flex gap-2">
                  <span className="text-[#9CAF88] font-bold flex-shrink-0">
                    &bull;
                  </span>
                  <span>
                    <span className="font-medium text-[#4a5240]">
                      More than 24 hours before:
                    </span>{" "}
                    The client receives a full refund. The projected earnings
                    are removed from your balance.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#9CAF88] font-bold flex-shrink-0">
                    &bull;
                  </span>
                  <span>
                    <span className="font-medium text-[#4a5240]">
                      Less than 24 hours before:
                    </span>{" "}
                    No refund is issued. You retain the full earnings as the
                    time slot could not be filled on short notice.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#9CAF88] font-bold flex-shrink-0">
                    &bull;
                  </span>
                  <span>
                    <span className="font-medium text-[#4a5240]">
                      Courses:
                    </span>{" "}
                    Clients can cancel within 14 days of enrollment for a full
                    refund, regardless of when the first session is scheduled.
                    After 14 days, the standard policy applies.
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#4a5240] mb-2">
                When you cancel
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed mb-2">
                If you need to cancel a booking, the client always receives a
                full refund regardless of timing. We understand emergencies
                happen, but frequent cancellations affect your profile
                visibility and client trust.
              </p>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                To cancel, go to the booking in your dashboard and click
                &ldquo;Cancel Booking.&rdquo; You will be asked to provide a
                reason, which helps the client understand and may be shared with
                them. Where possible, offer to reschedule instead of cancelling
                outright.
              </p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Reviews
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            After completing a session, clients can leave a review. Reviews are
            visible on your public profile and service listings. They are one of
            the most important factors in attracting new clients.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Viewing reviews:
                </span>{" "}
                See all your reviews from the &ldquo;Reviews&rdquo; section in
                your dashboard. Each review shows the client&apos;s rating,
                written feedback, the service they booked, and the date.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Responding to reviews:
                </span>{" "}
                You can reply to any review with a public response. This shows
                potential clients that you value feedback and are engaged with
                your community. Keep responses professional and gracious.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Flagging inappropriate reviews:
                </span>{" "}
                If a review contains abusive language or is clearly fraudulent,
                you can flag it for our team to review. We take review integrity
                seriously.
              </span>
            </li>
          </ul>
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Have questions about managing your clients? Our support team is
            ready to assist.
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
