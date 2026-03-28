import Link from "next/link"
import {
  ArrowLeft,
  Gift,
  Share2,
  BarChart3,
  Tag,
  Users,
  ShieldCheck,
} from "lucide-react"

export const metadata = {
  title: "Referrals | Estuary Help",
  description: "Learn how the Estuary referral program works, how to invite friends, and earn rewards.",
}

export default function ReferralsPage() {
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
          Referrals
        </h1>
        <p className="text-olive-500 mb-10">
          Invite friends to Estuary and earn rewards when they sign up and make their first purchase.
        </p>

        <div className="space-y-10">
          {/* What is the referral program */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">What is the referral program?</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                The Estuary referral program lets you invite friends to the platform. When someone you refer signs up and makes their first purchase, you both earn rewards. You get $20 in platform credits, and they get $10 applied to their first purchase. It is a simple way to share wellness experiences with people you care about while earning credit toward your own bookings.
              </p>
            </div>
          </section>

          {/* How it works */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">How to invite someone</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-3">
                {[
                  { step: "1", text: "Go to your Dashboard and click on the Referrals tab." },
                  { step: "2", text: "Enter the email address of the person you want to invite." },
                  { step: "3", text: "Click Send Invite. They will receive an email with your unique referral link." },
                  { step: "4", text: "When they sign up and make their first purchase, you both earn credits automatically." },
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

          {/* Tracking referrals */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Tracking your referrals</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                Your referral dashboard shows everything you need to know about your invitations and earnings:
              </p>
              <ul className="space-y-2">
                {[
                  "Total referrals sent — how many invitations you have sent out.",
                  "Converted — how many people signed up and made a purchase.",
                  "Pending — invitations that have been sent but not yet acted on.",
                  "Earnings — the total credits you have earned from successful referrals.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                    <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Your referral code */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Your referral code</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Every Estuary account has a unique referral code. You can find it on your Referrals page. Share this code anywhere — social media, text messages, or in person. When someone signs up using your code, it is automatically linked to your account so you receive credit for the referral.
              </p>
            </div>
          </section>

          {/* For practitioners */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">For practitioners</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <p className="text-[15px] text-olive-600 leading-relaxed">
                Practitioners can also participate in the referral program. Look for the &quot;Earn 20% Referral&quot; option in your practitioner sidebar. The invite flow works the same way — enter an email, send the invite, and earn credits when your referral makes their first purchase.
              </p>
            </div>
          </section>

          {/* Rules */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-sage-600" />
              <h2 className="text-lg font-medium text-olive-800">Referral rules</h2>
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <ul className="space-y-2">
                {[
                  "One referral per email address — you cannot refer the same person twice.",
                  "The referred person must be new to Estuary (no existing account).",
                  "Rewards are issued as platform credits, not cash.",
                  "Credits are added to your account once the referred person completes their first purchase.",
                  "There is no limit to the number of people you can refer.",
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
              href="/help/credits"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Platform Credits
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
