"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Benefits list
const BENEFITS = [
  "Share your expertise with a growing community",
  "Flexible scheduling that works with your life",
  "Powerful tools to manage your practice",
  "Connect with clients who value your work",
]

export default function BecomePractitionerSection() {
  return (
    <section className="py-12 bg-[#F8F5F1] relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 bg-[url('/decorative-pattern.svg')] bg-repeat opacity-[0.03] z-0" />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-2xl font-bold tracking-tight text-[#4A4036] mb-4">
              Share Your Gifts as a Practitioner
            </h2>
            <p className="text-[#4A4036]/80 mb-6">
              Join our community of healers, coaches, and guides. Create meaningful connections and grow your practice
              on your terms.
            </p>

            <ul className="space-y-3 mb-6">
              {BENEFITS.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-[#9A6D38] mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-[#4A4036]/80">{benefit}</span>
                </li>
              ))}
            </ul>

            <Button className="rounded-full bg-[#9A6D38] hover:bg-[#9A6D38]/90" asChild>
              <Link href="/become-practitioner">
                Apply to Join
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/practitioner-coaching-session.png"
                alt="Practitioners in a coaching session"
                fill
                style={{ objectFit: "cover" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#4A4036]/40 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
