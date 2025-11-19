"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface CourseBookingPanelProps {
  course: any
}

export default function CourseBookingPanel({ course }: CourseBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  const handleEnrollClick = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${course.id}&type=course`,
        serviceType: "course",
        title: "Sign in to Enroll in Course",
        description: "Please sign in to enroll in this transformative course"
      })
      return
    }

    // Redirect to checkout page with course details
    router.push(`/checkout?serviceId=${course.id}&type=course`)
  }

  return (
    <Card className="border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-terracotta-100 to-sage-100 p-8 text-center">
          <p className="text-sm text-olive-700 mb-2">Transform Your Knowledge</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-olive-900">${course.price}</span>
            <span className="text-olive-700">complete course</span>
          </div>
          <p className="text-sm text-olive-600 mt-2">{course.sessionCount} transformative sessions</p>
        </div>
        <CardContent className="p-8">
          {/* Course Quick Info */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Live Sessions</span>
              </div>
              <span className="font-semibold text-olive-900">{course.sessionCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Format</span>
              </div>
              <span className="font-semibold text-olive-900">{course.location}</span>
            </div>
          </div>

          <Separator className="bg-sage-200 mb-6" />

          <Button 
            className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
            onClick={handleEnrollClick}
            size="lg"
          >
            Start Your Journey
          </Button>

          <p className="text-sm text-center text-olive-600 mt-4">
            ✓ Instant access • ✓ 30-day guarantee
          </p>
        </CardContent>
      </Card>
  )
}
