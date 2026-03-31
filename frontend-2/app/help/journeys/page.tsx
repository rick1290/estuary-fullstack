import Link from "next/link"
import {
  ArrowLeft,
  Map,
  User,
  Users,
  GraduationCap,
  Package,
  BarChart3,
  FileText,
  BookOpen,
  Star,
} from "lucide-react"

export const metadata = {
  title: "My Journey | Estuary Help",
  description: "Understand how Journeys work on Estuary — track progress, write journal entries, and leave reviews.",
}

const journeyTypes = [
  {
    icon: User,
    title: "Session journey",
    description:
      "Created when you book a one-on-one session. Contains the session details, your practitioner's info, and — once completed — the option to write a journal entry and leave a review.",
  },
  {
    icon: Users,
    title: "Workshop journey",
    description:
      "Created when you sign up for a group workshop. Shows the event date, time, and description. After the workshop, you can reflect on the experience in your journal.",
  },
  {
    icon: GraduationCap,
    title: "Course journey",
    description:
      "Created when you enroll in a multi-session course. Tracks your progress across all sessions in the program, shows the full schedule, and lets you journal after each individual session.",
  },
  {
    icon: Package,
    title: "Package journey",
    description:
      "Created when you purchase a session bundle. Shows how many sessions are included, how many you've used, and lets you schedule your next session directly from the journey page.",
  },
]

export default function JourneysPage() {
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
          My Journey
        </h1>
        <p className="text-olive-500 mb-10">
          How Journeys work, what they track, and how to use journals and reviews to reflect on your experience.
        </p>

        <div className="space-y-10">
          {/* What is a Journey */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Map className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">What is a Journey?</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                A Journey is your personal record of a service you've purchased on Estuary. Every time you book a session, workshop, course, or package, a new Journey is created in your dashboard under "My Journey."
              </p>
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Think of it as a living document for your wellness experience. It holds everything related to that booking — the schedule, your practitioner's details, session recordings (if available), your journal entries, and your review. Journeys stay in your account even after a service is completed, so you can always look back on your progress.
              </p>
            </div>
          </section>

          {/* Journey Types */}
          <section>
            <h2 className="text-lg font-medium text-olive-800 mb-4">Types of Journeys</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {journeyTypes.map((type) => {
                const Icon = type.icon
                return (
                  <div
                    key={type.title}
                    className="bg-white border border-sage-200/60 rounded-xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-sage-100/80 rounded-lg p-2 text-sage-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-[15px] font-medium text-olive-800">
                        {type.title}
                      </h3>
                    </div>
                    <p className="text-sm text-olive-600 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Tracking Progress */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Tracking progress</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                For courses and packages, your Journey includes a progress indicator that shows how far along you are.
              </p>
              <ul className="space-y-2">
                {[
                  "Courses show a progress bar based on how many sessions you've attended out of the total.",
                  "Packages display how many sessions you've used versus how many remain in your bundle.",
                  "Completed sessions are marked with a checkmark, and upcoming ones show the scheduled date and time.",
                  "Your overall Journey status updates automatically — active, in progress, or completed.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Session Details */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Session details</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Click on any Journey to see its full detail page. Here you'll find the session date and time, your practitioner's name and profile link, the service description, any session recordings (if the practitioner enabled them), and links to your journal entries and review. For virtual sessions, the "Join Session" button also appears here when it's time.
              </p>
            </div>
          </section>

          {/* Journal */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Journal entries</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Each Journey includes a private journal where you can write reflections tied to your sessions. Journals are a space to capture your intentions, takeaways, and anything you want to remember.
              </p>
              <ul className="space-y-2">
                {[
                  "Write an entry before a session to set your intention for the experience.",
                  "After a session, capture your reflections, key insights, or action items.",
                  "For courses, you can write a separate entry after each session to track your growth over time.",
                  "Journal entries are completely private — only you can see them.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Reviews */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Leaving a review</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                After a session is completed, you'll see the option to leave a review on your Journey detail page. Reviews help other users make informed decisions and give practitioners valuable feedback.
              </p>
              <ul className="space-y-2">
                {[
                  "Rate your experience on a star scale and write a short description of what stood out.",
                  "Reviews are posted publicly on the practitioner's profile.",
                  "You can edit your review within 7 days of posting it.",
                  "Be honest and constructive — your feedback shapes the Estuary community.",
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
              href="/help/account"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Your Account
            </Link>
            <Link
              href="/help/getting-started"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Getting Started
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
