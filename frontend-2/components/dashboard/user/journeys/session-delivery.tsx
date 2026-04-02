"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { conversationsCreate, conversationsList } from "@/src/client"
import type { BookingDetailReadable, JourneyDetail } from "@/src/client/types.gen"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import JournalSection from "@/components/dashboard/user/journeys/journal-section"
import FormsStatusBanner from "@/components/dashboard/user/journeys/forms-status-banner"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  Play,
  CalendarRange,
  XCircle,
  CheckCircle,
  MessageSquare,
  Film,
  FileText,
  Star,
  ExternalLink,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"
import { ReviewBookingDialog } from "@/components/dashboard/user/bookings/review-booking-dialog"
import { format, parseISO, differenceInHours, isPast } from "date-fns"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionDeliveryProps {
  booking?: BookingDetailReadable
  refetch: () => void
  journeyData?: JourneyDetail
}

type SessionState = "unscheduled" | "upcoming" | "joinable" | "in_progress" | "completed" | "canceled"

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

function generateCalendarUrl(
  title: string,
  startTime: Date,
  endTime: Date,
  description: string,
  location: string
): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(startTime)}/${fmt(endTime)}`,
    details: description,
    location: location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function deriveSessionState(booking: BookingDetailReadable): SessionState {
  if (booking.status === "canceled") return "canceled"
  const sessionStatus = booking.service_session?.status
  if (sessionStatus === "completed") return "completed"
  if (sessionStatus === "in_progress") return "in_progress"
  const startTime = booking.service_session?.start_time
  if (!startTime) return "unscheduled"
  const start = toDate(startTime)
  const endTime = booking.service_session?.end_time
  const end = endTime
    ? toDate(endTime)
    : new Date(start.getTime() + 60 * 60 * 1000)
  const now = new Date()
  const joinWindow = new Date(start.getTime() - 15 * 60 * 1000)
  if (now >= joinWindow && now < end && booking.status === "confirmed")
    return "joinable"
  if (isPast(end)) return "completed"
  return "upcoming"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionDelivery({
  booking,
  refetch,
  journeyData,
}: SessionDeliveryProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [checkedPrep, setCheckedPrep] = useState<Set<string>>(new Set())
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 })

  // Build effective booking from journeyData if no booking prop
  const effectiveBooking: BookingDetailReadable | undefined =
    booking ??
    (journeyData
      ? (() => {
          const s = journeyData.sessions?.[0]
          return {
            public_uuid: s?.booking_uuid,
            status: s?.booking_status,
            client_notes: s?.client_notes ?? "",
            confirmed_at: s?.confirmed_at ?? undefined,
            completed_at: s?.completed_at ?? undefined,
            service: {
              name: journeyData.service_name,
              description: journeyData.service_description,
              public_uuid: journeyData.service_uuid,
              location_type: journeyData.service_location_type || "virtual",
            },
            practitioner: journeyData.practitioner
              ? {
                  display_name: journeyData.practitioner.name,
                  name: journeyData.practitioner.name,
                  slug: journeyData.practitioner.slug,
                  public_uuid: journeyData.practitioner.public_uuid,
                  bio: journeyData.practitioner.bio,
                  profile_image_url: journeyData.practitioner.profile_image_url,
                  user_id: journeyData.practitioner.user_id,
                }
              : undefined,
            service_session: s
              ? {
                  title: s.title,
                  description: s.description,
                  start_time: s.start_time ?? undefined,
                  end_time: s.end_time ?? undefined,
                  status: s.status,
                  duration: s.duration_minutes,
                  sequence_number: s.sequence_number,
                  agenda: s.agenda,
                  what_youll_learn: s.what_youll_learn,
                  max_participants: s.max_participants,
                  current_participants: s.current_participants,
                }
              : undefined,
            room: s?.room_uuid,
            duration_minutes: s?.duration_minutes,
          } as any as BookingDetailReadable
        })()
      : undefined)

  if (!effectiveBooking) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-olive-500">Loading session...</p>
      </div>
    )
  }

  const service = effectiveBooking.service
  const practitioner = effectiveBooking.practitioner
  const session = effectiveBooking.service_session
  const startTime = session?.start_time
  const endTime = session?.end_time
  const isVirtual = (service as any)?.location_type === "virtual"
  const rawDuration =
    effectiveBooking.duration_minutes ?? session?.duration ?? journeyData?.service_duration_minutes
  const duration = rawDuration && rawDuration < 600 ? rawDuration : journeyData?.service_duration_minutes || rawDuration
  const sessionState = deriveSessionState(effectiveBooking)
  const imageUrl = journeyData?.service_image_url || ""
  const bookingUuid = String(
    effectiveBooking.public_uuid || (effectiveBooking as any).id || ""
  )

  // Room UUID
  const roomUuid =
    typeof effectiveBooking.room === "object" && effectiveBooking.room
      ? (effectiveBooking.room as any).public_uuid
      : effectiveBooking.room

  // Modifiable check (24+ hrs before)
  const isModifiable = (() => {
    if (effectiveBooking.status !== "confirmed" || !startTime) return false
    const start = toDate(startTime)
    return differenceInHours(start, new Date()) >= 24
  })()

  // Countdown timer
  useEffect(() => {
    if (!startTime || sessionState !== "upcoming") return
    const update = () => {
      const now = new Date()
      const start = toDate(startTime)
      const diff = start.getTime() - now.getTime()
      if (diff <= 0) return
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
      })
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [startTime, sessionState])

  const fmt = (n: number) => String(n).padStart(2, "0")

  // Cancel mutation
  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (reason: string) => {
      const { bookingsCancelCreate } = await import("@/src/client")
      await bookingsCancelCreate({
        path: { public_uuid: bookingUuid },
        body: { reason, status: "canceled", canceled_by: "client" } as any,
      })
    },
    onSuccess: () => {
      toast.success("Session canceled")
      refetch()
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookingsRetrieve'] })
      queryClient.invalidateQueries({ queryKey: ['bookingsList'] })
      queryClient.invalidateQueries({ queryKey: ['journeys'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: () => {
      toast.error("Failed to cancel. Please try again.")
    },
  })

  // Message practitioner
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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── COMPACT HEADER ── */}
      <div className="bg-gradient-to-r from-sage-50/80 to-cream-50 border-b border-sage-200/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/dashboard/user/journeys"
            className="inline-flex items-center gap-2 text-[13px] text-olive-500 hover:text-sage-600 transition-colors min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Journey
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase px-3 py-1 rounded-full ${
              sessionState === "unscheduled"
                ? "bg-amber-50 border border-amber-200 text-amber-600"
                : sessionState === "completed"
                ? "bg-sage-100 border border-sage-200 text-sage-600"
                : sessionState === "canceled"
                ? "bg-red-50 border border-red-200 text-red-600"
                : sessionState === "joinable" || sessionState === "in_progress"
                ? "bg-emerald-100 border border-emerald-300 text-emerald-700"
                : "bg-sage-100 border border-sage-300 text-sage-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sessionState === "unscheduled"
                  ? "bg-amber-500"
                  : sessionState === "completed"
                  ? "bg-sage-500"
                  : sessionState === "canceled"
                  ? "bg-red-400"
                  : sessionState === "joinable" || sessionState === "in_progress"
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-sage-500 animate-pulse"
              }`}
            />
            {sessionState === "unscheduled"
              ? "Needs Scheduling"
              : sessionState === "upcoming"
              ? "Confirmed"
              : sessionState === "joinable"
              ? "Live"
              : sessionState === "in_progress"
              ? "In Progress"
              : sessionState === "completed"
              ? "Completed"
              : "Canceled"}
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
            {/* Hero Card — service image + title + key info */}
            <div className="relative rounded-2xl overflow-hidden bg-[#2a2a20]">
              {/* Background image */}
              {imageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2a2a20] via-[#2a2a20]/70 to-[#2a2a20]/40" />

              <div className="relative z-10 p-5 sm:p-8 pb-5 sm:pb-7">
                <div className="text-[11px] font-medium tracking-widest uppercase text-white/40 mb-2">
                  {isVirtual ? "Virtual Session" : "In-Person Session"}
                </div>
                <h1 className="font-serif text-[24px] sm:text-[28px] md:text-[34px] font-medium text-white/95 leading-tight mb-4">
                  {service?.name ?? "Session"}
                </h1>

                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  {/* Practitioner */}
                  {practitioner && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/20">
                        {(practitioner as any)?.profile_image_url && (
                          <AvatarImage src={(practitioner as any).profile_image_url} alt={(practitioner as any)?.display_name || ""} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-sage-200 to-sage-300 text-white/70 text-xs font-serif italic">
                          {(practitioner as any)?.display_name?.charAt(0) ||
                            practitioner?.name?.charAt(0) ||
                            "P"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] text-white/60">
                        with{" "}
                        <span className="text-white/85 font-medium">
                          {(practitioner as any)?.display_name ||
                            practitioner?.name}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                    <Calendar className="h-3.5 w-3.5" />
                    {startTime
                      ? format(toDate(startTime), "MMM d, yyyy")
                      : "Not yet scheduled"}
                  </span>

                  {/* Duration */}
                  {duration && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Unscheduled Notice */}
            {sessionState === "unscheduled" && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <CalendarRange className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-amber-800">
                    This session hasn't been scheduled yet
                  </p>
                  <p className="text-[13px] text-amber-600 mt-1">
                    Choose a date and time that works for you to get started.
                  </p>
                </div>
              </div>
            )}

            {/* Canceled Notice */}
            {sessionState === "canceled" && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-red-800">
                    This session has been canceled
                  </p>
                  {effectiveBooking.cancellation_reason && (
                    <p className="text-[13px] text-red-600 mt-1">
                      {effectiveBooking.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* About */}
            {service?.description && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-3 pb-2 border-b border-sage-200/50">
                  About This Session
                </h2>
                <p className="text-[15px] font-light leading-relaxed text-olive-600">
                  {service.description}
                </p>
              </div>
            )}

            {/* Prep Checklist — upcoming only */}
            {sessionState === "upcoming" && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-3 pb-2 border-b border-sage-200/50">
                  Prepare for Your Session
                </h2>
                <div className="space-y-2">
                  {[
                    { id: "space", text: "Find a quiet, comfortable space" },
                    { id: "tech", text: "Test your camera and microphone" },
                    { id: "intent", text: "Set an intention for this session" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const next = new Set(checkedPrep)
                        next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                        setCheckedPrep(next)
                      }}
                      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        checkedPrep.has(item.id)
                          ? "bg-sage-50 border-sage-300 text-olive-500 line-through"
                          : "bg-white border-sage-200/60 text-olive-700 hover:border-sage-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checkedPrep.has(item.id)
                            ? "bg-sage-500 border-sage-500 text-white"
                            : "border-sage-300"
                        }`}
                      >
                        {checkedPrep.has(item.id) && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                      </div>
                      <span className="text-[14px]">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resources — completed only */}
            {sessionState === "completed" &&
              effectiveBooking.recordings &&
              (effectiveBooking.recordings as unknown as any[]).length > 0 && (
                <div>
                  <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-3 pb-2 border-b border-sage-200/50">
                    Session Recording
                  </h2>
                  {(effectiveBooking.recordings as unknown as any[]).map(
                    (rec: any, idx: number) => (
                      <div
                        key={rec.id || idx}
                        className="flex items-center gap-4 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-sage-300 transition cursor-pointer"
                        onClick={() => {
                          if (rec?.file_url) window.open(rec.file_url, "_blank")
                          else if (rec?.id)
                            router.push(
                              `/dashboard/user/bookings/${bookingUuid}/recordings/${rec.id}`
                            )
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-sage-600">
                          <Film className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[14px] font-medium text-olive-900">
                            Watch Recording
                          </div>
                          <div className="text-[12px] text-olive-500">
                            {rec.duration_formatted ||
                              (rec.duration_seconds
                                ? formatDuration(
                                    Math.round(rec.duration_seconds / 60)
                                  )
                                : "Recording available")}
                          </div>
                        </div>
                        <Play className="h-4 w-4 text-sage-500" />
                      </div>
                    )
                  )}
                </div>
              )}

            {/* Resources — show whenever available */}
            {(effectiveBooking as any).resources &&
              Array.isArray((effectiveBooking as any).resources) &&
              (effectiveBooking as any).resources.length > 0 && (
                <div>
                  <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-3 pb-2 border-b border-sage-200/50">
                    Resources & Materials
                  </h2>
                  <div className="space-y-2">
                    {(effectiveBooking as any).resources.map(
                      (resource: any, i: number) => (
                        <div
                          key={resource?.id ?? i}
                          className="flex items-center gap-4 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-sage-300 transition cursor-pointer"
                          onClick={() => {
                            if (resource?.file_url)
                              window.open(resource.file_url, "_blank")
                            else if (resource?.external_url)
                              window.open(resource.external_url, "_blank")
                          }}
                        >
                          <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-sage-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[14px] font-medium text-olive-900">
                              {resource.title ?? "Resource"}
                            </div>
                            <div className="text-[12px] text-olive-500">
                              {resource.description ?? ""}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Journal */}
            <JournalSection bookingUuid={bookingUuid} accentColor="sage" />

            {/* Practitioner Card */}
            {practitioner && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-3 pb-2 border-b border-sage-200/50">
                  Your Practitioner
                </h2>
                <div className="flex items-start gap-4 p-5 bg-white border border-sage-200/60 rounded-xl">
                  <Avatar className="h-14 w-14">
                    {(practitioner as any)?.profile_image_url && (
                      <AvatarImage src={(practitioner as any).profile_image_url} alt={(practitioner as any)?.display_name || ""} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-sage-200 to-sage-300 text-olive-700 font-serif text-xl italic">
                      {(practitioner as any)?.display_name?.charAt(0) ||
                        practitioner?.name?.charAt(0) ||
                        "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-[16px] font-medium text-olive-900">
                      {(practitioner as any)?.display_name || practitioner?.name}
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
                        className="rounded-full text-[12px] border-sage-200 text-olive-600 hover:border-sage-300 min-h-[44px] sm:min-h-0"
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
                        className="rounded-full text-[12px] border-sage-200 text-olive-600 hover:border-sage-300 min-h-[44px] sm:min-h-0"
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
            {/* Countdown — upcoming only */}
            {sessionState === "upcoming" && startTime && (
              <div className="flex items-center justify-center gap-5 px-5 py-4 bg-sage-50 border border-sage-200 rounded-xl text-center">
                <div>
                  <div className="font-serif text-2xl font-medium text-sage-700 leading-none">
                    {fmt(countdown.days)}
                  </div>
                  <div className="text-[9px] tracking-widest uppercase text-olive-500 mt-0.5">
                    Days
                  </div>
                </div>
                <span className="text-sage-300 text-lg">·</span>
                <div>
                  <div className="font-serif text-2xl font-medium text-sage-700 leading-none">
                    {fmt(countdown.hours)}
                  </div>
                  <div className="text-[9px] tracking-widest uppercase text-olive-500 mt-0.5">
                    Hrs
                  </div>
                </div>
                <span className="text-sage-300 text-lg">·</span>
                <div>
                  <div className="font-serif text-2xl font-medium text-sage-700 leading-none">
                    {fmt(countdown.mins)}
                  </div>
                  <div className="text-[9px] tracking-widest uppercase text-olive-500 mt-0.5">
                    Min
                  </div>
                </div>
              </div>
            )}

            {/* Live banner — joinable */}
            {(sessionState === "joinable" || sessionState === "in_progress") && (
              <div className="flex items-center gap-3 px-5 py-3.5 bg-sage-50 border border-sage-200 rounded-xl">
                <Clock className="h-5 w-5 text-sage-600 shrink-0" />
                <div className="text-[13px] text-sage-700">
                  <strong>
                    {sessionState === "in_progress"
                      ? "Session in progress"
                      : "Starting soon"}
                  </strong>
                </div>
              </div>
            )}

            {/* Session Details Card */}
            <div className="bg-white border border-sage-200/60 rounded-xl overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-sage-200/40 bg-sage-50/50">
                <div className="text-[10px] font-medium tracking-widest uppercase text-olive-500 mb-1">
                  Session Details
                </div>
              </div>

              <div className="px-5 py-3">
                {/* Date */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-500">
                    <Calendar className="h-3.5 w-3.5 text-sage-500" />
                    Date
                  </span>
                  <span className="font-medium text-olive-800">
                    {startTime
                      ? format(toDate(startTime), "MMM d, yyyy")
                      : "Not scheduled"}
                  </span>
                </div>

                {/* Time */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-500">
                    <Clock className="h-3.5 w-3.5 text-sage-500" />
                    Time
                  </span>
                  <span className="font-medium text-olive-800">
                    {startTime
                      ? format(toDate(startTime), "h:mm a")
                      : "Not scheduled"}
                  </span>
                </div>

                {/* Duration */}
                {duration && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="text-olive-500">Duration</span>
                    <span className="font-medium text-olive-800">
                      {formatDuration(duration)}
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-500">
                    {isVirtual ? (
                      <Video className="h-3.5 w-3.5 text-sage-500" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-sage-500" />
                    )}
                    Location
                  </span>
                  <span className="font-medium text-olive-800">
                    {isVirtual ? "Virtual" : "In Person"}
                  </span>
                </div>

                {/* Confirmation */}
                <div className="flex justify-between py-2.5 text-[13px]">
                  <span className="text-olive-500">Confirmation</span>
                  <span className="font-mono text-[11px] text-sage-600 tracking-wide">
                    {bookingUuid.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Unscheduled: Schedule Session */}
              {sessionState === "unscheduled" && (
                <>
                  <Button
                    className="w-full h-12 rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium"
                    asChild
                  >
                    <Link href={`/dashboard/user/bookings/${bookingUuid}/schedule`}>
                      <CalendarRange className="h-4 w-4 mr-2" />
                      Schedule Session
                    </Link>
                  </Button>
                  <p className="text-center text-[12px] text-olive-500 px-2">
                    Pick a time from your practitioner's available slots
                  </p>
                </>
              )}

              {/* Upcoming: Join (disabled), Calendar, Reschedule, Cancel */}
              {sessionState === "upcoming" && (
                <>
                  {isVirtual && roomUuid && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              className="w-full h-11 rounded-full bg-sage-600 text-white"
                              disabled
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Join Session
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Available 15 minutes before your session
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-full border-sage-200 text-olive-600 hover:border-sage-300 text-[13px]"
                    onClick={() => {
                      if (!startTime) return
                      const start = toDate(startTime)
                      const end = endTime
                        ? toDate(endTime)
                        : new Date(start.getTime() + (duration || 60) * 60000)
                      window.open(
                        generateCalendarUrl(
                          service?.name || "Session",
                          start,
                          end,
                          `Session with ${(practitioner as any)?.display_name || "your practitioner"}`,
                          isVirtual ? "Virtual (Estuary)" : "In Person"
                        ),
                        "_blank"
                      )
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-2" />
                    Add to Calendar
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-full border-sage-200 text-olive-600 hover:border-sage-300 text-[13px]"
                    disabled={!isModifiable}
                    onClick={() =>
                      router.push(
                        `/dashboard/user/bookings/${bookingUuid}/reschedule`
                      )
                    }
                  >
                    <CalendarRange className="h-3.5 w-3.5 mr-2" />
                    Reschedule
                  </Button>
                  <button
                    className="w-full text-center text-[12px] text-olive-500 hover:text-red-500 py-2 min-h-[44px] transition-colors"
                    disabled={!isModifiable}
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    Cancel Session
                  </button>
                </>
              )}

              {/* Joinable / In Progress: Join Now */}
              {(sessionState === "joinable" || sessionState === "in_progress") &&
                isVirtual &&
                roomUuid && (
                  <Button
                    className="w-full h-12 rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium"
                    asChild
                  >
                    <Link href={`/room/${roomUuid}/lobby`}>
                      <Play className="h-4 w-4 mr-2" />
                      Join Now
                    </Link>
                  </Button>
                )}

              {/* Completed: Watch Recording, Leave Review */}
              {sessionState === "completed" && (
                <>
                  {effectiveBooking.recordings &&
                    (effectiveBooking.recordings as unknown as any[]).length >
                      0 && (
                      <Button
                        className="w-full h-11 rounded-full bg-sage-600 hover:bg-sage-700 text-white"
                        onClick={() => {
                          const rec = (
                            effectiveBooking.recordings as unknown as any[]
                          )[0]
                          if (rec?.file_url) window.open(rec.file_url, "_blank")
                          else if (rec?.id)
                            router.push(
                              `/dashboard/user/bookings/${bookingUuid}/recordings/${rec.id}`
                            )
                        }}
                      >
                        <Film className="h-4 w-4 mr-2" />
                        Watch Recording
                      </Button>
                    )}
                  {!(effectiveBooking as any).has_review && (
                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-full border-sage-200 text-olive-600 hover:border-sage-300 text-[13px]"
                      onClick={() => setReviewDialogOpen(true)}
                    >
                      <Star className="h-3.5 w-3.5 mr-2" />
                      Leave Review
                    </Button>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Dialogs */}
      {/* @ts-expect-error — CancelBookingDialog props may not match exactly */}
      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        booking={effectiveBooking as any}
        onConfirm={(reason: string) => cancelBooking(reason)}
        isLoading={isCancelling}
      />
      <ReviewBookingDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={effectiveBooking as any}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
