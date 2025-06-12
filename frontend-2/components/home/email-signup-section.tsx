"use client"
import { useState } from "react"
import type React from "react"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function EmailSignupSection() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would send this to your API
    console.log("Email submitted:", email)
    setSubmitted(true)
  }

  return (
    <section className="py-12 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#F8EDE3]/50 blur-3xl top-[10%] right-[-200px] z-0" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[#E3EFE3]/50 blur-3xl bottom-[5%] left-[-100px] z-0" />

      <div className="container relative z-10">
        <Card className="max-w-3xl mx-auto border-[#4A4036]/10 shadow-sm">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-[#4A4036] mb-2">Start Your Journey</h2>
              <p className="text-[#4A4036]/70">
                Join our community and receive personalized recommendations for your wellness journey
              </p>
            </div>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 border-[#4A4036]/20 focus-visible:ring-[#4A4036]/30"
                  />
                  <Button type="submit" className="rounded-full bg-[#4A4036] hover:bg-[#4A4036]/90">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-[#4A4036]/60 text-center">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            ) : (
              <div className="text-center p-4 bg-[#E3EFE3]/50 rounded-lg">
                <p className="text-[#4A6D4A] font-medium">Thank you for joining our community!</p>
                <p className="text-[#4A6D4A]/80 text-sm mt-1">Check your inbox for a welcome email with next steps.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
