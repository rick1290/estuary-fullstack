import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function GettingStartedPage() {
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
          Getting Started
        </h1>
        <p className="text-lg text-[#7A6F5D] mb-10 max-w-2xl">
          Welcome to Estuary. Here is everything you need to go from application
          to your first booking.
        </p>

        {/* Becoming a practitioner */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Becoming a Practitioner
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            Estuary is a curated marketplace, which means we review every
            application to ensure quality for our community. The process is
            straightforward and most applicants hear back within 48 hours.
          </p>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">Apply</h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Submit your application from the &ldquo;Become a
                  Practitioner&rdquo; page. You will need to share your
                  background, specializations, and any relevant certifications or
                  credentials. There is no cost to apply.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Complete Onboarding
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Once approved, you will be guided through onboarding. This
                  includes filling out your public profile, selecting your
                  specializations and modalities, uploading a professional photo,
                  and writing a bio that tells clients who you are and how you
                  can help.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Set Up Stripe Connect
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Connect your bank account through Stripe so you can receive
                  payouts. Stripe handles all payment processing securely. You
                  will need to verify your identity and provide banking details.
                  This only takes a few minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9CAF88]/20 flex items-center justify-center text-[#4a5240] font-semibold text-sm">
                4
              </div>
              <div>
                <h3 className="font-semibold text-[#4a5240] mb-1">
                  Create Your First Service
                </h3>
                <p className="text-sm text-[#7A6F5D] leading-relaxed">
                  Head to your Practitioner Dashboard and create your first
                  service. Choose from sessions, workshops, courses, or
                  packages. Set your pricing, upload media, configure
                  availability, and publish. Your service will be live on the
                  marketplace immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding details */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Onboarding Steps
          </h2>
          <div className="space-y-5">
            <div className="border-b border-[#9CAF88]/10 pb-5">
              <h3 className="font-semibold text-[#4a5240] mb-1">
                Profile Information
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                Your display name, professional title, location, and a detailed
                bio. This is the first thing clients see, so take time to make it
                compelling. Describe your approach, what clients can expect, and
                what drives your practice.
              </p>
            </div>
            <div className="border-b border-[#9CAF88]/10 pb-5">
              <h3 className="font-semibold text-[#4a5240] mb-1">
                Specializations
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                Select the modalities and wellness areas you practice. This
                helps clients find you through search and category filters on the
                marketplace. You can choose multiple specializations.
              </p>
            </div>
            <div className="border-b border-[#9CAF88]/10 pb-5">
              <h3 className="font-semibold text-[#4a5240] mb-1">
                Credentials
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                List your certifications, training, and relevant experience.
                While not all modalities require formal credentials, sharing your
                background builds trust with potential clients. You can add
                certifying bodies, years of experience, and educational
                background.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#4a5240] mb-1">
                Payment Setup
              </h3>
              <p className="text-sm text-[#7A6F5D] leading-relaxed">
                Connect your Stripe account to receive payouts. This is required
                before you can publish any paid services. Stripe handles all the
                compliance, tax reporting, and secure payment processing on your
                behalf.
              </p>
            </div>
          </div>
        </div>

        {/* Setup checklist */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Setup Checklist
          </h2>
          <p className="text-[#7A6F5D] mb-6 leading-relaxed">
            Use this checklist to make sure you have everything ready before
            going live. Each item contributes to a stronger profile and better
            discovery on the platform.
          </p>
          <ul className="space-y-3">
            {[
              [
                "Professional profile photo",
                "Clients are far more likely to book with practitioners who have a clear, professional headshot.",
              ],
              [
                "Detailed bio (at least 150 words)",
                "A thorough bio helps clients understand your approach and builds confidence in your expertise.",
              ],
              [
                "At least one specialization selected",
                "Specializations power search and discovery. Without them, clients may not find you.",
              ],
              [
                "Credentials and certifications listed",
                "Even informal training or years of personal practice count. Share what makes you qualified.",
              ],
              [
                "Stripe Connect verified",
                "Required for receiving payouts. Verification typically completes within minutes.",
              ],
              [
                "At least one service published",
                "You need a live service for clients to book. Start with what you are most confident offering.",
              ],
              [
                "Availability configured",
                "Set your working hours so clients can see when you are free to book.",
              ],
            ].map(([item, explanation]) => (
              <li key={item} className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-[#9CAF88] mt-0.5" />
                <div>
                  <span className="font-medium text-[#4a5240]">{item}</span>
                  <p className="text-sm text-[#7A6F5D] mt-0.5">{explanation}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Public profile */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Your Public Profile
          </h2>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Your practitioner profile is your storefront on Estuary. Clients see
            it when they browse the marketplace, search for practitioners, or
            click through from a service listing. A complete, polished profile
            significantly increases your booking rate.
          </p>
          <p className="text-[#7A6F5D] mb-4 leading-relaxed">
            Your profile includes your photo, bio, specializations, credentials,
            reviews from past clients, and all of your active services. Clients
            can also see your availability at a glance.
          </p>
        </div>

        {/* Tips */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-6">
            Tips for a Great Profile
          </h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">1.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Use a professional, welcoming photo
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Natural lighting, a warm expression, and a clean background go
                  a long way. Avoid group photos or heavily filtered images.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">2.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Write a detailed, authentic bio
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Share your story, your approach, and what clients can expect
                  from working with you. Write in the first person to feel more
                  personal and approachable.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">3.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  List all relevant credentials
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Even if your practice does not require formal certification,
                  share your training, mentors, and years of experience. Clients
                  value transparency.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">4.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Keep your availability up to date
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Clients are more likely to book when they can see open time
                  slots. Update your schedule regularly and block off any dates
                  you are unavailable.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-[#9CAF88] font-bold">5.</span>
              <div>
                <span className="font-medium text-[#4a5240]">
                  Encourage reviews from satisfied clients
                </span>
                <p className="text-sm text-[#7A6F5D] mt-0.5">
                  Positive reviews are one of the strongest signals for new
                  clients. After a successful session, let clients know that a
                  review helps your practice grow.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Support footer */}
        <div className="bg-white border border-[#9CAF88]/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-serif font-semibold text-[#4a5240] mb-3">
            Still Need Help?
          </h2>
          <p className="text-[#7A6F5D] mb-6 max-w-xl mx-auto">
            Have questions about getting started? Our support team is happy to
            walk you through the process.
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
