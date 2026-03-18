"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  bookingsRetrieveOptions,
  bookingsListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { conversationsCreate, conversationsList } from "@/src/client"
import type { BookingListReadable, JourneyDetail, JourneySession } from "@/src/client/types.gen"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  CalendarPlus,
  CheckCircle,
  FileText,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import {
  format,
  parseISO,
  isFuture,
  differenceInMinutes,
  differenceInDays,
} from "date-fns"
import Link from "next/link"
import JournalSection from "@/components/dashboard/user/journeys/journal-section"
import { ReviewBookingDialog } from "@/components/dashboard/user/bookings/review-booking-dialog"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return parseISO(value)
  return new Date(String(value))
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`
  }
  return `${minutes} min`
}

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
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-sage-50/80 to-cream-50 border-b border-sage-200/40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Skeleton className="h-4 w-28 bg-sage-200/40" />
          <Skeleton className="h-6 w-24 bg-sage-200/40 rounded-full" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="space-y-8">
            <Skeleton className="h-56 w-full rounded-2xl bg-sage-200/40" />
            <Skeleton className="h-20 w-full bg-sage-200/40" />
            <Skeleton className="h-20 w-full bg-sage-200/40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-xl bg-sage-200/40" />
            <Skeleton className="h-52 w-full rounded-xl bg-sage-200/40" />
            <Skeleton className="h-12 w-full rounded-full bg-sage-200/40" />
          </div>
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (reason: string) => {
      const { bookingsCancelCreate } = await import("@/src/client")
      await bookingsCancelCreate({
        path: { public_uuid: String(bookingUuid) },
        body: { reason, status: "canceled", canceled_by: "client" } as any,
      })
    },
    onSuccess: () => {
      toast.success("Package booking canceled")
      router.push("/dashboard/user/journeys")
    },
    onError: () => {
      toast.error("Failed to cancel booking")
    },
  })

  // Fetch the initial booking by uuid
  const {
    data: booking,
    isLoading: isLoadingBooking,
    error: bookingError,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingUuid } }),
  })

  // Fetch ALL bookings for the same user to find siblings from same service/package
  // Skip when journeyData already provides the session list
  const hasJourneySessions = !!(journeyData?.sessions && journeyData.sessions.length > 0)

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
    enabled: !!booking && !hasJourneySessions,
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

  // Sort bookings / journey-sessions into three buckets
  const { completed, scheduled, needsScheduling } = useMemo(() => {
    // -- Path A: use journeyData.sessions --
    if (hasJourneySessions) {
      const completedArr: JourneySession[] = []
      const scheduledArr: JourneySession[] = []
      const needsSchedulingArr: JourneySession[] = []

      for (const s of journeyData!.sessions) {
        if (s.booking_status === "canceled") continue
        if (s.status === "completed") {
          completedArr.push(s)
        } else if (
          s.booking_status === "confirmed" &&
          s.start_time &&
          isFuture(toDate(s.start_time))
        ) {
          scheduledArr.push(s)
        } else {
          needsSchedulingArr.push(s)
        }
      }

      scheduledArr.sort((a, b) => {
        const aTime = a.start_time ? toDate(a.start_time).getTime() : Infinity
        const bTime = b.start_time ? toDate(b.start_time).getTime() : Infinity
        return aTime - bTime
      })

      completedArr.sort((a, b) => {
        const aTime = a.start_time ? toDate(a.start_time).getTime() : 0
        const bTime = b.start_time ? toDate(b.start_time).getTime() : 0
        return bTime - aTime
      })

      return { completed: completedArr, scheduled: scheduledArr, needsScheduling: needsSchedulingArr }
    }

    // -- Path B: fallback to bookings API list --
    const completedArr: BookingListReadable[] = []
    const scheduledArr: BookingListReadable[] = []
    const needsSchedulingArr: BookingListReadable[] = []

    for (const b of packageBookings) {
      if (b.service_session?.status === "completed") {
        completedArr.push(b)
      } else if (
        b.status === "confirmed" &&
        b.service_session?.start_time &&
        isFuture(toDate(b.service_session.start_time))
      ) {
        scheduledArr.push(b)
      } else {
        needsSchedulingArr.push(b)
      }
    }

    scheduledArr.sort((a, b) => {
      const aTime = new Date(String(a.service_session?.start_time)).getTime()
      const bTime = new Date(String(b.service_session?.start_time)).getTime()
      return aTime - bTime
    })

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
  }, [packageBookings, hasJourneySessions, journeyData])

  const totalCount = hasJourneySessions
    ? journeyData!.total_sessions
    : packageBookings.length
  const completedCount = completed.length
  const usedCount = completedCount + scheduled.length
  const isPackageComplete = completedCount === totalCount && totalCount > 0

  // Type guard to distinguish JourneySession from BookingListReadable
  type SessionItem = BookingListReadable | JourneySession
  const isJourneySession = (item: SessionItem): item is JourneySession =>
    "booking_uuid" in item && !("service_session" in item)

  // Helper: extract common fields from either BookingListReadable or JourneySession
  const getItemId = (item: SessionItem): string =>
    isJourneySession(item) ? item.booking_uuid : (item.public_uuid || String(item.id))

  const getItemStartTime = (item: SessionItem): Date | null => {
    if (isJourneySession(item)) {
      return item.start_time ? toDate(item.start_time) : null
    }
    return item.service_session?.start_time ? toDate(item.service_session.start_time) : null
  }

  const getItemDuration = (item: SessionItem): number => {
    if (isJourneySession(item)) return item.duration_minutes || 60
    return (item as any).duration_minutes || 60
  }

  const getItemBookingUuid = (item: SessionItem): string =>
    isJourneySession(item) ? item.booking_uuid : (item.public_uuid || String(item.id))

  // Check if a session is joinable (within 15 min of start)
  const isSessionJoinable = (item: SessionItem) => {
    const startTime = getItemStartTime(item)
    const status = isJourneySession(item) ? item.booking_status : item.status
    if (!startTime || status !== "confirmed") return false
    const now = new Date()
    const minutesUntil = differenceInMinutes(startTime, now)
    const duration = getItemDuration(item)
    const minutesSinceStart = differenceInMinutes(now, startTime)
    return minutesUntil <= 15 && minutesSinceStart < duration
  }

  // Get a session number based on order in the full list
  const allItems = useMemo(() => [...completed, ...scheduled, ...needsScheduling], [completed, scheduled, needsScheduling])

  const getSessionNumber = (item: SessionItem) => {
    if (isJourneySession(item) && item.sequence_number != null) return item.sequence_number
    const sorted = [...allItems].sort((a, b2) => {
      const aTime = getItemStartTime(a)?.getTime() ?? Infinity
      const bTime = getItemStartTime(b2)?.getTime() ?? Infinity
      return aTime - bTime
    })
    const id = getItemId(item)
    const idx = sorted.findIndex((s) => getItemId(s) === id)
    return idx + 1
  }

  // Check expiration
  const purchasedDate = booking?.created_at
    ? format(toDate(booking.created_at), "MMM d, yyyy")
    : null

  const expirationDate: Date | null = null
  const daysUntilExpiration = expirationDate
    ? differenceInDays(expirationDate, new Date())
    : null
  const isNearingExpiration =
    daysUntilExpiration !== null && daysUntilExpiration < 30 && daysUntilExpiration > 0

  // Message practitioner
  const handleMessagePractitioner = useCallback(async () => {
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
  }, [booking, router])

  const isLoading = isLoadingBooking || (!hasJourneySessions && isLoadingAll)

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
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load package details. Please try again later.
          </AlertDescription>
        </Alert>
        <Link
          href="/dashboard/user/journeys"
          className="inline-flex items-center gap-2 text-[13px] text-olive-400 hover:text-sage-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Journeys
        </Link>
      </div>
    )
  }

  const service = booking.service
  const practitioner = booking.practitioner
  const remainingCount = totalCount - completedCount
  const locationIsVirtual = service?.location_type === "virtual"
  const imageUrl = journeyData?.service_image_url || (service as any)?.featured_image_url || ""

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen">
      {/* -- COMPACT HEADER BAR -- */}
      <div className="bg-gradient-to-r from-sage-50/80 to-cream-50 border-b border-sage-200/40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/dashboard/user/journeys"
            className="inline-flex items-center gap-2 text-[13px] text-olive-400 hover:text-sage-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Journeys
          </Link>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase px-3 py-1 rounded-full ${
                  isPackageComplete
                    ? "bg-sage-100 border border-sage-200 text-sage-600"
                    : "bg-sage-100 border border-sage-300 text-sage-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPackageComplete ? "bg-sage-500" : "bg-sage-500 animate-pulse"
                  }`}
                />
                {isPackageComplete
                  ? "Complete"
                  : `${usedCount} of ${totalCount} used`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* -- MAIN CONTENT -- */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          {/* -- LEFT COLUMN -- */}
          <div className="space-y-8">
            {/* Hero Card -- sage-tinted with service image */}
            <div className="relative rounded-2xl overflow-hidden bg-[#1e2e1e]">
              {/* Background image */}
              {imageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-35"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e2e1e] via-[#1e2e1e]/75 to-[#1e2e1e]/40" />

              <div className="relative z-10 p-8 pb-7">
                <div className="text-[11px] font-medium tracking-widest uppercase text-white/40 mb-2">
                  Package
                </div>
                <h1 className="font-serif text-[28px] md:text-[34px] font-medium text-white/95 leading-tight mb-4">
                  {service?.name ?? "Package"}
                </h1>

                <div className="flex items-center gap-4 flex-wrap mb-5">
                  {/* Practitioner */}
                  {practitioner?.name && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/20">
                        {practitioner.profile_image_url ? (
                          <AvatarImage
                            src={practitioner.profile_image_url}
                            alt={practitioner.name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-white/10 text-white/70 text-xs font-serif italic">
                          {practitioner.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] text-white/60">
                        with{" "}
                        <span className="text-white/85 font-medium">
                          {practitioner.name}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Total sessions */}
                  <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                    <Calendar className="h-3.5 w-3.5" />
                    {totalCount} session{totalCount !== 1 ? "s" : ""} total
                  </span>

                  {/* Remaining */}
                  <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                    <Clock className="h-3.5 w-3.5" />
                    {remainingCount} remaining
                  </span>

                  {/* Purchased */}
                  {purchasedDate && (
                    <span className="text-[13px] text-white/50">
                      Purchased {purchasedDate}
                    </span>
                  )}
                </div>

                {/* Dot progress at bottom of hero */}
                {totalCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalCount }).map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          i < completedCount
                            ? "bg-[#6b8f6b] border border-[#8aaf8a]"
                            : i < usedCount
                              ? "bg-[#6b8f6b]/40 border border-[#6b8f6b]/50"
                              : "bg-transparent border border-white/20"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Package complete banner */}
            {isPackageComplete && (
              <div className="flex items-start gap-3 p-4 bg-sage-50 border border-sage-200 rounded-xl">
                <CheckCircle className="h-5 w-5 text-sage-600 shrink-0 mt-0.5" />
                <p className="text-[14px] font-medium text-olive-900">
                  Package complete! All {totalCount} sessions have been completed.
                </p>
              </div>
            )}

            {/* ── SCHEDULED SESSIONS ── */}
            {scheduled.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-sage-200/50">
                  Scheduled Sessions
                </h2>
                <div className="flex flex-col gap-2.5">
                  {scheduled.map((b) => {
                    const startTime = getItemStartTime(b)!
                    const joinable = locationIsVirtual && isSessionJoinable(b)
                    const sessionNum = getSessionNumber(b)
                    const uuid = getItemBookingUuid(b)
                    const dur = getItemDuration(b)

                    return (
                      <div
                        key={getItemId(b)}
                        className="flex items-center justify-between gap-4 px-5 py-4 bg-white border border-sage-200/60 rounded-xl hover:border-sage-400 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sage-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-olive-900">
                              Session {sessionNum}
                            </p>
                            <p className="text-[12.5px] text-olive-500">
                              {format(startTime, "EEE, MMM d")} &middot;{" "}
                              {format(startTime, "h:mm a")}
                              {dur ? ` \u00B7 ${formatDuration(dur)}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {joinable && (
                            <Button
                              size="sm"
                              asChild
                              className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-4"
                            >
                              <Link href={`/dashboard/user/bookings/${uuid}`}>
                                <Video className="h-3.5 w-3.5 mr-1.5" />
                                Join
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="rounded-full border-sage-200 text-olive-600 hover:border-sage-400 hover:text-olive-800"
                          >
                            <Link
                              href={
                                joinable
                                  ? `/dashboard/user/bookings/${uuid}`
                                  : `/dashboard/user/bookings/${uuid}/reschedule`
                              }
                            >
                              {joinable ? "Details" : "Reschedule"}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── READY TO SCHEDULE ── */}
            {needsScheduling.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-sage-200/50">
                  Ready to Schedule
                </h2>

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
                    <Button
                      size="sm"
                      asChild
                      className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-4 flex-shrink-0"
                    >
                      <Link
                        href={`/dashboard/user/bookings/${getItemBookingUuid(needsScheduling[0])}/schedule`}
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
                    const uuid = getItemBookingUuid(b)

                    return (
                      <div
                        key={getItemId(b)}
                        className="flex items-center justify-between gap-4 px-5 py-4 bg-sage-50/50 border border-dashed border-sage-300 rounded-xl hover:border-sage-400 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-block h-2.5 w-2.5 rounded border border-sage-300 flex-shrink-0" />
                          <p className="text-[14px] font-medium text-olive-900">
                            Session {sessionNum}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-full border-sage-300 text-sage-700 hover:border-sage-500 hover:text-sage-800"
                        >
                          <Link href={`/dashboard/user/bookings/${uuid}/schedule`}>
                            Schedule
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── COMPLETED SESSIONS ── */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-sage-200/50">
                  Completed Sessions
                </h2>
                <div className="flex flex-col gap-2.5">
                  {completed.map((b) => {
                    const sessionNum = getSessionNumber(b)
                    const startTime = getItemStartTime(b)
                    const dur = getItemDuration(b)
                    const uuid = getItemBookingUuid(b)

                    return (
                      <div
                        key={getItemId(b)}
                        className="flex items-center justify-between gap-4 px-5 py-4 bg-white border border-sage-200/60 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-olive-700">
                              Session {sessionNum}
                            </p>
                            <p className="text-[12.5px] text-olive-500">
                              {startTime
                                ? format(startTime, "EEE, MMM d")
                                : "Completed"}
                              {dur ? ` \u00B7 ${formatDuration(dur)}` : ""}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-[12.5px] text-olive-600 hover:text-olive-800"
                        >
                          <Link href={`/dashboard/user/bookings/${uuid}`}>
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            View Notes
                          </Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── JOURNAL ── */}
            <JournalSection bookingUuid={bookingUuid} accentColor="sage" />

            {/* ── YOUR PRACTITIONER ── */}
            {practitioner && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-sage-200/50">
                  Your Practitioner
                </h2>
                <div className="flex items-start gap-4 p-5 bg-white border border-sage-200/60 rounded-xl">
                  <Avatar className="h-14 w-14">
                    {practitioner.profile_image_url ? (
                      <AvatarImage
                        src={practitioner.profile_image_url}
                        alt={practitioner.name ?? "Practitioner"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-sage-200 to-sage-300 text-olive-700 font-serif text-xl italic">
                      {practitioner.name?.charAt(0) ?? "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-[16px] font-medium text-olive-900">
                      {practitioner.name}
                    </div>
                    {practitioner.bio && (
                      <p className="text-[13px] text-olive-500 mt-1 line-clamp-2">
                        {practitioner.bio}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-[12px] border-sage-200 text-olive-600"
                        asChild
                      >
                        <Link
                          href={`/practitioners/${practitioner.slug || practitioner.id}`}
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-[12px] border-sage-200 text-olive-600"
                        onClick={handleMessagePractitioner}
                      >
                        <MessageSquare className="h-3 w-3 mr-1.5" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* -- RIGHT COLUMN (SIDEBAR) -- */}
          <aside className="lg:sticky lg:top-20 self-start space-y-4">
            {/* Package Progress Card */}
            {totalCount > 0 && (
              <div className="bg-white border border-sage-200/60 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-sage-200/40 bg-sage-50/50">
                  <div className="text-[10px] font-medium tracking-widest uppercase text-olive-400 mb-1">
                    Package Progress
                  </div>
                </div>
                <div className="px-5 py-4">
                  {/* Dot indicator */}
                  <div
                    className="flex items-center gap-1.5 mb-3 flex-wrap"
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
                  <p className="text-[13px] text-olive-600">
                    <span className="font-medium text-olive-800">{usedCount} of {totalCount}</span>{" "}
                    sessions used
                  </p>
                  {expirationDate && (
                    <p className={`text-[12px] mt-1 ${isNearingExpiration ? "text-amber-700 font-medium" : "text-olive-400"}`}>
                      Expires {format(expirationDate, "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Package Details Card */}
            <div className="bg-white border border-sage-200/60 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-sage-200/40 bg-sage-50/50">
                <div className="text-[10px] font-medium tracking-widest uppercase text-olive-400 mb-1">
                  Package Details
                </div>
              </div>

              <div className="px-5 py-3">
                {/* Total sessions */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-400">
                    <Calendar className="h-3.5 w-3.5 text-sage-500" />
                    Total Sessions
                  </span>
                  <span className="font-medium text-olive-800">{totalCount}</span>
                </div>

                {/* Remaining */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-400">
                    <Clock className="h-3.5 w-3.5 text-sage-500" />
                    Remaining
                  </span>
                  <span className="font-medium text-olive-800">{remainingCount}</span>
                </div>

                {/* Location */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-400">
                    <Video className="h-3.5 w-3.5 text-sage-500" />
                    Location
                  </span>
                  <span className="font-medium text-olive-800">
                    {locationIsVirtual ? "Virtual" : "In Person"}
                  </span>
                </div>

                {/* Confirmation */}
                <div className="flex justify-between py-2.5 text-[13px]">
                  <span className="text-olive-400">Confirmation</span>
                  <span className="font-mono text-[11px] text-sage-600 tracking-wide">
                    {bookingUuid.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Expiration Warning */}
            {isNearingExpiration && daysUntilExpiration !== null && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Your package expires in <strong>{daysUntilExpiration} day{daysUntilExpiration !== 1 ? "s" : ""}</strong>. Schedule your remaining sessions soon.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {needsScheduling.length > 0 && (
                <Button
                  asChild
                  className="w-full h-11 rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium"
                >
                  <Link
                    href={`/dashboard/user/bookings/${getItemBookingUuid(needsScheduling[0])}/schedule`}
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Schedule Next Session
                  </Link>
                </Button>
              )}

              <button
                onClick={() => setCancelDialogOpen(true)}
                className="w-full text-center text-[12px] text-olive-400 hover:text-red-500 py-1 transition-colors"
              >
                Cancel Package
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Dialogs */}
      <CancelBookingDialog
        bookingId={bookingUuid}
        serviceName={service?.name || "Package"}
        practitionerName={practitioner?.name || "Practitioner"}
        date={scheduled.length > 0 ? format(toDate(getItemStartTime(scheduled[0])!), "MMMM d, yyyy") : ""}
        time={scheduled.length > 0 ? format(toDate(getItemStartTime(scheduled[0])!), "h:mm a") : ""}
        price={`$${booking?.credits_allocated_dollars || 0}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={(reason) => cancelBooking(reason)}
        isLoading={isCancelling}
      />
      <ReviewBookingDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={booking as any}
      />
    </div>
  )
}
