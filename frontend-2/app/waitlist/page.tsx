"use client"

import type React from "react"
import { useState } from "react"
import { BackgroundBeams } from "@/components/ui/background-beams"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function WaitlistPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      // Here you would typically send the email to your backend
      console.log("Email submitted:", email)
      setSubmitted(true)
      setEmail("")
    }
  }

  return (
    <div className="h-screen w-full bg-background relative flex flex-col items-center justify-center antialiased overflow-hidden">
      <div className="max-w-3xl mx-auto p-4 relative z-10">
        <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-estuary-600 to-wellness-600 mb-6">
          Join the Estuary Waitlist
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto my-4 text-center relative z-10">
          Be the first to experience our holistic wellness platform connecting practitioners and clients in a nurturing
          digital sanctuary.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
          <div className="bg-background/50 backdrop-blur-sm border border-estuary-100/20 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-estuary-800 mb-3">For Practitioners</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-wellness-600 mr-2 mt-0.5" />
                <span>Showcase your services to a targeted audience</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-wellness-600 mr-2 mt-0.5" />
                <span>Manage bookings and client relationships</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-wellness-600 mr-2 mt-0.5" />
                <span>Grow your practice with our supportive community</span>
              </li>
            </ul>
          </div>

          <div className="bg-background/50 backdrop-blur-sm border border-estuary-100/20 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-estuary-800 mb-3">For Clients</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-wellness-600 mr-2 mt-0.5" />
                <span>Discover diverse wellness services and practitioners</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-wellness-600 mr-2 mt-0.5" />
                <span>Book sessions seamlessly online</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-wellness-600 mr-2 mt-0.5" />
                <span>Access exclusive content and community resources</span>
              </li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex flex-col sm:flex-row gap-2 mt-8 max-w-md mx-auto relative z-10",
            submitted && "opacity-50 pointer-events-none",
          )}
        >
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-background/70 backdrop-blur-sm border-estuary-200"
            disabled={submitted}
          />
          <Button
            type="submit"
            className="h-12 px-8 bg-estuary-900 hover:bg-estuary-800 text-white"
            disabled={submitted}
          >
            {submitted ? <Check className="h-5 w-5 mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
            {submitted ? "Joined" : "Join Now"}
          </Button>
        </form>

        {submitted && (
          <p className="text-wellness-600 text-center mt-4 font-medium">
            Thank you! We'll notify you when Estuary launches.
          </p>
        )}

        <p className="text-sm text-muted-foreground text-center mt-8">
          By joining our waitlist, you'll receive updates about our launch and early access opportunities.
          <br />
          We respect your privacy and will never share your information.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 w-full text-center pb-4 text-sm text-muted-foreground z-10">
        © {new Date().getFullYear()} Estuary. All rights reserved.
      </div>

      <BackgroundBeams className="opacity-40" />
    </div>
  )
}
