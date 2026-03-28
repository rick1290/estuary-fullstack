import Link from "next/link"
import {
  ArrowLeft,
  Coins,
  Gift,
  ShoppingCart,
  History,
  RotateCcw,
  Clock,
  Ban,
} from "lucide-react"

export const metadata = {
  title: "Platform Credits | Estuary Help",
  description: "Learn how Estuary platform credits work, how to earn them, and how to use them for bookings.",
}

export default function CreditsPage() {
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
          Platform Credits
        </h1>
        <p className="text-olive-500 mb-10">
          How credits work on Estuary — earning, spending, and managing your balance.
        </p>

        <div className="space-y-10">
          {/* What are credits */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">What are credits?</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Credits are a digital balance on your Estuary account that work like cash for bookings. They can be used to pay for sessions, workshops, courses, and packages on the platform. Credits are displayed in your account as a dollar amount and are applied to purchases at checkout.
              </p>
            </div>
          </section>

          {/* How to get credits */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">How to get credits</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                There are several ways to add credits to your account:
              </p>
              <ul className="space-y-2">
                {[
                  "Purchase credits directly — add funds to your Estuary balance through your account settings.",
                  "Referral rewards — earn $20 in credits when someone you refer makes their first purchase.",
                  "Refunds — when you cancel a booking, the refund is issued as platform credits.",
                  "Promotions — occasional promotional campaigns may award bonus credits.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Using credits */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Using credits at checkout</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                When you check out for a booking, you will see an &quot;Apply Credits&quot; toggle if you have a credit balance. Enable it to apply your available credits toward the purchase. Credits are used first, and any remaining balance is charged to your payment method. If your credits cover the full amount, no card charge is needed.
              </p>
            </div>
          </section>

          {/* Viewing balance */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Viewing your balance</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                To check your credit balance and transaction history, go to Settings and select the Credits tab. You will see your current balance along with a detailed history of how credits were earned and spent — including dates, amounts, and descriptions for each transaction.
              </p>
            </div>
          </section>

          {/* Refunds */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Refunds and credits</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                When you cancel an eligible booking, the refund is issued as platform credits rather than a refund to your original payment method. This allows you to rebook a different service immediately without waiting for a bank refund to process. The credits appear in your balance right away.
              </p>
            </div>
          </section>

          {/* Expiration */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Credit expiration</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Standard platform credits do not expire. Your balance stays available for as long as your account is active. However, promotional credits received as part of a specific campaign may have an expiration date, which will be clearly stated at the time the credits are issued.
              </p>
            </div>
          </section>

          {/* Can't cash out */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Ban className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Important to know</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Credits can only be used for Estuary services — they cannot be cashed out, transferred to another user, or refunded to a bank account. They are non-transferable and tied to your Estuary account.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-sage-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Link
              href="/help/referrals"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Referrals
            </Link>
            <Link
              href="/help/booking"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Booking & Payments
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
