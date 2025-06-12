"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import LoginModal from "@/components/auth/login-modal"

interface CourseBookingPanelProps {
  course: any
}

export default function CourseBookingPanel({ course }: CourseBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleEnrollClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    // Redirect to checkout page with course details
    router.push(`/checkout?serviceId=${course.id}&type=course`)
  }

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectUrl={`/checkout?serviceId=${course.id}&type=course`}
        serviceType="course"
      />

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          {/* Price Display */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium text-gray-900">${course.price}</span>
              <span className="text-gray-600">/ course</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{course.duration} • {course.sessionCount} sessions</p>
          </div>

          {/* Course Details */}
          <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Duration</span>
              <span className="font-medium text-gray-900">{course.duration}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sessions</span>
              <span className="font-medium text-gray-900">{course.sessionCount} sessions</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Format</span>
              <span className="font-medium text-gray-900">{course.location}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Level</span>
              <span className="font-medium text-gray-900">Beginner Friendly</span>
            </div>
          </div>

          <Button 
            className="w-full py-6 text-base font-medium" 
            onClick={handleEnrollClick}
          >
            Enroll in Course
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            Full refund available until course starts
          </p>
        </CardContent>
      </Card>
    </>
  )
}
