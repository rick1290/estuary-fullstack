"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { roomsCheckAccessRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle2,
  PenLine,
  Star,
  CalendarPlus,
  MessageSquare,
  ArrowRight,
  StickyNote,
  Clock,
  Video,
  Users,
} from "lucide-react"

export default function PostCallPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { user, isAuthenticated } = useAuth()
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState(60)

  // Fetch room access data to determine role and session info
  const { data: accessData, isLoading } = useQuery({
    ...roomsCheckAccessRetrieveOptions({ path: { public_uuid: roomId } }),
    enabled: !!roomId && isAuthenticated,
  })

  const isHost = accessData?.role === "host"
  const sessionId = accessData?.service_session?.id
  const bookingUuid = (accessData as any)?.my_booking?.public_uuid
  const serviceName = accessData?.service_session?.service?.name || accessData?.service?.name || "Session"
  const practitionerName = accessData?.service_session?.service?.practitioner_name || ""
  const clientName = (accessData as any)?.my_booking?.user?.full_name || ""
  const duration = accessData?.service_session?.duration_minutes || accessData?.service?.duration_minutes
  const wasRecording = accessData?.room?.recording_status === "active" || accessData?.room?.recording_status === "completed"

  // Auto-redirect countdown
  useEffect(() => {
    if (autoRedirectSeconds <= 0) {
      if (isHost) {
        router.push("/dashboard/practitioner")
      } else {
        router.push("/dashboard/user")
      }
      return
    }
    const timer = setTimeout(() => setAutoRedirectSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [autoRedirectSeconds, isHost, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-pulse text-olive-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-100 mb-5">
            <CheckCircle2 className="h-8 w-8 text-sage-700" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-olive-900 mb-2">
            {isHost ? "Session Complete" : "Thank You for Showing Up"}
          </h1>
          <p className="text-olive-500 font-light">
            {isHost
              ? `Your session has been marked as complete.`
              : `Your session with ${practitionerName || "your practitioner"} has ended.`}
          </p>
        </div>

        {/* Session summary */}
        <Card className="mb-6 border-sage-200/60">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center shrink-0">
                <Video className="h-5 w-5 text-sage-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base font-normal text-olive-900 truncate">{serviceName}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-olive-500">
                  {isHost && clientName && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {clientName}
                    </span>
                  )}
                  {!isHost && practitionerName && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {practitionerName}
                    </span>
                  )}
                  {duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {duration} min
                    </span>
                  )}
                </div>
              </div>
            </div>
            {wasRecording && (
              <div className="mt-3 pt-3 border-t border-sage-100">
                <p className="text-xs text-sage-600 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                  Recording saved — available in your dashboard shortly
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {isHost ? (
          /* Practitioner actions */
          <div className="space-y-3">
            {bookingUuid && (
              <Button
                variant="outline"
                className="w-full justify-start h-12 border-sage-200/60 hover:bg-sage-50 text-olive-800"
                asChild
              >
                <Link href={`/dashboard/practitioner/bookings/${bookingUuid}`}>
                  <StickyNote className="h-4 w-4 mr-3 text-sage-600" />
                  Add Session Notes
                  <ArrowRight className="h-4 w-4 ml-auto text-olive-400" />
                </Link>
              </Button>
            )}
            {sessionId && (
              <Button
                variant="outline"
                className="w-full justify-start h-12 border-sage-200/60 hover:bg-sage-50 text-olive-800"
                asChild
              >
                <Link href={`/dashboard/practitioner/sessions/${sessionId}`}>
                  <PenLine className="h-4 w-4 mr-3 text-sage-600" />
                  View Session Details
                  <ArrowRight className="h-4 w-4 ml-auto text-olive-400" />
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start h-12 border-sage-200/60 hover:bg-sage-50 text-olive-800"
              asChild
            >
              <Link href="/dashboard/practitioner/schedule">
                <CalendarPlus className="h-4 w-4 mr-3 text-sage-600" />
                View Upcoming Schedule
                <ArrowRight className="h-4 w-4 ml-auto text-olive-400" />
              </Link>
            </Button>
            <Button
              className="w-full h-12 bg-olive-800 hover:bg-olive-700 text-cream-50"
              asChild
            >
              <Link href="/dashboard/practitioner">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        ) : (
          /* Client actions */
          <div className="space-y-3">
            {bookingUuid && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 border-sage-200/60 hover:bg-sage-50 text-olive-800"
                  asChild
                >
                  <Link href={`/dashboard/user/journeys/${bookingUuid}`}>
                    <Star className="h-4 w-4 mr-3 text-terracotta-500" />
                    Leave a Review
                    <ArrowRight className="h-4 w-4 ml-auto text-olive-400" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 border-sage-200/60 hover:bg-sage-50 text-olive-800"
                  asChild
                >
                  <Link href={`/dashboard/user/journeys/${bookingUuid}#journal`}>
                    <PenLine className="h-4 w-4 mr-3 text-sage-600" />
                    Write a Journal Entry
                    <ArrowRight className="h-4 w-4 ml-auto text-olive-400" />
                  </Link>
                </Button>
              </>
            )}
            {practitionerName && (
              <Button
                variant="outline"
                className="w-full justify-start h-12 border-sage-200/60 hover:bg-sage-50 text-olive-800"
                asChild
              >
                <Link href="/dashboard/user/messages">
                  <MessageSquare className="h-4 w-4 mr-3 text-sage-600" />
                  Message {practitionerName}
                  <ArrowRight className="h-4 w-4 ml-auto text-olive-400" />
                </Link>
              </Button>
            )}
            <Button
              className="w-full h-12 bg-olive-800 hover:bg-olive-700 text-cream-50"
              asChild
            >
              <Link href="/dashboard/user">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        )}

        {/* Auto-redirect notice */}
        <p className="text-center text-xs text-olive-400 mt-6">
          Redirecting to dashboard in {autoRedirectSeconds}s
        </p>
      </div>
    </div>
  )
}
