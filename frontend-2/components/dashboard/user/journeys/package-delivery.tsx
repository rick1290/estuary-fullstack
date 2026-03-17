"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  bookingsRetrieveOptions,
  bookingsListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { conversationsCreate, conversationsList } from "@/src/client"
import type { BookingListReadable, JourneyDetail } from "@/src/client/types.gen"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  CalendarPlus,
  CheckCircle,
  FileText,
  Film,
  User,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Package,
  Star,
} from "lucide-react"
import {
  format,
  parseISO,
  isFuture,
  differenceInMinutes,
  differenceInDays,
} from "date-fns"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageDeliveryProps {
  bookingUuid: string
  journeyData?: JourneyDetail
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PackageDeliverySkeleton() {
  return (
    <div className="space-y-0">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-sage-50 via-cream-50 to-olive-50/30 px-8 py-12 pb-16">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 bg-sage-200/40 rounded-full" />
            <Skeleton className="h-6 w-28 bg-sage-200/40 rounded-full" />
          </div>
          <Skeleton className="h-12 w-3/4 bg-sage-200/40" />
          <Skeleton className="h-5 w-48 bg-sage-200/40" />
          <div className="flex gap-1.5 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-3 rounded-full bg-sage-200/40" />
            ))}
          </div>
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-5 w-28 bg-sage-200/40" />
            <Skeleton className="h-5 w-20 bg-sage-200/40" />
            <Skeleton className="h-5 w-32 bg-sage-200/40" />
          </div>
        </div>
      </div>
      {/* Body skeleton */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="pt-8 pb-16 space-y-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="pt-8 pb-16 space-y-4">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PackageDelivery({ bookingUuid, journeyData }: PackageDeliveryProps) {
  const router = useRouter()

  // Fetch the initial booking by uuid
  const {
    data: booking,
    isLoading: isLoadingBooking,
    error: bookingError,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingUuid } }),
  })

  // Fetch ALL bookings for the same user to find siblings from same service/package
  const {
    data: allBookingsData,
    isLoading: isLoadingAll,
  } = useQuery({
    ...bookingsListOptions({
      query: {
        ordering: "-created_at",
        page_size: 200,
      },
    }),
    enabled: !!booking,
  })

  // Filter bookings belonging to the same service (package siblings)
  const packageBookings = useMemo(() => {
    if (!booking?.service?.id || !allBookingsData?.results) return []

    return (allBookingsData.results as BookingListReadable[]).filter(
      (b) =>
        b.service?.id === booking.service?.id &&
        b.status !== "canceled"
    )
  }, [booking, allBookingsData])

  // Sort bookings into three buckets
  const { completed, scheduled, needsScheduling } = useMemo(() => {
    const completedArr: BookingListReadable[] = []
    const scheduledArr: BookingListReadable[] = []
    const needsSchedulingArr: BookingListReadable[] = []

    for (const b of packageBookings) {
      if (b.service_session?.status === "completed") {
        completedArr.push(b)
      } else if (
        b.status === "confirmed" &&
        b.service_session?.start_time &&
        isFuture(parseISO(String(b.service_session.start_time)))
      ) {
        scheduledArr.push(b)
      } else {
        needsSchedulingArr.push(b)
      }
    }

    // Sort scheduled by start_time ascending
    scheduledArr.sort((a, b) => {
      const aTime = new Date(String(a.service_session?.start_time)).getTime()
      const bTime = new Date(String(b.service_session?.start_time)).getTime()
      return aTime - bTime
    })

    // Sort completed by start_time descending
    completedArr.sort((a, b) => {
      const aTime = a.service_session?.start_time
        ? new Date(String(a.service_session.start_time)).getTime()
        : 0
      const bTime = b.service_session?.start_time
        ? new Date(String(b.service_session.start_time)).getTime()
        : 0
      return bTime - aTime
    })

    return {
      completed: completedArr,
      scheduled: scheduledArr,
      needsScheduling: needsSchedulingArr,
    }
  }, [packageBookings])

  const totalCount = packageBookings.length
  const completedCount = completed.length
  const usedCount = completedCount + scheduled.length
  const isPackageComplete = completedCount === totalCount && totalCount > 0

  // Check if a session is joinable (within 15 min of start)
  const isSessionJoinable = (b: BookingListReadable) => {
    const startTime = b.service_session?.start_time
    if (!startTime || (b.status !== "confirmed")) return false
    const start = parseISO(String(startTime))
    const now = new Date()
    const minutesUntil = differenceInMinutes(start, now)
    // Joinable from 15 min before start until session would end
    const duration = b.duration_minutes || 60
    const minutesSinceStart = differenceInMinutes(now, start)
    return minutesUntil <= 15 && minutesSinceStart < duration
  }

  // Get a session number based on order in the full list
  const getSessionNumber = (b: BookingListReadable) => {
    const sorted = [...packageBookings].sort((a, b2) => {
      const aTime = a.service_session?.start_time
        ? new Date(String(a.service_session.start_time)).getTime()
        : Infinity
      const bTime = b2.service_session?.start_time
        ? new Date(String(b2.service_session.start_time)).getTime()
        : Infinity
      return aTime - bTime
    })
    const idx = sorted.findIndex(
      (s) => (s.public_uuid || s.id) === (b.public_uuid || b.id)
    )
    return idx + 1
  }

  // Check expiration (placeholder -- service may have an expiration field)
  const purchasedDate = booking?.created_at
    ? format(parseISO(String(booking.created_at)), "MMM d, yyyy")
    : null

  // Expiration heuristic: if service has metadata, use it. Otherwise show nothing.
  const expirationDate: Date | null = null
  const daysUntilExpiration = expirationDate
    ? differenceInDays(expirationDate, new Date())
    : null
  const isNearingExpiration =
    daysUntilExpiration !== null && daysUntilExpiration < 30 && daysUntilExpiration > 0

  // Message practitioner
  const handleMessagePractitioner = async () => {
    if (!booking?.practitioner?.user_id) {
      toast.error("Unable to message practitioner")
      return
    }

    try {
      const conversationsResponse = await conversationsList()
      const existingConversation = conversationsResponse.data?.results?.find(
        (conv: any) =>
          conv.participants?.some(
            (p: any) => p.user_id === booking.practitioner?.user_id
          )
      )

      if (existingConversation) {
        router.push(
          `/dashboard/user/messages?conversationId=${existingConversation.id}`
        )
        return
      }

      const response = await conversationsCreate({
        body: {
          other_user_id: booking.practitioner.user_id,
          initial_message: `Hi, I have a question about my package "${booking.service?.name}".`,
        },
      })

      if ((response.data as any)?.id) {
        router.push(
          `/dashboard/user/messages?conversationId=${(response.data as any).id}`
        )
      }
    } catch (error: any) {
      console.error("Failed to open conversation:", error)
      toast.error("Unable to open conversation. Please try again.")
    }
  }

  const isLoading = isLoadingBooking || isLoadingAll

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <PackageDeliverySkeleton />
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (bookingError || !booking) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load package details. Please try again later.
          </AlertDescription>
        </Alert>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/user/journeys")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journeys
        </Button>
      </div>
    )
  }

  const service = booking.service
  const practitioner = booking.practitioner
  const remainingCount = totalCount - completedCount
  const locationIsVirtual = service?.location_type === "virtual"

  return (
    <div className="space-y-0">
      {/* ================================================================== */}
      {/* WARM LIGHT HERO SECTION                                            */}
      {/* ================================================================== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sage-50 via-cream-50 to-olive-50/30">
        <div className="relative z-10 px-8 md:px-12 pt-10 pb-16 max-w-6xl mx-auto">
          {/* Back link */}
          <Link
            href="/dashboard/user/journeys"
            className="inline-flex items-center gap-1.5 text-[13px] text-olive-400 hover:text-olive-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Journeys
          </Link>

          <div className="max-w-[660px]">
            {/* Eyebrow badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider bg-sage-100 text-sage-700 rounded-full px-2.5 py-0.5">
                <Package className="w-3 h-3" />
                Package
              </span>
              {totalCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider bg-olive-100 text-olive-700 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-olive-500" />
                  {usedCount} of {totalCount} used
                </span>
              )}
              {isPackageComplete && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider bg-sage-100 text-sage-700 rounded-full px-2.5 py-0.5">
                  <CheckCircle className="w-3 h-3" />
                  Complete
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl md:text-[50px] font-medium text-olive-900 leading-none tracking-tight mb-3.5">
              {service?.name ?? "Package"}
            </h1>

            {/* Practitioner chip */}
            {practitioner?.name && (
              <div className="flex items-center gap-2.5 mb-5">
                <Avatar className="h-7 w-7 border border-sage-300">
                  {practitioner.profile_image_url ? (
                    <AvatarImage
                      src={practitioner.profile_image_url}
                      alt={practitioner.name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-sage-200 text-sage-700 text-xs font-serif italic">
                    {practitioner.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[14px] font-light text-olive-500">
                  with <span className="text-olive-700 font-normal">{practitioner.name}</span>
                </span>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 flex-wrap text-[13px] text-olive-500 mb-5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sage-500" />
                {totalCount} session{totalCount !== 1 ? "s" : ""} total
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sage-500" />
                {remainingCount} remaining
              </span>
              {purchasedDate && (
                <span className="flex items-center gap-1.5">
                  Purchased {purchasedDate}
                </span>
              )}
              {expirationDate && (
                <span className="flex items-center gap-1.5">
                  Expires {format(expirationDate, "MMM d, yyyy")}
                </span>
              )}
            </div>

            {/* Dot progress indicator */}
            {totalCount > 0 && (
              <div
                className="flex items-center gap-1.5"
                aria-label={`${completedCount} of ${totalCount} complete`}
              >
                {Array.from({ length: totalCount }).map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block h-3 w-3 rounded-full transition-colors ${
                      i < completedCount
                        ? "bg-sage-500"
                        : i < usedCount
                          ? "bg-sage-400"
                          : "bg-sage-200"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* TWO-COLUMN BODY                                                    */}
      {/* ================================================================== */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

        {/* ---------------------------------------------------------------- */}
        {/* MAIN COLUMN                                                      */}
        {/* ---------------------------------------------------------------- */}
        <main className="pt-10 pb-16 min-w-0">

          {/* Package complete banner */}
          {isPackageComplete && (
            <div className="flex items-center gap-3 p-5 rounded-xl bg-sage-50 border border-sage-200 mb-10">
              <CheckCircle className="h-5 w-5 text-sage-600 flex-shrink-0" />
              <p className="text-[15px] font-medium text-olive-900">
                Package complete! All {totalCount} sessions have been completed.
              </p>
            </div>
          )}

          {/* ============================================================== */}
          {/* SCHEDULED SESSIONS                                             */}
          {/* ============================================================== */}
          {scheduled.length > 0 && (
            <section className="mb-11">
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Scheduled Sessions
              </div>
              <div className="flex flex-col gap-2.5">
                {scheduled.map((b) => {
                  const startTime = parseISO(String(b.service_session!.start_time))
                  const joinable = locationIsVirtual && isSessionJoinable(b)
                  const sessionNum = getSessionNumber(b)

                  return (
                    <div
                      key={b.public_uuid || b.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 bg-white border border-sage-200/60 rounded-xl hover:border-sage-400 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-olive-900">
                            Session {sessionNum}
                          </p>
                          <p className="text-[12.5px] text-olive-500">
                            {format(startTime, "EEE, MMM d")} &middot;{" "}
                            {format(startTime, "h:mm a")}
                            {b.duration_minutes
                              ? ` \u00B7 ${b.duration_minutes} min`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {joinable && (
                          <Button size="sm" asChild className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4">
                            <Link
                              href={`/dashboard/user/bookings/${b.public_uuid || b.id}`}
                            >
                              <Video className="h-3.5 w-3.5 mr-1.5" />
                              Join
                            </Link>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild className="rounded-full border-sage-200 text-olive-600 hover:border-sage-400 hover:text-olive-800">
                          <Link
                            href={`/dashboard/user/bookings/${b.public_uuid || b.id}`}
                          >
                            {joinable ? "Details" : "Reschedule"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* READY TO SCHEDULE                                              */}
          {/* ============================================================== */}
          {needsScheduling.length > 0 && (
            <section className="mb-11">
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Ready to Schedule
              </div>

              {/* Prominent CTA card */}
              {!isPackageComplete && (
                <div className="flex items-center gap-3 p-5 rounded-xl bg-sage-50 border border-sage-200 mb-4">
                  <CalendarPlus className="h-5 w-5 text-sage-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-olive-900">
                      Schedule Your Next Session
                    </p>
                    <p className="text-[12.5px] text-olive-500">
                      {needsScheduling.length} session{needsScheduling.length !== 1 ? "s" : ""} ready to be scheduled
                    </p>
                  </div>
                  <Button size="sm" asChild className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-4 flex-shrink-0">
                    <Link
                      href={`/dashboard/user/bookings/${needsScheduling[0].public_uuid || needsScheduling[0].id}/schedule`}
                    >
                      Schedule
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {needsScheduling.map((b) => {
                  const sessionNum = getSessionNumber(b)

                  return (
                    <div
                      key={b.public_uuid || b.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 bg-sage-50/50 border border-dashed border-sage-300 rounded-xl hover:border-sage-400 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-block h-2.5 w-2.5 rounded border border-sage-300 flex-shrink-0" />
                        <p className="text-[14px] font-medium text-olive-900">
                          Session {sessionNum}
                        </p>
                      </div>

                      <Button variant="outline" size="sm" asChild className="rounded-full border-sage-300 text-sage-700 hover:border-sage-500 hover:text-sage-800">
                        <Link
                          href={`/dashboard/user/bookings/${b.public_uuid || b.id}/schedule`}
                        >
                          Schedule
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* COMPLETED SESSIONS                                             */}
          {/* ============================================================== */}
          {completed.length > 0 && (
            <section className="mb-11">
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Completed Sessions
              </div>
              <div className="flex flex-col gap-2.5">
                {completed.map((b) => {
                  const sessionNum = getSessionNumber(b)
                  const startTime = b.service_session?.start_time
                    ? parseISO(String(b.service_session.start_time))
                    : null

                  return (
                    <div
                      key={b.public_uuid || b.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 bg-white border border-sage-200/60 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-olive-700">
                            Session {sessionNum}
                          </p>
                          <p className="text-[12.5px] text-olive-500">
                            {startTime
                              ? format(startTime, "EEE, MMM d")
                              : "Completed"}
                            {b.duration_minutes
                              ? ` \u00B7 ${b.duration_minutes} min`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" asChild className="text-[12.5px] text-olive-600 hover:text-olive-800">
                          <Link
                            href={`/dashboard/user/bookings/${b.public_uuid || b.id}`}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            View Notes
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* YOUR PRACTITIONER                                              */}
          {/* ============================================================== */}
          {practitioner && (
            <section className="mb-11">
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Your Practitioner
              </div>
              <div className="bg-white border border-sage-200/60 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-5">
                  <Avatar className="h-14 w-14">
                    {practitioner.profile_image_url ? (
                      <AvatarImage
                        src={practitioner.profile_image_url}
                        alt={practitioner.name ?? "Practitioner"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-sage-200 text-sage-700 font-serif italic text-lg">
                      {practitioner.name?.charAt(0) ?? "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-olive-900">
                      {practitioner.name}
                    </h3>
                    <p className="text-[13px] text-olive-500">
                      {practitioner.bio || "Wellness Practitioner"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1 rounded-full border-sage-200 text-olive-600 hover:border-sage-400 hover:text-olive-800" asChild>
                    <Link
                      href={`/practitioners/${practitioner.slug || practitioner.id}`}
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-sage-200 text-olive-600 hover:border-sage-400 hover:text-olive-800"
                    onClick={handleMessagePractitioner}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* LEAVE A REVIEW (when package complete)                         */}
          {/* ============================================================== */}
          {isPackageComplete && (
            <section className="mb-11">
              <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Share Your Experience
              </div>
              <div className="bg-white border border-sage-200/60 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="h-5 w-5 text-amber-500" />
                  <h3 className="text-[15px] font-medium text-olive-900">
                    How was your experience?
                  </h3>
                </div>
                <p className="text-[13px] text-olive-500 mb-4 leading-relaxed">
                  Your feedback helps other seekers find the right practitioner for their journey.
                </p>
                <Button className="rounded-full bg-sage-600 hover:bg-sage-700 text-white">
                  <Star className="h-4 w-4 mr-2" />
                  Leave a Review
                </Button>
              </div>
            </section>
          )}
        </main>

        {/* ---------------------------------------------------------------- */}
        {/* SIDEBAR                                                          */}
        {/* ---------------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-[58px] pt-8 pb-16 flex flex-col gap-0 self-start">

          {/* ============================================================== */}
          {/* TICKET CARD                                                    */}
          {/* ============================================================== */}
          <div className="bg-white border border-sage-200/60 rounded-xl overflow-visible mb-5">
            {/* Ticket header - KEEP dark */}
            <div className="relative overflow-hidden rounded-t-xl px-5 py-5"
              style={{ background: "linear-gradient(135deg, #1e1508 0%, #2e1f0a 100%)" }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(74,94,74,0.25)_0%,transparent_60%)]" />
              <div className="relative z-10">
                <div className="text-[10px] tracking-[0.12em] uppercase text-[#f5f0e8]/35 mb-1.5">
                  Package
                </div>
                <div className="font-serif text-[20px] font-medium text-[#f5f0e8] leading-tight mb-4">
                  {service?.name ?? "Package"}
                </div>

                {/* Dot progress inside ticket */}
                {totalCount > 0 && (
                  <div className="flex items-center gap-1.5 mb-2">
                    {Array.from({ length: totalCount }).map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block h-2 w-2 rounded-full ${
                          i < completedCount
                            ? "bg-[#4a5e4a] border border-[#6b7f6b]"
                            : i < usedCount
                              ? "bg-[#4a5e4a]/40 border border-[#4a5e4a]/50"
                              : "bg-transparent border border-[#f5f0e8]/20"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <div className="text-[13px] text-[#f5f0e8]/50">
                  {usedCount} of {totalCount} sessions used
                </div>
              </div>
            </div>

            {/* Dashed tear line */}
            <div className="flex items-center -mx-[1px]">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-sage-50 via-cream-50 to-olive-50/30 flex-shrink-0 relative z-10" />
              <div className="flex-1 border-t-[1.5px] border-dashed border-sage-200 mx-1" />
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-sage-50 via-cream-50 to-olive-50/30 flex-shrink-0 relative z-10" />
            </div>

            {/* Ticket stub */}
            <div className="px-5 py-4">
              <div className="flex justify-between items-center py-2 border-b border-sage-200/60 text-[13px]">
                <span className="text-olive-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sage-500" />
                  Total sessions
                </span>
                <span className="font-medium text-olive-900">{totalCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-sage-200/60 text-[13px]">
                <span className="text-olive-500 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-sage-500" />
                  Completed
                </span>
                <span className="font-medium text-olive-900">{completedCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-sage-200/60 text-[13px]">
                <span className="text-olive-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sage-500" />
                  Remaining
                </span>
                <span className="font-medium text-olive-900">{remainingCount}</span>
              </div>
              {purchasedDate && (
                <div className="flex justify-between items-center py-2 border-b border-sage-200/60 text-[13px]">
                  <span className="text-olive-500">Purchased</span>
                  <span className="font-medium text-olive-900">{purchasedDate}</span>
                </div>
              )}
              {expirationDate && (
                <div className="flex justify-between items-center py-2 text-[13px]">
                  <span className={`flex items-center gap-1.5 ${isNearingExpiration ? "text-amber-700" : "text-olive-500"}`}>
                    <AlertCircle className={`w-3.5 h-3.5 ${isNearingExpiration ? "text-amber-600" : "text-sage-500"}`} />
                    Expires
                  </span>
                  <span className={`font-medium ${isNearingExpiration ? "text-amber-700" : "text-olive-900"}`}>
                    {format(expirationDate, "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* EXPIRATION WARNING                                             */}
          {/* ============================================================== */}
          {isNearingExpiration && daysUntilExpiration !== null && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-5 text-[13px] text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Your package expires in <strong>{daysUntilExpiration} day{daysUntilExpiration !== 1 ? "s" : ""}</strong>. Schedule your remaining sessions soon.
              </span>
            </div>
          )}

          {/* ============================================================== */}
          {/* ACTION BUTTONS                                                 */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-2 mb-5">
            {needsScheduling.length > 0 && (
              <Button asChild className="w-full h-[50px] rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium">
                <Link
                  href={`/dashboard/user/bookings/${needsScheduling[0].public_uuid || needsScheduling[0].id}/schedule`}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Schedule Next Session
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full h-[44px] rounded-full border-[1.5px] border-sage-200 text-olive-600 text-[14px] hover:border-sage-400 hover:text-olive-800"
              onClick={handleMessagePractitioner}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Practitioner
            </Button>

            <button
              className="w-full text-center text-[12.5px] text-olive-400 hover:text-red-500 transition-colors py-1.5"
              onClick={() => router.push(`/dashboard/user/bookings/${bookingUuid}`)}
            >
              Cancel Package
            </button>
          </div>

          {/* ============================================================== */}
          {/* SIDEBAR PRACTITIONER CHIP                                      */}
          {/* ============================================================== */}
          {practitioner && (
            <div className="flex items-center gap-3 p-4 bg-white border border-sage-200/60 rounded-xl mb-5">
              <Avatar className="h-11 w-11 flex-shrink-0">
                {practitioner.profile_image_url ? (
                  <AvatarImage
                    src={practitioner.profile_image_url}
                    alt={practitioner.name ?? "Practitioner"}
                  />
                ) : null}
                <AvatarFallback className="bg-sage-200 text-sage-700 font-serif italic text-lg">
                  {practitioner.name?.charAt(0) ?? "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-olive-900">
                  {practitioner.name}
                </div>
                <div className="text-[12px] text-olive-500">Practitioner</div>
              </div>
              <button
                onClick={handleMessagePractitioner}
                className="flex items-center gap-1.5 text-[12.5px] text-sage-700 bg-sage-100 hover:bg-sage-200 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* PACKAGE INFO                                                   */}
          {/* ============================================================== */}
          {service?.description && (
            <div className="bg-white border border-sage-200/60 rounded-xl p-5">
              <div className="text-[10px] tracking-[0.1em] uppercase text-sage-600 mb-2">
                What&apos;s Included
              </div>
              <p className="text-[13px] text-olive-600 leading-relaxed">
                {service.description.length > 180
                  ? `${service.description.slice(0, 180)}...`
                  : service.description}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
