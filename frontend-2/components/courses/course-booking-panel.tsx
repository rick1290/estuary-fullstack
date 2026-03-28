"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MapPin, Calendar, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"

interface CourseBookingPanelProps {
  course: any
  serviceData?: any
  compact?: boolean
}

export default function CourseBookingPanel({ course, serviceData, compact }: CourseBookingPanelProps) {
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

  const imageUrl = course.image

  return (
    <div className={`w-full bg-white overflow-hidden ${compact ? '' : 'rounded-2xl border border-sage-200/60'}`}>
      {!compact && (
        <div className="relative">
          <div className="aspect-[4/3] w-full">
            {imageUrl ? (
              <img src={imageUrl} alt={course.title || 'Course'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cream-100 via-sage-50 to-terracotta-50" />
            )}
          </div>
          <div className="absolute bottom-4 left-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-olive-900">${course.price}</span>
                <span className="text-[11px] font-light text-olive-500">complete course</span>
              </div>
              <p className="text-[10px] font-light text-olive-500 mt-0.5">{course.sessionCount} sessions included</p>
            </div>
          </div>
        </div>
      )}
      <div className="p-8">
        {/* Course Quick Info */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
              <span className="text-olive-600 font-light">Live Sessions</span>
            </div>
            <span className="font-medium text-olive-900">{course.sessionCount}</span>
          </div>
          {course.firstSessionDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-600 font-light">Starts</span>
              </div>
              <span className="font-medium text-olive-900">
                {new Date(course.firstSessionDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
          {course.lastSessionDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-600 font-light">Ends</span>
              </div>
              <span className="font-medium text-olive-900">
                {new Date(course.lastSessionDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
              <span className="text-olive-600 font-light">Format</span>
            </div>
            <span className="font-medium text-olive-900">{course.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
              <span className="text-olive-600 font-light">Location</span>
            </div>
            <span className="font-medium text-olive-900 text-right">
              {serviceData?.location_type === 'virtual'
                ? 'Virtual'
                : serviceData?.practitioner_location
                  ? [
                      serviceData.practitioner_location.city_name,
                      serviceData.practitioner_location.state_code || serviceData.practitioner_location.state_name,
                      serviceData.practitioner_location.country_code !== 'US' && serviceData.practitioner_location.country_name
                    ].filter(Boolean).join(', ')
                  : course.location
              }
            </span>
          </div>
        </div>

        <Separator className="bg-sage-200 mb-6" />

        <Button
          className="bg-olive-800 hover:bg-olive-700 text-white rounded-full py-5 text-sm font-medium w-full"
          onClick={handleEnrollClick}
          disabled={serviceData?.has_ended || serviceData?.is_purchasable === false}
        >
          {serviceData?.has_ended ? 'Course Ended' : 'Start Your Journey'}
        </Button>

        <p className="text-sm text-center text-olive-600 mt-4">
          {serviceData?.has_ended
            ? 'This course has already completed'
            : '✓ Instant access • ✓ 30-day guarantee'
          }
        </p>
      </div>
    </div>
  )
}
