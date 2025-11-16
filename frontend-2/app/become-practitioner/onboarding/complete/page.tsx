"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Clock, Mail, ArrowRight, Plus, Calendar, Settings } from "lucide-react"

export default function OnboardingCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showConfetti, setShowConfetti] = useState(true)

  const success = searchParams?.get('success')

  useEffect(() => {
    // Clear onboarding data from localStorage
    localStorage.removeItem('practitioner_onboarding')

    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-white">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#9CAF88', '#E07A5F', '#F4A261'][Math.floor(Math.random() * 3)]
              }}
              initial={{ y: -20, opacity: 1 }}
              animate={{
                y: window.innerHeight + 20,
                x: Math.random() * 200 - 100,
                rotate: Math.random() * 360,
                opacity: 0
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                ease: "easeIn"
              }}
            />
          ))}
        </div>
      )}

      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-sage-500 to-terracotta-500 rounded-full flex items-center justify-center shadow-2xl">
            <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-olive-900 mb-4">
            Welcome to Estuary! 🎉
          </h1>
          <p className="text-xl text-olive-600 max-w-2xl mx-auto">
            Your practitioner profile has been submitted and is under review
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-2 border-sage-200 shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <Clock className="h-8 w-8 text-sage-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-olive-900 mb-2">
                    What Happens Next?
                  </h3>
                  <div className="space-y-3 text-olive-700">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-sage-700">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Profile Review</p>
                        <p className="text-sm text-olive-600">Our team will review your application within 24-48 hours</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-sage-700">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Email Notification</p>
                        <p className="text-sm text-olive-600">You'll receive an email once your profile is approved</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-sage-700">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Go Live!</p>
                        <p className="text-sm text-olive-600">Your profile will be visible to clients and you can start accepting bookings</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-sage-50 rounded-lg border border-sage-200">
                <Mail className="h-5 w-5 text-sage-600" />
                <p className="text-sm text-olive-700">
                  <span className="font-medium">Check your email!</span> We've sent a confirmation with next steps.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-olive-900 mb-6 text-center">
            Complete Your Profile
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-sage-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/practitioner?tab=services')}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-6 w-6 text-sage-700" />
                </div>
                <h3 className="font-medium text-olive-900 mb-2">Create Services</h3>
                <p className="text-sm text-olive-600">Add sessions, workshops, or courses to offer</p>
              </CardContent>
            </Card>

            <Card className="border-sage-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/practitioner?tab=schedule')}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-terracotta-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-terracotta-700" />
                </div>
                <h3 className="font-medium text-olive-900 mb-2">Set Your Schedule</h3>
                <p className="text-sm text-olive-600">Configure weekly availability and time slots</p>
              </CardContent>
            </Card>

            <Card className="border-sage-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/practitioner?tab=profile')}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blush-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-6 w-6 text-blush-700" />
                </div>
                <h3 className="font-medium text-olive-900 mb-2">Enhance Profile</h3>
                <p className="text-sm text-olive-600">Add credentials, photos, videos, and more</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => router.push('/dashboard/practitioner')}
            className="px-12 py-6 text-lg bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-xl"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="mt-4 text-sm text-olive-500">
            Need help?{" "}
            <a href="mailto:support@estuary.com" className="text-sage-600 hover:underline">
              Contact Support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
