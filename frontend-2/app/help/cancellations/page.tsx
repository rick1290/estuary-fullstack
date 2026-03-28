import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  UserX,
  XCircle,
  GraduationCap,
  Package,
  Wallet,
  Timer,
} from "lucide-react"

export const metadata = {
  title: "Cancellations & Refunds | Estuary Help",
  description: "Estuary's cancellation policy, how refunds work, and what to expect for sessions, courses, and packages.",
}

export default function CancellationsPage() {
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
          Cancellations & Refunds
        </h1>
        <p className="text-olive-500 mb-10">
          Our cancellation policy, how to cancel a booking, and where your refund goes.
        </p>

        <div className="space-y-10">
          {/* Cancellation Policy */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Cancellation policy</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-sage-100">
                  <div className="flex-shrink-0 px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-medium">
                    24+ hours before
                  </div>
                  <p className="text-[15px] text-olive-600 leading-relaxed">
                    Full refund. Cancel any time up to 24 hours before your scheduled session and you'll receive a complete refund in platform credits.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 px-3 py-1 rounded-full bg-olive-100 text-olive-600 text-xs font-medium">
                    Less than 24 hours
                  </div>
                  <p className="text-[15px] text-olive-600 leading-relaxed">
                    No refund. Cancellations made within 24 hours of the session start time are not eligible for a refund. This protects practitioners who have reserved that time for you.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Practitioner Cancellations */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <UserX className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Practitioner cancellations</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                If a practitioner cancels your session for any reason, you will always receive a full refund — regardless of when the cancellation happens. You'll be notified by email immediately and the refund will be added to your credit balance. You can use those credits to rebook with the same practitioner or try someone new.
              </p>
            </div>
          </section>

          {/* How to Cancel */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">How to cancel a booking</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-3">
                {[
                  { step: "1", text: "Go to My Journeys in your dashboard and find the booking you'd like to cancel." },
                  { step: "2", text: "Click on the booking to open its detail page." },
                  { step: "3", text: "Click the \"Cancel\" button. You'll see a confirmation dialog." },
                  { step: "4", text: "Select a reason for cancelling (optional but helpful for practitioners) and confirm." },
                  { step: "5", text: "If eligible, your refund is applied immediately as platform credits." },
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

          {/* Courses */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Cancelling a course</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Courses can be cancelled within 14 days of the first session. If you cancel within this window, you'll receive a full refund as platform credits. After the 14-day window, courses are non-refundable because the practitioner has committed resources to the full program. If a course is cancelled by the practitioner, you'll receive a prorated refund for any remaining sessions.
              </p>
            </div>
          </section>

          {/* Packages */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Cancelling a package</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                With packages (session bundles), any sessions you've already completed are not refundable. If you cancel the package, the remaining unused sessions will be refunded as platform credits. The refund amount is calculated based on the per-session rate of the package.
              </p>
            </div>
          </section>

          {/* Where Refund Goes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Where your refund goes</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Refunds on Estuary are issued as platform credits, not back to your original payment method. Credits are added to your account balance and can be used toward any future booking on the platform. You can view your credit balance and transaction history in Settings under Credits.
              </p>
            </div>
          </section>

          {/* Processing Time */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Timer className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Processing time</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Credit refunds are processed immediately. As soon as you confirm the cancellation, the credits appear in your account balance. There's no waiting period — you can use them right away to book a new session.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/sessions"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Your Sessions
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
