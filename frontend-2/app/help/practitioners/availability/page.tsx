import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function AvailabilityHelpPage() {
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
          Availability & Schedule
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Your availability settings control when clients can book with you.
          Keep them up to date so your calendar stays accurate and manageable.
        </p>

        {/* Working hours */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Setting Working Hours
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Your working hours define the recurring weekly schedule that clients
            can book from. Set them from your Practitioner Dashboard under
            &ldquo;Availability.&rdquo;
          </p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Choose your days
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Select which days of the week you are available. You can have
                  different hours on different days. For example, you might work
                  mornings on weekdays and full days on Saturdays.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Set start and end times
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  For each active day, set the time range when you are
                  available. You can add multiple time blocks per day if you
                  need a break in the middle (for example, 9am-12pm and
                  2pm-6pm).
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Save your schedule
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Your working hours repeat every week until you change them.
                  Bookable time slots are generated automatically based on the
                  duration of each service.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Blocking time */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Blocking Time
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Need to take a vacation or block off specific dates? Use the
            &ldquo;Block Time&rdquo; feature in your availability settings.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Block a single date:
                </span>{" "}
                Click on any date in your calendar and mark it as unavailable.
                That day will not show any open slots to clients.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Block a date range:
                </span>{" "}
                Select a start and end date to block an entire period. Useful
                for vacations, conferences, or personal time.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Block specific hours:
                </span>{" "}
                If you only need to block part of a day, you can block a
                specific time range within an otherwise available day.
              </span>
            </li>
          </ul>
          <p className="text-sm text-[#7A6F5D] mt-4 leading-relaxed">
            Blocked time overrides your regular working hours. Existing bookings
            during blocked periods are not automatically cancelled — you will
            need to reschedule or cancel those individually if needed.
          </p>
        </div>

        {/* How clients see availability */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            How Clients See Your Availability
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            When a client views your session or package service, they see a
            calendar with available time slots. These slots are generated
            automatically from your working hours, minus any blocked time and
            existing bookings.
          </p>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            For example, if you set working hours from 9am to 5pm and have a
            60-minute session service, clients will see slots at 9:00, 10:00,
            11:00, and so on — minus any times that are already booked or
            blocked.
          </p>
          <p className="text-[#7A6F5D] leading-relaxed">
            Workshops and courses display their specific scheduled dates and
            times rather than generating slots from your working hours.
          </p>
        </div>

        {/* Timezone handling */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Timezone Handling
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Estuary automatically handles timezones so you and your clients
            always see the correct local time.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Your schedule:
                </span>{" "}
                All times in your dashboard and availability settings are shown
                in your configured timezone. Set your timezone in your account
                settings.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Client view:
                </span>{" "}
                Clients see your available slots converted to their local
                timezone. A 2:00 PM slot in your timezone might appear as 5:00
                PM for a client three hours ahead.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Booking confirmations:
                </span>{" "}
                Email confirmations include the time in both your timezone and
                the client&apos;s timezone to avoid confusion.
              </span>
            </li>
          </ul>
        </div>

        {/* Calendar view */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Calendar View
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Your Practitioner Dashboard includes a calendar view where you can
            see all your booked sessions, workshops, and course sessions in one
            place. This gives you a complete picture of your schedule.
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Day view:</span>{" "}
                See all sessions for a specific day with times and client names
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Week view:</span>{" "}
                Get an overview of your entire week at a glance
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">Month view:</span>{" "}
                See your schedule across the full month, with indicators for
                booked and available days
              </span>
            </li>
          </ul>
          <p className="text-sm text-[#7A6F5D] mt-4 leading-relaxed">
            Click on any booking in your calendar to see details, message the
            client, or manage the session.
          </p>
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Need assistance with your availability settings? Our support team
            can help.
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
