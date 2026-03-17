"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { conversationsCreate, conversationsList } from "@/src/client"
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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import JournalSection from "@/components/dashboard/user/journeys/journal-section"
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
  PlayCircle,
  FileText,
  StickyNote,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Award,
  Star,
  MessageSquare,
  Users,
  BookOpen,
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
// Constants - Course accent color (teal)
// ---------------------------------------------------------------------------

const TEAL = "#2d6a6a"
const TEAL_LIGHT = "#3a8585"
const TEAL_PALE = "#e0f0f0"
const TEAL_DARK = "#1e4a4a"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return parseISO(value)
  return new Date(String(value))
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

/** @deprecated Use isModuleJoinable instead */
function isJoinable(booking: BookingListReadable): boolean {
  const startTime = parseStartTime(booking)
  if (!startTime) return false
  if (booking.status !== "confirmed" && booking.service_session?.status !== "in_progress") return false
  const minutesUntil = differenceInMinutes(startTime, new Date())
  return minutesUntil <= 15 && isFuture(startTime)
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
      // Sort by sequence number, then by start time
      if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber
      if (a.startTime && b.startTime) return a.startTime.getTime() - b.startTime.getTime()
      if (a.startTime) return -1
      if (b.startTime) return 1
      return 0
    })
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function CourseDeliverySkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-teal-50 via-cream-50 to-sage-50/30 px-6 py-12 pb-16">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 bg-teal-100/60 rounded-full" />
            <Skeleton className="h-6 w-32 bg-sage-100/60 rounded-full" />
          </div>
          <Skeleton className="h-12 w-3/4 bg-teal-100/40" />
          <Skeleton className="h-5 w-1/2 bg-teal-100/40" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-5 w-28 bg-teal-100/40" />
            <Skeleton className="h-5 w-24 bg-teal-100/40" />
            <Skeleton className="h-5 w-32 bg-teal-100/40" />
          </div>
          <Skeleton className="h-3 w-full bg-teal-100/50 rounded-full mt-4" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="pt-10 space-y-8">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="pt-10 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------

function HeroSection({
  service,
  practitioner,
  modules,
  completedCount,
  totalCount,
  progressPercent,
  firstDate,
  lastDate,
  isCanceled,
}: {
  service: any
  practitioner: any
  modules: ModuleBooking[]
  completedCount: number
  totalCount: number
  progressPercent: number
  firstDate: Date | null
  lastDate: Date | null
  isCanceled: boolean
}) {
  const allComplete = completedCount === totalCount && totalCount > 0
  const avgDuration = modules.length > 0
    ? Math.round(
        modules.reduce((sum, m) => sum + (m.durationMinutes ?? 0), 0) /
          modules.filter((m) => m.durationMinutes).length || 0
      )
    : null

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-cream-50 to-sage-50/30">
      <div className="relative z-10 px-6 pt-4 pb-6 max-w-6xl mx-auto">
        {/* Back link */}
        <Link
          href="/dashboard/user"
          className="inline-flex items-center gap-1.5 text-[13px] text-olive-400 hover:text-olive-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Journey
        </Link>

        <div className="max-w-[720px]">
          {/* Eyebrow badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider rounded-full px-2.5 py-0.5 bg-teal-100 text-teal-700">
              <BookOpen className="w-3 h-3" />
              Course
            </span>
            {totalCount > 0 && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider rounded-full px-2.5 py-0.5 ${
                allComplete ? "bg-sage-100 text-sage-700" : "bg-sage-100 text-sage-700"
              }`}>
                {allComplete ? (
                  <>
                    <Award className="w-3 h-3" />
                    Complete
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    {completedCount} of {totalCount} complete
                  </>
                )}
              </span>
            )}
            {isCanceled && (
              <Badge variant="destructive" className="text-[11px] uppercase tracking-wider">
                Canceled
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-[50px] font-medium text-olive-900 leading-none tracking-tight mb-3">
            {service?.name ?? "Course"}
          </h1>

          {/* Practitioner chip */}
          {practitioner && (
            <Link
              href={`/practitioners/${practitioner.slug || practitioner.id}`}
              className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity mb-5"
            >
              <Avatar className="w-8 h-8 border border-sage-200">
                {practitioner.profile_image_url ? (
                  <AvatarImage
                    src={practitioner.profile_image_url}
                    alt={practitioner.name ?? "Instructor"}
                  />
                ) : null}
                <AvatarFallback
                  className="text-white/80 text-xs font-serif italic"
                  style={{
                    background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                  }}
                >
                  {practitioner.name?.charAt(0) ?? "P"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-olive-600">
                with {practitioner.name}
              </span>
            </Link>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-5 flex-wrap mb-5">
            {totalCount > 0 && (
              <span className="flex items-center gap-1.5 text-[13px] text-olive-500">
                <BookOpen className="w-3.5 h-3.5" />
                {totalCount} sessions
              </span>
            )}
            {avgDuration && avgDuration > 0 && (
              <span className="flex items-center gap-1.5 text-[13px] text-olive-500">
                <Clock className="w-3.5 h-3.5" />
                ~{avgDuration} min each
              </span>
            )}
            {firstDate && lastDate && (
              <span className="flex items-center gap-1.5 text-[13px] text-olive-500">
                <Calendar className="w-3.5 h-3.5" />
                {format(firstDate, "MMM d")} &ndash; {format(lastDate, "MMM d")}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-olive-500">
                  {completedCount} of {totalCount} complete
                </span>
                <span className="text-olive-500">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-teal-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Curriculum Section
// ---------------------------------------------------------------------------

function CurriculumSection({
  modules,
  journeyUuid,
}: {
  modules: ModuleBooking[]
  journeyUuid: string
}) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const UPCOMING_THRESHOLD = 3

  const completed = modules.filter((m) => m.sessionStatus === "completed")
  const canceled = modules.filter((m) => m.sessionStatus === "canceled")

  // "Up next" is the first module that is scheduled and in the future
  const upNext = modules.find(
    (m) =>
      m.sessionStatus === "scheduled" &&
      m.startTime &&
      isFuture(m.startTime)
  )

  // "Upcoming" is everything else that is scheduled/draft and in the future, excluding up-next
  const upcoming = modules.filter(
    (m) =>
      m !== upNext &&
      m.sessionStatus !== "completed" &&
      m.sessionStatus !== "canceled" &&
      (m.startTime ? isFuture(m.startTime) : true)
  )

  const allCompleted = completed.length === modules.length && modules.length > 0

  const visibleUpcoming = showAllUpcoming
    ? upcoming
    : upcoming.slice(0, UPCOMING_THRESHOLD)
  const hiddenUpcomingCount = upcoming.length - UPCOMING_THRESHOLD

  return (
    <section className="mb-11">
      <div className="text-[11px] font-medium uppercase tracking-widest text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
        Curriculum
      </div>

      {/* All completed banner */}
      {allCompleted && (
        <div className="flex items-center gap-3 p-4 mb-5 rounded-xl border border-sage-200/60 bg-white">
          <Award className="h-6 w-6 shrink-0 text-teal-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-olive-900">Course Complete</p>
            <p className="text-xs text-olive-600 mt-0.5">
              Congratulations on finishing all modules!
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {/* Completed modules */}
        {completed.map((mod) => (
          <Link
            key={mod.booking.id ?? mod.sequenceNumber}
            href={`/dashboard/user/journeys/${journeyUuid}/${mod.booking.public_uuid}`}
            className="flex items-start gap-3.5 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-teal-200 hover:shadow-sm transition group cursor-pointer"
          >
            <CheckCircle className="h-5 w-5 text-sage-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-olive-900">
                {mod.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-olive-500 mt-0.5">
                {mod.startTime && <span>{format(mod.startTime, "MMM d")}</span>}
                {mod.durationMinutes && (
                  <>
                    <span>&middot;</span>
                    <span>{mod.durationMinutes} min</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {(mod.booking as any).recordings && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">
                  <PlayCircle className="w-3 h-3" />
                  Recording
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sage-50 text-olive-600">
                <StickyNote className="w-3 h-3" />
                Notes
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-olive-400 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}

        {/* Up Next module - highlighted */}
        {upNext && (
          <Link
            href={`/dashboard/user/journeys/${journeyUuid}/${upNext.booking.public_uuid}`}
            className="block my-1"
          >
            <div className="bg-white border-2 border-teal-300 rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-5 h-5 rounded-full mt-0.5 shrink-0 flex items-center justify-center bg-teal-600"
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                      Up Next
                    </span>
                  </div>
                  <p className="text-[15px] font-medium text-olive-900 mb-1.5">
                    {upNext.title}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-olive-600">
                    {upNext.startTime && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          {format(upNext.startTime, "EEE, MMM d")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          {format(upNext.startTime, "h:mm a")}
                        </span>
                      </>
                    )}
                    {upNext.durationMinutes && (
                      <span className="text-olive-500">
                        {upNext.durationMinutes} min
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3.5">
                    {isModuleJoinable(upNext) && (upNext.roomUuid || upNext.booking.room) ? (
                      <Button
                        size="sm"
                        className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[13px] gap-1.5"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={`/room/${upNext.roomUuid || upNext.booking.room}/lobby`}>
                          <Video className="w-3.5 h-3.5" />
                          Join Session
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-700">
                        View Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Upcoming modules */}
        {visibleUpcoming.map((mod) => (
          <Link
            key={mod.booking.id ?? mod.sequenceNumber}
            href={`/dashboard/user/journeys/${journeyUuid}/${mod.booking.public_uuid}`}
            className="flex items-start gap-3.5 p-4 bg-white/60 border border-sage-200/40 rounded-xl hover:border-teal-200 hover:shadow-sm transition group cursor-pointer"
          >
            <Circle className="h-5 w-5 text-sage-300 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-olive-600">{mod.title}</p>
              {mod.startTime && (
                <p className="text-xs text-olive-400 mt-0.5">
                  {format(mod.startTime, "MMM d")} &middot;{" "}
                  {format(mod.startTime, "h:mm a")}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-olive-400 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}

        {/* Show more / Show less for upcoming */}
        {hiddenUpcomingCount > 0 && !showAllUpcoming && (
          <button
            className="flex items-center gap-1.5 text-sm mt-2 ml-8 text-teal-700 transition-colors hover:opacity-75"
            onClick={() => setShowAllUpcoming(true)}
          >
            <ChevronDown className="h-4 w-4" />
            <span>
              {hiddenUpcomingCount} more session{hiddenUpcomingCount > 1 ? "s" : ""}
              {upcoming[UPCOMING_THRESHOLD]?.startTime &&
                upcoming[upcoming.length - 1]?.startTime && (
                  <>
                    {" "}
                    ({format(upcoming[UPCOMING_THRESHOLD].startTime!, "MMM d")}
                    {" - "}
                    {format(upcoming[upcoming.length - 1].startTime!, "MMM d")})
                  </>
                )}
            </span>
          </button>
        )}
        {showAllUpcoming && hiddenUpcomingCount > 0 && (
          <button
            className="flex items-center gap-1.5 text-sm mt-2 ml-8 text-teal-700 transition-colors hover:opacity-75"
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
            className="flex items-start gap-3.5 p-4 bg-white/40 border border-sage-200/30 rounded-xl opacity-50"
          >
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-olive-600 line-through">{mod.title}</p>
              {mod.startTime && (
                <p className="text-xs text-olive-400 mt-0.5">
                  {format(mod.startTime, "MMM d")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Course Resources Section
// ---------------------------------------------------------------------------

function CourseResourcesSection({ modules }: { modules: ModuleBooking[] }) {
  const router = useRouter()
  const completedModules = modules.filter((m) => m.sessionStatus === "completed")

  return (
    <section className="mb-11">
      <div className="text-[11px] font-medium uppercase tracking-widest text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
        Resources & Materials
      </div>

      {/* Recordings from completed sessions */}
      {completedModules.length > 0 && (
        <div className="space-y-2.5 mb-4">
          {completedModules.map(mod => (
            <div key={mod.sequenceNumber} className="flex items-center gap-3.5 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-teal-200 transition cursor-pointer">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50 text-teal-700">
                <Film className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-olive-900">{mod.title}</div>
                <div className="text-xs text-olive-500">{mod.durationMinutes} min · Recording</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-700 rounded-full"
                onClick={() => {
                  const recording = (mod.booking as any)?.recordings?.[0]
                  if (recording?.file_url) {
                    window.open(recording.file_url, '_blank')
                  } else if (mod.booking?.public_uuid) {
                    router.push(`/dashboard/user/bookings/${mod.booking.public_uuid}/recordings/${recording?.id || ''}`)
                  }
                }}
              >
                Watch
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder for attached files */}
      <div className="text-sm text-olive-400 italic">
        Course materials will appear here as your instructor shares them.
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Instructor Card
// ---------------------------------------------------------------------------

function InstructorSection({ practitioner }: { practitioner: any }) {
  if (!practitioner) return null

  return (
    <section className="mb-11">
      <div className="text-[11px] font-medium uppercase tracking-widest text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
        Your Instructor
      </div>
      <div className="flex gap-5 items-start bg-white border border-sage-200/60 rounded-xl p-5 md:p-6">
        <Avatar className="w-[68px] h-[68px] shrink-0">
          {practitioner.profile_image_url ? (
            <AvatarImage
              src={practitioner.profile_image_url}
              alt={practitioner.name ?? "Instructor"}
            />
          ) : null}
          <AvatarFallback
            className="text-white/80 font-serif text-2xl italic"
            style={{
              background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
            }}
          >
            {practitioner.name?.charAt(0) ?? "P"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-serif text-[22px] font-medium text-olive-900 mb-0.5">
            {practitioner.name}
          </div>
          <div className="text-[11.5px] uppercase tracking-wider text-olive-500 mb-2.5">
            Course Instructor
          </div>
          {practitioner.bio && (
            <p className="text-[13.5px] font-light leading-relaxed text-olive-600 mb-3">
              {practitioner.bio}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-full text-[13px] text-teal-700 border-sage-200/60 hover:bg-teal-50"
          >
            <Link
              href={`/practitioners/${practitioner.slug || practitioner.id}`}
            >
              View Full Profile
              <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Review Section (uses dialog via callback)
// ---------------------------------------------------------------------------

function ReviewSection({ onOpenReview }: { onOpenReview: () => void }) {
  return (
    <section className="mb-11">
      <div className="text-[11px] font-medium uppercase tracking-widest text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
        Share Your Experience
      </div>
      <div className="bg-white border border-sage-200/60 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-olive-900 flex items-center gap-2">
              <Star className="h-4 w-4 text-teal-600" />
              How was your course experience?
            </h3>
            <p className="text-xs text-olive-500 mt-1">
              Share your feedback to help others find great courses
            </p>
          </div>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-full"
            onClick={onOpenReview}
          >
            Leave Review
          </Button>
        </div>
      </div>
    </section>
  )
}


// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function CourseSidebar({
  booking,
  service,
  practitioner,
  modules,
  completedCount,
  totalCount,
  progressPercent,
  upNext,
  journeyData,
}: {
  booking: BookingDetailReadable
  service: any
  practitioner: any
  modules: ModuleBooking[]
  completedCount: number
  totalCount: number
  journeyData?: JourneyDetail
  progressPercent: number
  upNext: ModuleBooking | undefined
}) {
  const allComplete = completedCount === totalCount && totalCount > 0
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const bookingUuid = String(booking.public_uuid || (booking as any).id || "")

  const canCancelCourse = useMemo(() => {
    if (!modules.length) return false
    const firstSessionTime = modules[0]?.startTime
    if (!firstSessionTime) return true // no sessions yet, can cancel
    const daysSinceStart = Math.floor((Date.now() - firstSessionTime.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceStart <= 14
  }, [modules])

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

  const handleMessagePractitioner = async () => {
    const practitionerUserId = (practitioner as any)?.user_id
    if (!practitionerUserId) {
      toast.error("Unable to message instructor")
      return
    }
    try {
      const { data: convos } = await conversationsList({ query: { page_size: 100 } as any })
      const existing = (convos as any)?.results?.find(
        (c: any) => c.participants?.some((p: any) => p.user === practitionerUserId || p.user_id === practitionerUserId)
      )
      if (existing) {
        router.push(`/dashboard/user/messages?conversationId=${(existing as any).id}`)
        return
      }
      const result = await conversationsCreate({ body: { participant_ids: [practitionerUserId] } as any })
      router.push(`/dashboard/user/messages?conversationId=${(result.data as any)?.id}`)
    } catch {
      toast.error("Failed to start conversation")
    }
  }

  return (
    <aside className="lg:sticky lg:top-20 pb-16 flex flex-col self-start">
      {/* Ticket card */}
      <div className="bg-white border border-sage-200/60 rounded-xl overflow-visible relative mb-5">
        {/* Ticket header - KEEP dark */}
        <div className="relative overflow-hidden rounded-t-xl p-5 pb-[18px]" style={{
          background: `linear-gradient(135deg, #1e1508 0%, #2a2520 100%)`
        }}>
          {/* Service image background */}
          {(journeyData?.service_image_url || (service as any)?.featured_image_url) && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${journeyData?.service_image_url || (service as any)?.featured_image_url})` }}
            />
          )}
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1508] via-[#1e1508]/60 to-transparent" />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 80% 20%, ${TEAL}33 0%, transparent 60%)`,
            }}
          />
          <div className="relative z-10">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[#f5f0e8]/35 mb-1.5">
              Your Course
            </div>
            <div className="font-serif text-xl font-medium text-[#f5f0e8] leading-tight mb-3.5">
              {service?.name ?? "Course"}
            </div>

            {/* Progress bar inside ticket - teal */}
            <div className="space-y-1.5 mb-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#f5f0e8]/50">
                  {completedCount} of {totalCount} sessions complete
                </span>
                <span className="text-[#f5f0e8]/50">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: allComplete
                      ? "linear-gradient(90deg, #4a5e4a, #6b7f6b)"
                      : `linear-gradient(90deg, ${TEAL_DARK}, ${TEAL_LIGHT})`,
                  }}
                />
              </div>
            </div>

            {/* Next session date */}
            {upNext?.startTime && (
              <div className="flex items-center gap-2 text-[12px] text-[#f5f0e8]/50 mt-3">
                <Calendar className="w-3 h-3" style={{ color: TEAL_LIGHT }} />
                Next: <span className="text-[#f5f0e8]/80 font-medium">{format(upNext.startTime, "EEE, MMM d")}</span>
                <span>&middot;</span>
                <span className="text-[#f5f0e8]/80">{format(upNext.startTime, "h:mm a")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ticket tear */}
        <div className="flex items-center -mx-[1px]">
          <div className="w-4 h-4 rounded-full bg-[#f8f5f0] shrink-0 relative z-10" />
          <div className="flex-1 border-t-[1.5px] border-dashed border-sage-200/60 mx-1" />
          <div className="w-4 h-4 rounded-full bg-[#f8f5f0] shrink-0 relative z-10" />
        </div>

        {/* Ticket stub */}
        <div className="px-5 py-4">
          <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
            <span className="flex items-center gap-1.5 text-olive-500">
              <BookOpen className="w-3 h-3 text-teal-600" />
              Sessions
            </span>
            <span className="font-medium text-olive-900">{totalCount}</span>
          </div>
          <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
            <span className="flex items-center gap-1.5 text-olive-500">
              <CheckCircle className="w-3 h-3 text-teal-600" />
              Completed
            </span>
            <span className="font-medium text-olive-900">{completedCount}</span>
          </div>
          {practitioner && (
            <div className="flex justify-between py-[7px] text-[13px]">
              <span className="flex items-center gap-1.5 text-olive-500">
                <Users className="w-3 h-3 text-teal-600" />
                Instructor
              </span>
              <span className="font-medium text-olive-900 text-right text-xs">
                {practitioner.name}
              </span>
            </div>
          )}

          {/* Confirmation */}
          {booking.public_uuid && (
            <div className="mt-3 pt-3 border-t border-sage-200/60 text-center">
              <div className="text-[10px] tracking-[0.1em] uppercase text-olive-500 mb-1">
                Enrollment
              </div>
              <div className="font-serif text-lg font-medium tracking-wider text-teal-700">
                {booking.public_uuid.slice(0, 8).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mb-5">
        {/* Join Next Session */}
        {upNext && isModuleJoinable(upNext) && (upNext.roomUuid || upNext.booking.room) && (
          <Button
            className="w-full h-[50px] rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[15px] font-medium gap-2"
            asChild
          >
            <a href={`/room/${upNext.roomUuid || upNext.booking.room}/lobby`}>
              <Video className="w-4 h-4" />
              Join Next Session
            </a>
          </Button>
        )}

        {/* View Schedule */}
        <Button
          variant="outline"
          className="w-full h-11 rounded-full border-sage-200/60 text-olive-600 hover:border-teal-300 hover:text-olive-900 text-sm gap-2"
        >
          <Calendar className="w-3.5 h-3.5" />
          View Schedule
        </Button>

        {/* Message Instructor */}
        {practitioner && (
          <Button
            variant="outline"
            className="w-full h-11 rounded-full border-sage-200/60 text-olive-600 hover:border-teal-300 hover:text-olive-900 text-sm gap-2"
            onClick={handleMessagePractitioner}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Message {practitioner.name?.split(" ")[0] ?? "Instructor"}
          </Button>
        )}

        {/* Cancel Enrollment */}
        {!allComplete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <button
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={!canCancelCourse}
                    className="w-full text-center text-[12.5px] text-olive-400 hover:text-red-500 transition-colors py-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-olive-400"
                  >
                    Cancel Enrollment
                  </button>
                </div>
              </TooltipTrigger>
              {!canCancelCourse && (
                <TooltipContent>
                  <p>Cancellation window has passed. Please contact support.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
        {!allComplete && canCancelCourse && (
          <p className="text-[11px] text-olive-400 text-center -mt-1">
            This will cancel all remaining sessions
          </p>
        )}
      </div>

      {/* Practitioner contact chip */}
      {practitioner && (
        <div className="flex items-center gap-3 p-4 bg-white border border-sage-200/60 rounded-xl mb-5">
          <Avatar className="w-11 h-11">
            {practitioner.profile_image_url ? (
              <AvatarImage
                src={practitioner.profile_image_url}
                alt={practitioner.name ?? "Instructor"}
              />
            ) : null}
            <AvatarFallback
              className="text-white/80 font-serif text-lg italic"
              style={{
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
              }}
            >
              {practitioner.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-olive-900 truncate">
              {practitioner.name}
            </div>
            <div className="text-xs text-olive-500">Your instructor</div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-xs shrink-0 gap-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100"
            onClick={handleMessagePractitioner}
          >
            <MessageSquare className="w-3 h-3" />
            Message
          </Button>
        </div>
      )}

      {/* Related Offerings upsell */}
      {practitioner && (
        <div className="rounded-xl p-[18px] bg-teal-50/50 border border-teal-200/40">
          <div className="text-[10px] tracking-[0.1em] uppercase mb-2 text-teal-700">
            Continue the work
          </div>
          <div className="font-serif text-[18px] font-medium text-olive-900 mb-1">
            More from {practitioner.name?.split(" ")[0]}
          </div>
          <div className="text-[12.5px] text-olive-500 leading-snug mb-3">
            Explore other sessions, workshops, and courses offered by your instructor.
          </div>
          <Button
            className="w-full h-[38px] rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-medium gap-1.5"
            asChild
          >
            <Link href={`/practitioners/${practitioner.slug || practitioner.id}`}>
              <BookOpen className="w-3.5 h-3.5" />
              Explore Offerings
            </Link>
          </Button>
        </div>
      )}

      {/* ── Cancel Dialog ── */}
      <CancelBookingDialog
        bookingId={booking.public_uuid || String(booking.id)}
        serviceName={service?.name || "Course"}
        practitionerName={practitioner?.name || "Instructor"}
        date={modules[0]?.startTime ? format(modules[0].startTime, "MMMM d, yyyy") : ""}
        time={modules[0]?.startTime ? format(modules[0].startTime, "h:mm a") : ""}
        price={`$${booking.credits_allocated_dollars || 0}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={(reason) => cancelBooking(reason)}
        isLoading={isCancelling}
      />
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CourseDelivery({ bookingUuid, journeyData }: CourseDeliveryProps) {
  // If journeyData is provided, use it directly
  const hasJourneyData = !!journeyData?.sessions?.length

  // Only fetch from bookings API as fallback when no journeyData
  const {
    data: initialBooking,
    isLoading: isLoadingInitial,
    error: initialError,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingUuid } }),
    enabled: !hasJourneyData && !!bookingUuid,
  })

  // 2. Fetch ALL bookings for this user, then filter client-side by same service
  const serviceId = initialBooking?.service?.id
  const {
    data: allBookingsData,
    isLoading: isLoadingAll,
  } = useQuery({
    ...bookingsListOptions({
      query: {
        ordering: "created_at",
        page_size: 200,
      },
    }),
    enabled: !hasJourneyData && !!serviceId,
  })

  // 3. Filter to only bookings for the same service (same course)
  const courseBookings = useMemo(() => {
    if (!allBookingsData?.results || !serviceId) return []
    return (allBookingsData.results as BookingListReadable[]).filter(
      (b) => b.service?.id === serviceId && b.status !== "canceled"
    )
  }, [allBookingsData?.results, serviceId])

  // 4. Build modules from journeyData.sessions OR from bookings
  const modules = useMemo(() => {
    if (hasJourneyData) {
      // Map JourneySession[] to ModuleBooking[] format
      return journeyData!.sessions.map((s, index) => ({
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
      })).sort((a, b) => {
        if (a.sequenceNumber !== b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber
        if (a.startTime && b.startTime) return a.startTime.getTime() - b.startTime.getTime()
        return 0
      })
    }
    return buildModules(courseBookings)
  }, [hasJourneyData, journeyData, courseBookings])

  // Service/practitioner from journeyData or booking
  const serviceName = journeyData?.service_name || initialBooking?.service?.name
  const serviceDescription = journeyData?.service_description || initialBooking?.service?.description
  const practitionerName = journeyData?.practitioner?.name || (initialBooking?.practitioner as any)?.display_name || (initialBooking?.practitioner as any)?.name
  const practitionerSlug = journeyData?.practitioner?.slug || (initialBooking?.practitioner as any)?.slug
  const practitionerBio = journeyData?.practitioner?.bio || (initialBooking?.practitioner as any)?.bio
  const practitionerUuid = journeyData?.practitioner?.public_uuid || (initialBooking?.practitioner as any)?.public_uuid

  // Build unified service/practitioner objects for child components
  const service = hasJourneyData
    ? { name: serviceName, description: serviceDescription }
    : initialBooking?.service
  const practitioner = hasJourneyData
    ? journeyData!.practitioner
      ? {
          name: practitionerName,
          slug: practitionerSlug,
          bio: practitionerBio,
          public_uuid: practitionerUuid,
          id: practitionerUuid,
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

  // Date range
  const firstDate = modules[0]?.startTime ?? null
  const lastDate = modules[modules.length - 1]?.startTime ?? null

  // Up next module
  const upNext = modules.find(
    (m) =>
      m.sessionStatus === "scheduled" &&
      m.startTime &&
      isFuture(m.startTime)
  )

  // Check if entire course is canceled
  const isCanceled = hasJourneyData ? false : initialBooking?.status === "canceled"

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  // Loading state
  if (!hasJourneyData && (isLoadingInitial || (serviceId && isLoadingAll))) {
    return <CourseDeliverySkeleton />
  }

  // Error state (only applies to fallback path)
  if (!hasJourneyData && (initialError || !initialBooking)) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-[#9b9088] mb-4">
          Failed to load course details.
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/user">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {/* Hero */}
      <HeroSection
        service={service}
        practitioner={practitioner}
        modules={modules}
        completedCount={completedCount}
        totalCount={totalCount}
        progressPercent={progressPercent}
        firstDate={firstDate}
        lastDate={lastDate}
        isCanceled={isCanceled}
      />

      {/* Body - two column */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Main column */}
        <main className="pt-4 pb-16 min-w-0">
          {/* Canceled banner */}
          {isCanceled && (
            <div className="mb-8 rounded-lg bg-red-50 border border-red-200 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-2">
                <AlertCircle className="w-4 h-4" />
                Course Enrollment Canceled
              </div>
              {initialBooking?.cancellation_reason && (
                <p className="text-sm text-red-700">
                  Reason: {initialBooking.cancellation_reason}
                </p>
              )}
            </div>
          )}

          {!isCanceled && (
            <>
              {/* Curriculum - the primary content */}
              <CurriculumSection
                modules={modules}
                journeyUuid={bookingUuid}
              />

              {/* Course Resources */}
              <CourseResourcesSection modules={modules} />

              {/* Instructor */}
              <InstructorSection practitioner={practitioner} />

              {/* Journal */}
              <JournalSection bookingUuid={bookingUuid} serviceUuid={journeyData?.service_uuid || String((service as any)?.public_uuid || "")} accentColor="teal" />

              {/* Review moved to sidebar */}
            </>
          )}
        </main>

        {/* Sidebar */}
        <CourseSidebar
          booking={initialBooking ?? { public_uuid: bookingUuid } as any}
          service={service}
          practitioner={practitioner}
          modules={modules}
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
          upNext={upNext}
          journeyData={journeyData}
        />
      </div>

      {/* Review Dialog */}
      {initialBooking && (
        <ReviewBookingDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          booking={initialBooking as any}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
          }}
        />
      )}
    </div>
  )
}
