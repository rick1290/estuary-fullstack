import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function EarningsHelpPage() {
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
          Earnings & Payouts
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Understand how you earn money on Estuary, track your revenue, and get
          paid through Stripe Connect.
        </p>

        {/* Revenue flow */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            How Revenue Works
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            When a client books one of your services, they pay the full listed
            price. Estuary takes a 5% platform commission and the remaining 95%
            is yours. For example, if you price a session at $100, you earn
            $95.
          </p>
          <div className="bg-[#FAF3E0] rounded-xl p-6 mt-4">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-[#7A6F5D]">Client pays</span>
              <span className="font-semibold text-[#4a5240]">$100.00</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-[#7A6F5D]">
                Estuary commission (5%)
              </span>
              <span className="font-semibold text-[#E07A5F]">- $5.00</span>
            </div>
            <div className="border-t border-[#9CAF88]/20 pt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-[#4a5240]">Your earnings</span>
              <span className="font-bold text-[#4a5240]">$95.00</span>
            </div>
          </div>
        </div>

        {/* Earnings lifecycle */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Earnings Lifecycle
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            Your earnings move through four stages from the moment a client
            books to the money arriving in your bank account.
          </p>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Projected
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Created when a client books your service. This amount
                  represents expected future earnings. Projected earnings are not
                  yet earned because the session has not been delivered. If the
                  client cancels before the session, this amount is removed.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Pending</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  After the session is delivered, your earnings move to
                  &ldquo;Pending&rdquo; status. A 48-hour hold period begins.
                  This hold exists to allow time for any disputes or issues to
                  be raised. During this period, the funds cannot be withdrawn.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Available
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Once the 48-hour hold clears, your earnings become
                  &ldquo;Available.&rdquo; This means the funds are ready to be
                  withdrawn. You can request a payout at any time once you have
                  an available balance.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                4
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Paid</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  After you request a payout, the funds are transferred to your
                  bank account via Stripe Connect. This typically takes 1-3
                  business days depending on your bank. Once complete, the
                  earnings show as &ldquo;Paid&rdquo; in your transaction
                  history.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Commission
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Estuary charges a standard 5% commission on all transactions. This
            covers payment processing, platform maintenance, marketplace
            promotion, and client support. There are no listing fees, monthly
            fees, or hidden charges.
          </p>
          <p className="text-[#7A6F5D] leading-relaxed">
            Commission tiers may vary based on volume. High-volume practitioners
            may qualify for reduced rates. Check your dashboard or contact
            support for details on your current tier.
          </p>
        </div>

        {/* Viewing earnings */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Viewing Your Earnings
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Access your complete financial overview from your Practitioner
            Dashboard. Navigate to{" "}
            <span className="font-medium text-[#4a5240]">
              Dashboard &rarr; Finances &rarr; Overview
            </span>
            .
          </p>
          <ul className="space-y-3 text-sm text-[#7A6F5D]">
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Balance summary:
                </span>{" "}
                See your projected, pending, available, and total paid amounts
                at a glance
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Transaction history:
                </span>{" "}
                View every transaction with dates, amounts, client names, and
                status
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Earnings trends:
                </span>{" "}
                Charts showing your revenue over time, broken down by service
                type
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#9CAF88] font-bold flex-shrink-0">
                &bull;
              </span>
              <span>
                <span className="font-medium text-[#4a5240]">
                  Payout history:
                </span>{" "}
                Record of all completed payouts with dates and amounts
              </span>
            </li>
          </ul>
        </div>

        {/* Requesting payouts */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Requesting Payouts
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            Once you have an available balance, you can request a payout at any
            time. Here is how.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                1
              </div>
              <div>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Go to{" "}
                  <span className="font-medium text-[#4a5240]">
                    Dashboard &rarr; Finances &rarr; Payouts
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                2
              </div>
              <div>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Review your available balance and click &ldquo;Request
                  Payout&rdquo;
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                3
              </div>
              <div>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Confirm the amount. The full available balance will be
                  transferred to your connected bank account via Stripe.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                4
              </div>
              <div>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Funds typically arrive in your bank account within 1-3
                  business days, depending on your bank.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Connect */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Stripe Connect
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Estuary uses Stripe Connect to handle all practitioner payouts.
            Stripe is a globally trusted payment platform used by millions of
            businesses. Here is why it matters and how to set it up.
          </p>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              Why Stripe Connect:
            </span>{" "}
            It enables secure, compliant transfers directly to your bank
            account. Stripe handles identity verification, tax reporting (1099
            forms in the US), and regulatory compliance so you do not have to.
          </p>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              Setting up Stripe:
            </span>{" "}
            During onboarding, you will be redirected to Stripe to create or
            connect your account. You will need to provide your legal name,
            date of birth, address, and bank account details. Verification is
            usually instant but may take up to 24 hours in some cases.
          </p>
          <p className="text-[#7A6F5D] leading-relaxed">
            <span className="font-medium text-[#4a5240]">
              Managing your Stripe account:
            </span>{" "}
            You can access your Stripe dashboard at any time from your Estuary
            settings to update banking details, view Stripe&apos;s own
            transaction records, or download tax documents.
          </p>
        </div>

        {/* When you get paid */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            When You Get Paid
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Here is the complete timeline from a client booking to money in your
            bank account:
          </p>
          <div className="bg-[#FAF3E0] rounded-xl p-6">
            <div className="space-y-4 text-sm">
              <div className="flex gap-4">
                <span className="font-medium text-[#4a5240] whitespace-nowrap w-36">
                  Client books
                </span>
                <span className="text-[#7A6F5D]">
                  Earnings created as &ldquo;Projected&rdquo;
                </span>
              </div>
              <div className="flex gap-4">
                <span className="font-medium text-[#4a5240] whitespace-nowrap w-36">
                  Session delivered
                </span>
                <span className="text-[#7A6F5D]">
                  Earnings move to &ldquo;Pending&rdquo; + 48-hour hold begins
                </span>
              </div>
              <div className="flex gap-4">
                <span className="font-medium text-[#4a5240] whitespace-nowrap w-36">
                  48 hours later
                </span>
                <span className="text-[#7A6F5D]">
                  Earnings become &ldquo;Available&rdquo; for payout
                </span>
              </div>
              <div className="flex gap-4">
                <span className="font-medium text-[#4a5240] whitespace-nowrap w-36">
                  You request payout
                </span>
                <span className="text-[#7A6F5D]">
                  Transfer initiated via Stripe Connect
                </span>
              </div>
              <div className="flex gap-4">
                <span className="font-medium text-[#4a5240] whitespace-nowrap w-36">
                  1-3 business days
                </span>
                <span className="text-[#7A6F5D]">
                  Funds arrive in your bank account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Questions about earnings or payouts? Our finance support team is
            here to assist.
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
