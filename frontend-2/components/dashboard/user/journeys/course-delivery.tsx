"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { conversationsCreate } from "@/src/client"
import {
  bookingsRetrieveOptions,
  bookingsListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import type {
  BookingDetailReadable,
  BookingListReadable,
  JourneyDetail,
} from "@/src/client/types.gen"
import {
  format,
  parseISO,
  isFuture,
  differenceInMinutes,
} from "date-fns"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import JournalSection from "@/components/dashboard/user/journeys/journal-section"
import FormsStatusBanner from "@/components/dashboard/user/journeys/forms-status-banner"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"
import { ReviewBookingDialog } from "@/components/dashboard/user/bookings/review-booking-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Calendar,
  Clock,
  Video,
  Film,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Award,
  Star,
  MessageSquare,
  BookOpen,
  ExternalLink,
  XCircle,
  MapPin,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CourseDeliveryProps {
  bookingUuid: string
  journeyData?: JourneyDetail
}

interface ModuleBooking {
  booking: BookingListReadable
  sessionStatus: string | undefined
  startTime: Date | null
  title: string
  sequenceNumber: number
  durationMinutes: number | null
  description?: string | null
  agenda?: string | null
  whatYoullLearn?: string | null
  roomUuid?: string | null
  clientNotes?: string | null
}

// ---------------------------------------------------------------------------
// Teal accent constants
// ---------------------------------------------------------------------------

const TEAL = "#2d6a6a"
const TEAL_LIGHT = "#3a8585"
const TEAL_DARK = "#1e4a4a"

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

function parseStartTime(booking: BookingListReadable): Date | null {
  const raw = booking.service_session?.start_time
  if (!raw) return null
  return toDate(raw)
}

function getSessionStatus(booking: BookingListReadable): string | undefined {
  return booking.service_session?.status as string | undefined
}

function isModuleJoinable(mod: ModuleBooking): boolean {
  if (!mod.startTime) return false
  const status = mod.booking?.status
  if (status !== "confirmed" && mod.sessionStatus !== "in_progress") return false
  const minutesUntil = differenceInMinutes(mod.startTime, new Date())
  return minutesUntil <= 15 && isFuture(mod.startTime)
}

function buildModules(bookings: BookingListReadable[]): ModuleBooking[] {
  return bookings
    .map((booking, index) => ({
      booking,
      sessionStatus: getSessionStatus(booking),
      startTime: parseStartTime(booking),
      title:
        booking.service_session?.title ??
        `Module ${booking.service_session?.sequence_number ?? index + 1}`,
      sequenceNumber: booking.service_session?.sequence_number ?? index + 1,
      durationMinutes: booking.service_session?.duration ?? booking.duration_minutes ?? null,
    }))
    .sort((a, b) => {
      if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber
      if (a.startTime && b.startTime) return a.startTime.getTime() - b.startTime.getTime()
      if (a.startTime) return -1
      if (b.startTime) return 1
      return 0
    })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CourseDelivery({ bookingUuid, journeyData }: CourseDeliveryProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const UPCOMING_THRESHOLD = 3

  // ── Data fetching ──────────────────────────────────────────────────────
  const hasJourneyData = !!journeyData?.sessions?.length

  const {
    data: initialBooking,
    isLoading: isLoadingInitial,
    error: initialError,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingUuid } }),
    enabled: !hasJourneyData && !!bookingUuid,
  })

  const serviceId = initialBooking?.service?.id
  const {
    data: allBookingsData,
    isLoading: isLoadingAll,
  } = useQuery({
    ...bookingsListOptions({
      query: { ordering: "created_at", page_size: 200 },
    }),
    enabled: !hasJourneyData && !!serviceId,
  })

  const courseBookings = useMemo(() => {
    if (!allBookingsData?.results || !serviceId) return []
    return (allBookingsData.results as BookingListReadable[]).filter(
      (b) => b.service?.id === serviceId && b.status !== "canceled"
    )
  }, [allBookingsData?.results, serviceId])

  // ── Build modules ──────────────────────────────────────────────────────
  const modules = useMemo(() => {
    if (hasJourneyData) {
      // Deduplicate sessions by room_uuid (same service session = same room)
      const seen = new Set<string>()
      return journeyData!.sessions
        .filter((s) => {
          const key = s.room_uuid || s.booking_uuid || String(s.sequence_number)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map((s, index) => ({
          booking: { public_uuid: s.booking_uuid, status: s.booking_status } as any,
          sessionStatus: s.status || undefined,
          startTime: s.start_time ? toDate(s.start_time) : null,
          title: s.title || `Module ${s.sequence_number ?? index + 1}`,
          sequenceNumber: s.sequence_number ?? index + 1,
          durationMinutes: s.duration_minutes ?? null,
          description: s.description,
          agenda: s.agenda,
          whatYoullLearn: s.what_youll_learn,
          roomUuid: s.room_uuid,
          clientNotes: s.client_notes,
        }))
        .sort((a, b) => {
          if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber
          if (a.startTime && b.startTime) return a.startTime.getTime() - b.startTime.getTime()
          return 0
        })
    }
    return buildModules(courseBookings)
  }, [hasJourneyData, journeyData, courseBookings])

  // ── Derived data ───────────────────────────────────────────────────────
  const service = hasJourneyData
    ? {
        name: journeyData?.service_name,
        description: journeyData?.service_description,
        location_type: journeyData?.service_location_type || "virtual",
      }
    : initialBooking?.service

  const practitioner = hasJourneyData
    ? journeyData!.practitioner
      ? {
          name: journeyData!.practitioner.name,
          slug: journeyData!.practitioner.slug,
          bio: journeyData!.practitioner.bio,
          public_uuid: journeyData!.practitioner.public_uuid,
          id: journeyData!.practitioner.public_uuid,
          user_id: (journeyData!.practitioner as any)?.user_id,
          profile_image_url: null,
        }
      : null
    : initialBooking?.practitioner

  const completedCount = hasJourneyData
    ? journeyData!.completed_sessions
    : modules.filter((m) => m.sessionStatus === "completed").length
  const totalCount = hasJourneyData ? journeyData!.total_sessions : modules.length
  const progressPercent = hasJourneyData
    ? journeyData!.progress_percentage
    : totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0
  const allCompleted = completedCount === totalCount && totalCount > 0

  const firstDate = modules[0]?.startTime ?? null
  const lastDate = modules[modules.length - 1]?.startTime ?? null

  const upNext = modules.find(
    (m) =>
      m.sessionStatus === "scheduled" &&
      m.startTime &&
      isFuture(m.startTime)
  )

  const isCanceled = hasJourneyData ? false : initialBooking?.status === "canceled"
  const isVirtual = (service as any)?.location_type === "virtual"
  const imageUrl = journeyData?.service_image_url || ""
  const journeyUuid = bookingUuid

  const avgDuration =
    modules.length > 0
      ? Math.round(
          modules.reduce((sum, m) => sum + (m.durationMinutes ?? 0), 0) /
            (modules.filter((m) => m.durationMinutes).length || 1)
        )
      : null

  // 14-day cancellation window
  const canCancelCourse = useMemo(() => {
    if (!modules.length) return false
    const firstSessionTime = modules[0]?.startTime
    if (!firstSessionTime) return true
    const daysSinceStart = Math.floor(
      (Date.now() - firstSessionTime.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceStart <= 14
  }, [modules])

  // ── Cancel mutation ────────────────────────────────────────────────────
  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (reason: string) => {
      const { bookingsCancelCreate } = await import("@/src/client")
      await bookingsCancelCreate({
        path: { public_uuid: bookingUuid },
        body: { reason, status: "canceled", canceled_by: "client" } as any,
      })
    },
    onSuccess: () => {
      toast.success("Course enrollment canceled")
      router.push("/dashboard/user/journeys")
    },
    onError: () => {
      toast.error("Failed to cancel enrollment")
    },
  })

  // ── Message practitioner ───────────────────────────────────────────────
  const handleMessagePractitioner = useCallback(async () => {
    const practitionerUserId = (practitioner as any)?.user_id
    if (!practitionerUserId) {
      toast.error("Unable to message practitioner")
      return
    }
    try {
      // Backend handles dedup — returns existing conversation if one exists
      const result = await conversationsCreate({
        body: { other_user_id: practitionerUserId } as any,
      })
      const convoId = (result.data as any)?.id
      if (convoId) {
        router.push(`/dashboard/user/messages?conversationId=${convoId}`)
      }
    } catch {
      toast.error("Failed to start conversation")
    }
  }, [practitioner, router])

  // ── Curriculum categorisation ──────────────────────────────────────────
  // Sessions with status "completed" OR past start time are considered completed
  const completed = modules.filter(
    (m) => m.sessionStatus === "completed" || (m.startTime && !isFuture(m.startTime) && m.sessionStatus !== "canceled")
  )
  const canceled = modules.filter((m) => m.sessionStatus === "canceled")
  const upNextModule = upNext
  const upcoming = modules.filter(
    (m) =>
      m !== upNextModule &&
      !completed.includes(m) &&
      m.sessionStatus !== "canceled" &&
      (m.startTime ? isFuture(m.startTime) : true)
  )
  const visibleUpcoming = showAllUpcoming
    ? upcoming
    : upcoming.slice(0, UPCOMING_THRESHOLD)
  const hiddenUpcomingCount = upcoming.length - UPCOMING_THRESHOLD

  // ── Loading / Error states ─────────────────────────────────────────────
  if (!hasJourneyData && (isLoadingInitial || (serviceId && isLoadingAll))) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-olive-400">Loading course...</p>
      </div>
    )
  }

  if (!hasJourneyData && (initialError || !initialBooking)) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-olive-400 mb-4">Failed to load course details.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/user/journeys">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journeys
          </Link>
        </Button>
      </div>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── COMPACT HEADER BAR ── */}
      <div className="bg-gradient-to-r from-teal-50/80 to-cream-50 border-b border-teal-200/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/dashboard/user/journeys"
            className="inline-flex items-center gap-2 text-[13px] text-olive-400 hover:text-teal-700 transition-colors min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Journeys
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase px-3 py-1 rounded-full ${
              isCanceled
                ? "bg-red-50 border border-red-200 text-red-600"
                : allCompleted
                  ? "bg-teal-50 border border-teal-200 text-teal-700"
                  : "bg-teal-50 border border-teal-200 text-teal-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCanceled
                  ? "bg-red-400"
                  : allCompleted
                    ? "bg-teal-500"
                    : "bg-teal-500 animate-pulse"
              }`}
            />
            {isCanceled
              ? "Canceled"
              : allCompleted
                ? "Complete"
                : totalCount > 0
                  ? `${completedCount} of ${totalCount} complete`
                  : "Enrolled"}
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Pre-session forms banner */}
        <FormsStatusBanner bookingUuid={bookingUuid} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-8">
            {/* ── Hero Card (teal-tinted) ── */}
            <div className="relative rounded-2xl overflow-hidden bg-[#1a3a3a]">
              {imageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-35"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a3a3a] via-[#1a3a3a]/70 to-[#1a3a3a]/40" />
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 80% 20%, ${TEAL}44 0%, transparent 60%)`,
                }}
              />

              <div className="relative z-10 p-5 sm:p-8 pb-4 sm:pb-5">
                <div className="text-[11px] font-medium tracking-widest uppercase text-white/40 mb-2">
                  Course
                </div>
                <h1 className="font-serif text-[24px] sm:text-[28px] md:text-[34px] font-medium text-white/95 leading-tight mb-4">
                  {service?.name ?? "Course"}
                </h1>

                <div className="flex items-center gap-3 sm:gap-4 flex-wrap mb-5">
                  {practitioner && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/20">
                        {(practitioner as any)?.profile_image_url && (
                          <AvatarImage
                            src={(practitioner as any).profile_image_url}
                            alt={(practitioner as any)?.name ?? "Instructor"}
                          />
                        )}
                        <AvatarFallback
                          className="text-white/80 text-xs font-serif italic"
                          style={{
                            background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                          }}
                        >
                          {(practitioner as any)?.name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] text-white/60">
                        with{" "}
                        <span className="text-white/85 font-medium">
                          {(practitioner as any)?.name}
                        </span>
                      </span>
                    </div>
                  )}
                  {totalCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <BookOpen className="h-3.5 w-3.5" />
                      {totalCount} sessions
                    </span>
                  )}
                  {avgDuration && avgDuration > 0 && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Clock className="h-3.5 w-3.5" />
                      ~{formatDuration(avgDuration)} each
                    </span>
                  )}
                  {firstDate && lastDate && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(firstDate, "MMM d")} &ndash; {format(lastDate, "MMM d")}
                    </span>
                  )}
                </div>

                {/* Progress bar at bottom of hero */}
                {totalCount > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-white/45">
                        {completedCount} of {totalCount} sessions complete
                      </span>
                      <span className="text-white/45">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          background: allCompleted
                            ? "linear-gradient(90deg, #4a8a8a, #6aabab)"
                            : `linear-gradient(90deg, ${TEAL_DARK}, ${TEAL_LIGHT})`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Canceled Notice ── */}
            {isCanceled && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-red-800">
                    Course enrollment has been canceled
                  </p>
                  {initialBooking?.cancellation_reason && (
                    <p className="text-[13px] text-red-600 mt-1">
                      {initialBooking.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── CURRICULUM (the star of this page) ── */}
            {!isCanceled && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-4 pb-2 border-b border-teal-200/50">
                  Curriculum
                </h2>

                {/* All completed banner */}
                {allCompleted && (
                  <div className="flex items-center gap-3 p-4 mb-4 rounded-xl border border-teal-200/60 bg-teal-50/50">
                    <Award className="h-6 w-6 shrink-0 text-teal-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-olive-900">
                        Course Complete
                      </p>
                      <p className="text-xs text-olive-600 mt-0.5">
                        Congratulations on finishing all modules!
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {/* Completed modules */}
                  {completed.map((mod) => (
                    <Link
                      key={mod.booking.id ?? mod.sequenceNumber}
                      href={`/dashboard/user/journeys/${journeyUuid}/${mod.booking.public_uuid}`}
                      className="flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3.5 bg-white border border-sage-200/60 rounded-xl hover:border-teal-200 hover:shadow-sm transition group"
                    >
                      <CheckCircle className="h-5 w-5 text-teal-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-olive-900">
                          {mod.title}
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-olive-500 mt-0.5">
                          {mod.startTime && (
                            <span>{format(mod.startTime, "MMM d")}</span>
                          )}
                          {mod.durationMinutes && (
                            <>
                              <span className="text-olive-300">&middot;</span>
                              <span>{formatDuration(mod.durationMinutes)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {(mod.booking as any).recordings && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 shrink-0">
                          <Film className="w-3 h-3" />
                          Recording
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-olive-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}

                  {/* Up Next module — highlighted */}
                  {upNextModule && (
                    <Link
                      href={`/dashboard/user/journeys/${journeyUuid}/${upNextModule.booking.public_uuid}`}
                      className="block"
                    >
                      <div className="bg-white border-2 border-teal-300 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition">
                        <div className="flex items-start gap-3.5">
                          <div className="w-5 h-5 rounded-full mt-0.5 shrink-0 flex items-center justify-center bg-teal-600">
                            <span className="w-2 h-2 rounded-full bg-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-1">
                              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                Up Next
                              </span>
                            </div>
                            <p className="text-[15px] font-medium text-olive-900 mb-1.5">
                              {upNextModule.title}
                            </p>
                            <div className="flex items-center gap-3 text-[13px] text-olive-600 flex-wrap">
                              {upNextModule.startTime && (
                                <>
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                    {format(upNextModule.startTime, "EEE, MMM d")}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                                    {format(upNextModule.startTime, "h:mm a")}
                                  </span>
                                </>
                              )}
                              {upNextModule.durationMinutes && (
                                <span className="text-olive-500">
                                  {formatDuration(upNextModule.durationMinutes)}
                                </span>
                              )}
                            </div>
                            {isModuleJoinable(upNextModule) &&
                              (upNextModule.roomUuid || upNextModule.booking.room) && (
                                <div className="mt-3">
                                  <Button
                                    size="sm"
                                    className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[13px] gap-1.5"
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <a
                                      href={`/room/${upNextModule.roomUuid || upNextModule.booking.room}/lobby`}
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      Join Session
                                    </a>
                                  </Button>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Upcoming modules — muted */}
                  {visibleUpcoming.map((mod) => (
                    <Link
                      key={mod.booking.id ?? mod.sequenceNumber}
                      href={`/dashboard/user/journeys/${journeyUuid}/${mod.booking.public_uuid}`}
                      className="flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3.5 bg-white/60 border border-sage-200/40 rounded-xl hover:border-teal-200 hover:shadow-sm transition group"
                    >
                      <Circle className="h-5 w-5 text-sage-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-olive-600">
                          {mod.title}
                        </p>
                        {mod.startTime && (
                          <p className="text-[12px] text-olive-400 mt-0.5">
                            {format(mod.startTime, "MMM d")} &middot;{" "}
                            {format(mod.startTime, "h:mm a")}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-olive-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}

                  {/* Show more / Show less */}
                  {hiddenUpcomingCount > 0 && !showAllUpcoming && (
                    <button
                      className="flex items-center gap-1.5 text-[13px] mt-1 ml-8 text-teal-700 transition-colors hover:opacity-75"
                      onClick={() => setShowAllUpcoming(true)}
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span>
                        {hiddenUpcomingCount} more session
                        {hiddenUpcomingCount > 1 ? "s" : ""}
                      </span>
                    </button>
                  )}
                  {showAllUpcoming && hiddenUpcomingCount > 0 && (
                    <button
                      className="flex items-center gap-1.5 text-[13px] mt-1 ml-8 text-teal-700 transition-colors hover:opacity-75"
                      onClick={() => setShowAllUpcoming(false)}
                    >
                      <ChevronUp className="h-4 w-4" />
                      Show less
                    </button>
                  )}

                  {/* Canceled modules */}
                  {canceled.map((mod) => (
                    <div
                      key={mod.booking.id ?? mod.sequenceNumber}
                      className="flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3.5 bg-white/40 border border-sage-200/30 rounded-xl opacity-50"
                    >
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-[14px] font-medium text-olive-600 line-through">
                          {mod.title}
                        </p>
                        {mod.startTime && (
                          <p className="text-[12px] text-olive-400 mt-0.5">
                            {format(mod.startTime, "MMM d")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Journal ── */}
            {!isCanceled && (
              <JournalSection
                bookingUuid={bookingUuid}
                serviceUuid={
                  journeyData?.service_uuid ||
                  String((service as any)?.public_uuid || "")
                }
                accentColor="teal"
              />
            )}

            {/* ── Your Instructor ── */}
            {practitioner && !isCanceled && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-teal-200/50">
                  Your Instructor
                </h2>
                <div className="flex items-start gap-4 p-5 bg-white border border-sage-200/60 rounded-xl">
                  <Avatar className="h-14 w-14">
                    {(practitioner as any)?.profile_image_url ? (
                      <AvatarImage
                        src={(practitioner as any).profile_image_url}
                        alt={(practitioner as any)?.name ?? "Instructor"}
                      />
                    ) : null}
                    <AvatarFallback
                      className="text-white/80 font-serif text-xl italic"
                      style={{
                        background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                      }}
                    >
                      {(practitioner as any)?.name?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-[16px] font-medium text-olive-900">
                      {(practitioner as any)?.name}
                    </div>
                    {(practitioner as any)?.bio && (
                      <p className="text-[13px] text-olive-500 mt-1 line-clamp-2">
                        {(practitioner as any).bio}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-[12px] border-sage-200 text-olive-600 min-h-[44px] sm:min-h-0"
                        asChild
                      >
                        <Link
                          href={`/practitioners/${(practitioner as any)?.slug || (practitioner as any)?.id}`}
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-[12px] border-sage-200 text-olive-600 min-h-[44px] sm:min-h-0"
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

          {/* ── RIGHT COLUMN (SIDEBAR) ── */}
          <aside className="lg:sticky lg:top-20 self-start space-y-4">
            {/* Progress Card */}
            {totalCount > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium text-teal-800">
                    {allCompleted ? "Course Complete!" : "Your Progress"}
                  </span>
                  <span className="text-[13px] font-medium text-teal-700">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-teal-100 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      background: allCompleted
                        ? "linear-gradient(90deg, #4a8a8a, #6aabab)"
                        : `linear-gradient(90deg, ${TEAL_DARK}, ${TEAL_LIGHT})`,
                    }}
                  />
                </div>
                <div className="text-[12px] text-olive-600">
                  {completedCount} of {totalCount} sessions complete
                </div>
                {upNext?.startTime && (
                  <div className="flex items-center gap-1.5 text-[12px] text-teal-700 mt-2 pt-2 border-t border-teal-200/60">
                    <Calendar className="w-3 h-3" />
                    Next: {format(upNext.startTime, "EEE, MMM d")} at{" "}
                    {format(upNext.startTime, "h:mm a")}
                  </div>
                )}
              </div>
            )}

            {/* Course Details Card */}
            <div className="bg-white border border-sage-200/60 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-sage-200/40 bg-sage-50/50">
                <div className="text-[10px] font-medium tracking-widest uppercase text-olive-400 mb-1">
                  Course Details
                </div>
              </div>

              <div className="px-5 py-3">
                {/* Total sessions */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-400">
                    <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                    Sessions
                  </span>
                  <span className="font-medium text-olive-800">
                    {totalCount}
                  </span>
                </div>

                {/* Duration per session */}
                {avgDuration && avgDuration > 0 && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="flex items-center gap-2 text-olive-400">
                      <Clock className="h-3.5 w-3.5 text-teal-600" />
                      Per Session
                    </span>
                    <span className="font-medium text-olive-800">
                      ~{formatDuration(avgDuration)}
                    </span>
                  </div>
                )}

                {/* Date range */}
                {firstDate && lastDate && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="flex items-center gap-2 text-olive-400">
                      <Calendar className="h-3.5 w-3.5 text-teal-600" />
                      Dates
                    </span>
                    <span className="font-medium text-olive-800">
                      {format(firstDate, "MMM d")} &ndash;{" "}
                      {format(lastDate, "MMM d")}
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-400">
                    {isVirtual ? (
                      <Video className="h-3.5 w-3.5 text-teal-600" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-teal-600" />
                    )}
                    Location
                  </span>
                  <span className="font-medium text-olive-800">
                    {isVirtual ? "Virtual" : "In Person"}
                  </span>
                </div>

                {/* Confirmation */}
                <div className="flex justify-between py-2.5 text-[13px]">
                  <span className="text-olive-400">Enrollment</span>
                  <span className="font-mono text-[11px] text-teal-600 tracking-wide">
                    {bookingUuid.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Join Next Session — if joinable */}
              {upNext &&
                isModuleJoinable(upNext) &&
                (upNext.roomUuid || upNext.booking.room) && (
                  <Button
                    className="w-full h-12 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[15px] font-medium"
                    asChild
                  >
                    <a
                      href={`/room/${upNext.roomUuid || upNext.booking.room}/lobby`}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Next Session
                    </a>
                  </Button>
                )}

              {/* Message Instructor */}
              {practitioner && (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-full border-sage-200 text-olive-600 text-[13px]"
                  onClick={handleMessagePractitioner}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  Message Instructor
                </Button>
              )}

              {/* Leave Review — completed only */}
              {allCompleted && (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-full border-sage-200 text-olive-600 text-[13px]"
                  onClick={() => setReviewDialogOpen(true)}
                >
                  <Star className="h-3.5 w-3.5 mr-2" />
                  Leave Review
                </Button>
              )}

              {/* Cancel Enrollment */}
              {!allCompleted && !isCanceled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <button
                          onClick={() => setCancelDialogOpen(true)}
                          disabled={!canCancelCourse}
                          className="w-full text-center text-[12px] text-olive-400 hover:text-red-500 py-2 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-olive-400"
                        >
                          Cancel Enrollment
                        </button>
                      </div>
                    </TooltipTrigger>
                    {!canCancelCourse && (
                      <TooltipContent>
                        <p>
                          Cancellation window has passed (14 days). Please
                          contact support.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <CancelBookingDialog
        bookingId={bookingUuid}
        serviceName={service?.name || "Course"}
        practitionerName={(practitioner as any)?.name || "Instructor"}
        date={
          modules[0]?.startTime
            ? format(modules[0].startTime, "MMMM d, yyyy")
            : ""
        }
        time={
          modules[0]?.startTime
            ? format(modules[0].startTime, "h:mm a")
            : ""
        }
        price={`$${(initialBooking as any)?.credits_allocated_dollars || 0}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={(reason) => cancelBooking(reason)}
        isLoading={isCancelling}
      />
      {initialBooking && (
        <ReviewBookingDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          booking={initialBooking as any}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] })
          }}
        />
      )}
    </div>
  )
}
