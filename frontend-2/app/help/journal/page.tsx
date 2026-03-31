import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  PenLine,
  FileEdit,
  ShieldCheck,
  Link2,
  Trash2,
} from "lucide-react"

export const metadata = {
  title: "Your Journal | Estuary Help",
  description: "Learn how to use the Estuary wellness journal to write reflections, intentions, and session takeaways.",
}

export default function JournalPage() {
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
          Your Journal
        </h1>
        <p className="text-olive-500 mb-10">
          A private space to capture your thoughts, intentions, and reflections for each session.
        </p>

        <div className="space-y-10">
          {/* What is the journal */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">What is the journal?</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                The Estuary journal is a private space where you can write reflections, set intentions, and capture key takeaways for each session you attend. It helps you track your personal growth over time by keeping your thoughts organized alongside your bookings. Think of it as your personal wellness diary, linked to your real experiences on the platform.
              </p>
            </div>
          </section>

          {/* Entry types */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Entry types</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                You can create different types of journal entries depending on when and why you are writing:
              </p>
              <div className="space-y-4">
                {[
                  {
                    type: "Intention",
                    description: "Write before a session to set your focus, goals, or what you hope to get out of it.",
                  },
                  {
                    type: "Note",
                    description: "Capture thoughts during or immediately after a session while they are still fresh.",
                  },
                  {
                    type: "Reflection",
                    description: "Look back on a session after some time has passed. Consider what has shifted or stayed with you.",
                  },
                  {
                    type: "Takeaway",
                    description: "Distill the key learnings, insights, or action items from a session.",
                  },
                ].map((item) => (
                  <div key={item.type} className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-sage-100/80 rounded-lg px-2.5 py-1 text-sage-700 text-xs font-medium mt-0.5">
                      {item.type}
                    </div>
                    <p className="text-sm text-olive-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Where to write */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileEdit className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">How to write an entry</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-3">
                {[
                  { step: "1", text: "Go to any session or journey detail page in your dashboard." },
                  { step: "2", text: "Scroll to the \"Your Journal\" section on the page." },
                  { step: "3", text: "Click \"Add Entry\" and select the entry type (Intention, Note, Reflection, or Takeaway)." },
                  { step: "4", text: "Write your thoughts and save. Your entry is linked to that specific session." },
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

          {/* Private */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Privacy</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Your journal entries are completely private. Only you can see what you write — practitioners cannot view your journal entries, and they are never shared with anyone else. This is your personal space for honest reflection without worrying about who might read it.
              </p>
            </div>
          </section>

          {/* Per-session */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Linked to your sessions</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Every journal entry is connected to a specific booking or session. This means you can always go back to a past session and see the thoughts you captured at that time. It creates a personal timeline of your wellness journey, making it easy to track how your perspective and practice evolve over time.
              </p>
            </div>
          </section>

          {/* Deleting entries */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Deleting entries</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                If you want to remove a journal entry, hover over it and click the delete icon. You will be asked to confirm before the entry is permanently removed. Deleted entries cannot be recovered, so be sure before you delete.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/journeys"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              My Journey
            </Link>
            <Link
              href="/help/streams"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Streams
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
