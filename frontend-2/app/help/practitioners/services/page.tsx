import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function ServicesHelpPage() {
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
          Managing Services
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Estuary offers four service types to suit different formats and client
          needs. Here is how each one works and how to create, edit, and manage
          them.
        </p>

        {/* Service types */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Service Types Explained
          </h2>

          <div className="space-y-8">
            <div className="border-b border-[#9CAF88]/10 pb-6">
              <h3 className="text-lg font-semibold text-[#4a5240] mb-2">
                Sessions (1:1)
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed mb-3">
                Individual sessions are the most flexible service type. You set
                the price and duration, then configure your availability. Clients
                browse your open time slots and book the one that works for
                them. Sessions are ideal for coaching, therapy, consultations,
                readings, and any one-on-one interaction.
              </p>
              <ul className="text-sm text-[#7A6F5D] space-y-1">
                <li>
                  <span className="font-medium text-[#4a5240]">You set:</span>{" "}
                  Price, duration, description, and availability
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Clients choose:
                  </span>{" "}
                  An available time slot from your calendar
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Best for:
                  </span>{" "}
                  Personalized, one-on-one work
                </li>
              </ul>
            </div>

            <div className="border-b border-[#9CAF88]/10 pb-6">
              <h3 className="text-lg font-semibold text-[#4a5240] mb-2">
                Workshops
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed mb-3">
                Workshops are group experiences with a specific date and time.
                You set the schedule and maximum capacity. Clients register for
                the specific date and join along with other participants.
                Workshops are great for guided meditations, group discussions,
                skill-building sessions, and interactive experiences.
              </p>
              <ul className="text-sm text-[#7A6F5D] space-y-1">
                <li>
                  <span className="font-medium text-[#4a5240]">You set:</span>{" "}
                  Date, time, price, capacity, and description
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Clients choose:
                  </span>{" "}
                  A specific workshop date to register for
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Best for:
                  </span>{" "}
                  Group experiences and community building
                </li>
              </ul>
            </div>

            <div className="border-b border-[#9CAF88]/10 pb-6">
              <h3 className="text-lg font-semibold text-[#4a5240] mb-2">
                Courses
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed mb-3">
                Courses are multi-session programs with a structured curriculum.
                You define all sessions upfront, including dates, times, and
                topics for each one. Clients enroll in the entire program and
                attend all scheduled sessions. Courses work well for training
                programs, certification tracks, progressive learning journeys,
                and multi-week intensives.
              </p>
              <ul className="text-sm text-[#7A6F5D] space-y-1">
                <li>
                  <span className="font-medium text-[#4a5240]">You set:</span>{" "}
                  Curriculum, full session schedule, price, and capacity
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Clients choose:
                  </span>{" "}
                  To enroll in the complete program
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Best for:
                  </span>{" "}
                  Structured learning and progressive programs
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#4a5240] mb-2">
                Packages
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed mb-3">
                Packages bundle multiple sessions at a discounted rate. You set
                the total price and number of sessions included. Clients
                purchase the package upfront and then schedule each session
                individually at their convenience, choosing from your available
                time slots. Packages encourage commitment and give clients a
                better per-session rate.
              </p>
              <ul className="text-sm text-[#7A6F5D] space-y-1">
                <li>
                  <span className="font-medium text-[#4a5240]">You set:</span>{" "}
                  Number of sessions, package price, and availability
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Clients choose:
                  </span>{" "}
                  When to schedule each individual session
                </li>
                <li>
                  <span className="font-medium text-[#4a5240]">
                    Best for:
                  </span>{" "}
                  Ongoing client relationships and multi-session work
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Creating a service */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Creating a Service
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            Create services from your Practitioner Dashboard by clicking
            &ldquo;Create Service.&rdquo; The guided wizard walks you through
            each step.
          </p>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Basics</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Choose your service type, write a title and description,
                  select the category and modality. A clear, specific title
                  helps clients understand exactly what you offer.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Media</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Upload a cover image and any additional photos or videos.
                  High-quality visuals increase engagement and conversion.
                  Images should be at least 800x600 pixels.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Pricing</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Set your price and, for sessions, the duration. For
                  workshops and courses, set the capacity. Remember that
                  Estuary takes a 5% commission, so your earnings will be 95%
                  of the listed price.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                4
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Availability
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  For sessions and packages, configure your available time
                  slots. For workshops and courses, set specific dates and
                  times. See the{" "}
                  <Link
                    href="/help/practitioners/availability"
                    className="text-[#9CAF88] hover:underline"
                  >
                    Availability & Schedule
                  </Link>{" "}
                  guide for more detail.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                5
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Publish</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Review everything and publish. Your service goes live on the
                  marketplace immediately and clients can start booking right
                  away. You can also save as a draft and publish later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Editing */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Editing a Service
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            You can edit most details of a published service at any time. Go to
            your Practitioner Dashboard, find the service, and click
            &ldquo;Edit.&rdquo; Changes take effect immediately.
          </p>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              What you can change:
            </span>{" "}
            Title, description, media, pricing for future bookings, availability
            settings, and category or modality tags.
          </p>
          <p className="text-[#7A6F5D] leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              What stays the same:
            </span>{" "}
            The service type cannot be changed after creation. If you need a
            different type, create a new service. Price changes do not affect
            existing bookings — clients who already booked keep their original
            price.
          </p>
        </div>

        {/* Deactivating */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Deactivating a Service
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              Temporarily hiding:
            </span>{" "}
            Toggle a service to &ldquo;Inactive&rdquo; from your dashboard. It
            will no longer appear on the marketplace, but existing bookings are
            unaffected. You can reactivate it at any time and it will reappear
            with all its reviews and history intact.
          </p>
          <p className="text-[#7A6F5D] leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              Permanently removing:
            </span>{" "}
            If you want to permanently delete a service, use the
            &ldquo;Delete&rdquo; option. This is irreversible. You must first
            cancel or complete all pending bookings associated with the service.
            We recommend deactivating instead of deleting whenever possible.
          </p>
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Have questions about setting up your services? Our support team is
            here for you.
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
