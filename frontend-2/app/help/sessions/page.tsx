import Link from "next/link"
import {
  ArrowLeft,
  Monitor,
  Camera,
  MapPin,
  PlayCircle,
  CalendarClock,
  AlertTriangle,
} from "lucide-react"

export const metadata = {
  title: "Your Sessions | Estuary Help",
  description: "How to join video sessions, prepare for in-person visits, access recordings, and reschedule on Estuary.",
}

export default function SessionsPage() {
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
          Your Sessions
        </h1>
        <p className="text-olive-500 mb-10">
          Everything you need to know about joining, attending, and managing your booked sessions.
        </p>

        <div className="space-y-10">
          {/* How to Join */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">How to join a session</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6 space-y-4">
              <div className="space-y-3">
                {[
                  { step: "1", text: "Go to My Journeys in your dashboard. You'll see all your upcoming sessions listed with dates and times." },
                  { step: "2", text: "Click on the session you want to join. A \"Join Session\" button appears 15 minutes before the scheduled start time." },
                  { step: "3", text: "Clicking the button takes you to the session lobby, where you can check your camera and microphone before entering." },
                  { step: "4", text: "When you're ready, click \"Enter Room\" to join the live video session with your practitioner." },
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

          {/* Virtual Sessions */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Virtual sessions</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-4">
                Estuary uses LiveKit for video sessions, which runs directly in your browser — no downloads or plugins required.
              </p>
              <h3 className="text-sm font-medium text-olive-700 mb-2">Before your session</h3>
              <ul className="space-y-2 mb-4">
                {[
                  "Use a modern browser (Chrome, Firefox, Safari, or Edge) for the best experience.",
                  "Find a quiet space with good lighting and a stable internet connection.",
                  "Allow camera and microphone permissions when your browser prompts you.",
                  "The lobby lets you preview your video and audio before entering the room.",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
              <h3 className="text-sm font-medium text-olive-700 mb-2">During your session</h3>
              <ul className="space-y-2">
                {[
                  "You can toggle your camera and microphone on or off at any time.",
                  "If you experience connection issues, try refreshing the page or reconnecting.",
                  "The session ends when the practitioner closes the room or the scheduled time expires.",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* In-Person */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">In-person sessions</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                For in-person sessions, the practitioner's address or venue is shown on your booking detail page. You can find this by going to My Journeys and clicking on the session. Arrive a few minutes early so you have time to settle in. If you need directions or have trouble finding the location, you can message your practitioner directly through the platform.
              </p>
            </div>
          </section>

          {/* Recordings */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Recordings</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                If your practitioner has enabled session recordings, a recording will be available after the session ends. You can access it from your journey detail page under the completed session. Not all practitioners record sessions — if recording is important to you, check with your practitioner beforehand. Recordings are private and only visible to you and your practitioner.
              </p>
            </div>
          </section>

          {/* Rescheduling */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Rescheduling</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Need to move your session to a different time? You can reschedule as long as it's at least 24 hours before the scheduled start.
              </p>
              <ul className="space-y-2">
                {[
                  "Go to My Journeys and click on the session you'd like to reschedule.",
                  "Click the \"Reschedule\" button and choose a new available time from the practitioner's calendar.",
                  "Your original time slot is released and the new time is confirmed immediately.",
                  "You'll receive an updated confirmation email with the new details.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* No-Shows */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-olive-500" />
              <h2 className="text-lg font-medium text-olive-800">No-shows</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                If you miss a session without cancelling or rescheduling in advance, it is treated as a no-show. No-show sessions are not eligible for a refund. If something unexpected came up, reach out to your practitioner directly — they may be willing to reschedule at their discretion. Repeated no-shows may affect your ability to book with certain practitioners.
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
              href="/help/cancellations"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Cancellations & Refunds
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
