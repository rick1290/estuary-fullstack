import Link from "next/link"
import {
  ArrowLeft,
  User,
  Users,
  GraduationCap,
  Package,
  ShoppingCart,
  CreditCard,
  Ticket,
  Mail,
} from "lucide-react"

export const metadata = {
  title: "Booking & Payments | Estuary Help",
  description: "Learn about the different service types on Estuary, how to book, and payment options.",
}

const serviceTypes = [
  {
    icon: User,
    title: "Sessions",
    subtitle: "One-on-one",
    description:
      "Private sessions with a practitioner. You choose an available time slot from their calendar, and the session is just between you and them. Ideal for personalized guidance, coaching, or therapy.",
  },
  {
    icon: Users,
    title: "Workshops",
    subtitle: "Group events",
    description:
      "Live group experiences led by a practitioner. Workshops have a set date and time, and multiple participants can attend. Great for exploring new modalities or learning in a community setting.",
  },
  {
    icon: GraduationCap,
    title: "Courses",
    subtitle: "Multi-session programs",
    description:
      "Structured programs that span multiple sessions over weeks. Courses follow a curriculum designed by the practitioner, with a defined start date and schedule. Best for deeper, sustained learning.",
  },
  {
    icon: Package,
    title: "Packages",
    subtitle: "Session bundles",
    description:
      "A bundle of multiple sessions purchased together, often at a discounted rate. You schedule each session individually as you go. Perfect for ongoing work with a practitioner you trust.",
  },
]

const bookingSteps = [
  {
    step: "Browse",
    description: "Find a practitioner or service through the Marketplace. Use filters to narrow by modality, service type, price, or availability.",
  },
  {
    step: "Select",
    description: "Choose the service you want and, if applicable, pick a time slot from the practitioner's calendar. For workshops and courses, the schedule is pre-set.",
  },
  {
    step: "Checkout",
    description: "Review your selection, apply any credits or promo codes, and enter your payment details. Your total is shown before you confirm.",
  },
  {
    step: "Confirmation",
    description: "Once your booking is confirmed, you'll receive an email with all the details — date, time, and how to join. The booking also appears in My Journeys.",
  },
]

export default function BookingPage() {
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

        <h1 className="font-serif text-3xl font-light text-olive-900 mb-2">
          Booking & Payments
        </h1>
        <p className="text-olive-500 mb-10">
          How to book services on Estuary, what payment options are available, and what to expect after checkout.
        </p>

        <div className="space-y-10">
          {/* Service Types */}
          <section>
            <h2 className="text-lg font-medium text-olive-800 mb-4">Service types</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {serviceTypes.map((service) => {
                const Icon = service.icon
                return (
                  <div
                    key={service.title}
                    className="bg-white border border-sage-200/60 rounded-xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-sage-100/80 rounded-lg p-2 text-sage-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-medium text-olive-800">
                          {service.title}
                        </h3>
                        <p className="text-xs text-olive-400">{service.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-sm text-olive-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* How to Book */}
          <section>
            <h2 className="text-lg font-medium text-olive-800 mb-4">How to book</h2>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="space-y-5">
                {bookingSteps.map((item, index) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-sage-100 text-sage-700 font-medium text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-olive-800 mb-1">
                        {item.step}
                      </h3>
                      <p className="text-sm text-olive-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Payment Methods */}
          <section>
            <h2 className="text-lg font-medium text-olive-800 mb-4">Payment methods</h2>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-[15px] font-medium text-olive-800 mb-1">Credit and debit cards</h3>
                  <p className="text-sm text-olive-600 leading-relaxed">
                    We accept Visa, Mastercard, and American Express through Stripe, our secure payment processor. Your card details are encrypted and never stored on our servers.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShoppingCart className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-[15px] font-medium text-olive-800 mb-1">Platform credits</h3>
                  <p className="text-sm text-olive-600 leading-relaxed">
                    If you have credits on your Estuary account (from refunds, gifts, or promotions), they'll be available to apply at checkout. Credits are applied before your card is charged, so you only pay the remaining balance.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Promo Codes */}
          <section>
            <h2 className="text-lg font-medium text-olive-800 mb-4">Promo codes</h2>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Ticket className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                <p className="text-[15px] text-olive-600 leading-relaxed">
                  If you have a promo code, you can enter it during checkout. Look for the "Have a promo code?" link on the checkout page. Enter your code and click Apply — the discount will be reflected in your total before you confirm payment.
                </p>
              </div>
            </div>
          </section>

          {/* Confirmation */}
          <section>
            <h2 className="text-lg font-medium text-olive-800 mb-4">After you book</h2>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[15px] text-olive-600 leading-relaxed mb-3">
                    Once your booking is confirmed, here's what happens:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "You'll receive a confirmation email with the session details, date, time, and a link to join (for virtual sessions).",
                      "The booking appears immediately in your My Journeys dashboard.",
                      "For sessions, you can reschedule up to 24 hours before the start time.",
                      "A reminder email is sent 24 hours and 1 hour before your session.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-400 flex-shrink-0" />
                        <p className="text-sm text-olive-600 leading-relaxed">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
              Next: Attending Your Sessions
            </Link>
            <Link
              href="/help/cancellations"
              className="text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              Cancellations & Refunds
            </Link>
          </div>
          <div className="text-center">
            <p className="text-sm text-olive-400">Still need help?</p>
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
