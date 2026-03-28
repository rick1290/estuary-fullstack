"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { conversationsCreate } from "@/src/client"
import { bookingsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import type {
  BookingDetailReadable,
  JourneyDetail,
} from "@/src/client/types.gen"
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
  Users,
  Play,
  XCircle,
  MessageSquare,
  Film,
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
import { format, parseISO, isPast } from "date-fns"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkshopDeliveryProps {
  bookingUuid: string
  journeyData?: JourneyDetail
}

type WorkshopState = "upcoming" | "joinable" | "live" | "completed" | "canceled"

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

function deriveWorkshopState(booking: BookingDetailReadable): WorkshopState {
  if (booking.status === "canceled") return "canceled"
  const session = booking.service_session
  if (session?.status === "completed") return "completed"
  if (session?.status === "in_progress") return "live"
  const startTime = session?.start_time
  if (startTime) {
    const start = toDate(startTime)
    const endTime = session?.end_time
    const end = endTime
      ? toDate(endTime)
      : new Date(start.getTime() + 60 * 60 * 1000)
    const now = new Date()
    const joinWindow = new Date(start.getTime() - 15 * 60 * 1000)
    if (now >= joinWindow && now < end && booking.status === "confirmed")
      return "joinable"
    if (isPast(end)) return "completed"
  }
  return "upcoming"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkshopDelivery({
  bookingUuid,
  journeyData,
}: WorkshopDeliveryProps) {
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 })

  const {
    data: booking,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingUuid } }),
  })

  const workshopState = useMemo(
    () => (booking ? deriveWorkshopState(booking) : "upcoming"),
    [booking]
  )

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-olive-400">Loading workshop...</p>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-olive-400">Failed to load workshop details.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/user/journeys">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journeys
          </Link>
        </Button>
      </div>
    )
  }

  const service = booking.service
  const practitioner = booking.practitioner
  const session = booking.service_session
  const startTime = session?.start_time
  const endTime = session?.end_time
  const isVirtual = service?.location_type === "virtual"
  const duration =
    booking.duration_minutes ?? session?.duration ?? journeyData?.service_duration_minutes
  const imageUrl = journeyData?.service_image_url || (service as any)?.featured_image_url || ""
  const bUuid = String(booking.public_uuid || (booking as any).id || "")

  // Room UUID
  const roomUuid =
    typeof booking.room === "object" && booking.room
      ? (booking.room as any).public_uuid
      : booking.room

  // Participant info
  const maxParticipants = session?.max_participants
  const currentParticipants = session?.current_participants

  // Countdown timer
  useEffect(() => {
    if (!startTime || workshopState !== "upcoming") return
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
  }, [startTime, workshopState])

  const fmt = (n: number) => String(n).padStart(2, "0")

  // Cancel mutation
  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (reason: string) => {
      const { bookingsCancelCreate } = await import("@/src/client")
      await bookingsCancelCreate({
        path: { public_uuid: bUuid },
        body: { reason, status: "canceled", canceled_by: "client" } as any,
      })
    },
    onSuccess: () => {
      toast.success("Workshop booking canceled")
      refetch()
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
      {/* -- COMPACT HEADER -- */}
      <div className="bg-gradient-to-r from-amber-50/80 to-cream-50 border-b border-amber-200/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/dashboard/user/journeys"
            className="inline-flex items-center gap-2 text-[13px] text-olive-400 hover:text-amber-600 transition-colors min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Journeys
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase px-3 py-1 rounded-full ${
              workshopState === "completed"
                ? "bg-amber-100 border border-amber-200 text-amber-600"
                : workshopState === "canceled"
                ? "bg-red-50 border border-red-200 text-red-600"
                : workshopState === "joinable" || workshopState === "live"
                ? "bg-emerald-100 border border-emerald-300 text-emerald-700"
                : "bg-amber-100 border border-amber-300 text-amber-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                workshopState === "completed"
                  ? "bg-amber-500"
                  : workshopState === "canceled"
                  ? "bg-red-400"
                  : workshopState === "joinable" || workshopState === "live"
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            {workshopState === "upcoming"
              ? "Registered"
              : workshopState === "joinable"
              ? "Live"
              : workshopState === "live"
              ? "In Progress"
              : workshopState === "completed"
              ? "Attended"
              : "Canceled"}
          </span>
        </div>
      </div>

      {/* -- MAIN CONTENT -- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Pre-session forms banner */}
        <FormsStatusBanner bookingUuid={bUuid} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
          {/* -- LEFT COLUMN -- */}
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
                  {isVirtual ? "Virtual Workshop" : "In-Person Workshop"}
                </div>
                <h1 className="font-serif text-[24px] sm:text-[28px] md:text-[34px] font-medium text-white/95 leading-tight mb-4">
                  {service?.name ?? "Workshop"}
                </h1>

                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  {/* Practitioner */}
                  {practitioner && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/20">
                        {practitioner.profile_image_url ? (
                          <AvatarImage
                            src={practitioner.profile_image_url}
                            alt={practitioner.name ?? "Facilitator"}
                          />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-amber-200 to-amber-300 text-white/70 text-xs font-serif italic">
                          {practitioner?.name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] text-white/60">
                        with{" "}
                        <span className="text-white/85 font-medium">
                          {practitioner?.name}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  {startTime && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(toDate(startTime), "MMM d, yyyy")}
                    </span>
                  )}

                  {/* Duration */}
                  {duration && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(duration)}
                    </span>
                  )}

                  {/* Participants */}
                  {maxParticipants && (
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50">
                      <Users className="h-3.5 w-3.5" />
                      {currentParticipants != null
                        ? `${currentParticipants} of ${maxParticipants}`
                        : `Up to ${maxParticipants}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Canceled Notice */}
            {workshopState === "canceled" && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-red-800">
                    This workshop has been canceled
                  </p>
                  {booking.cancellation_reason && (
                    <p className="text-[13px] text-red-600 mt-1">
                      {booking.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* About */}
            {service?.description && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-amber-200/50">
                  About This Workshop
                </h2>
                <p className="text-[15px] font-light leading-relaxed text-olive-600">
                  {service.description}
                </p>
              </div>
            )}

            {/* What to Expect — upcoming only */}
            {workshopState === "upcoming" && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-amber-200/50">
                  What to Expect
                </h2>
                <div className="space-y-3 text-[14px] text-olive-600 leading-relaxed">
                  {(session as any)?.what_youll_learn ? (
                    <p>{(session as any).what_youll_learn}</p>
                  ) : (
                    <>
                      <p>
                        This is a group experience designed to be interactive and
                        engaging. Come with an open mind and a willingness to
                        explore.
                      </p>
                      <p>
                        {isVirtual
                          ? "Make sure your camera and microphone are working before the session. The join link will be available 15 minutes before start."
                          : "Please arrive a few minutes early. All materials will be provided."}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Facilitator Message — upcoming/live only */}
            {(workshopState === "upcoming" || workshopState === "joinable" || workshopState === "live") &&
              (session as any)?.facilitator_message &&
              practitioner && (
                <div>
                  <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-amber-200/50">
                    Message from Your Facilitator
                  </h2>
                  <div className="bg-white border border-sage-200/60 border-l-4 border-l-amber-400 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        {practitioner.profile_image_url ? (
                          <AvatarImage
                            src={practitioner.profile_image_url}
                            alt={practitioner.name ?? "Facilitator"}
                          />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white font-serif text-sm italic">
                          {practitioner.name?.charAt(0) ?? "P"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-medium text-olive-900">
                        {practitioner.name}
                      </span>
                    </div>
                    <p className="text-[14px] font-light leading-relaxed text-olive-600">
                      {(session as any).facilitator_message}
                    </p>
                  </div>
                </div>
              )}

            {/* Recording — completed only */}
            {workshopState === "completed" &&
              booking.recordings &&
              (booking.recordings as unknown as any[]).length > 0 && (
                <div>
                  <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-amber-200/50">
                    Workshop Recording
                  </h2>
                  {(booking.recordings as unknown as any[]).map(
                    (rec: any, idx: number) => (
                      <div
                        key={rec.id || idx}
                        className="flex items-center gap-4 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-amber-300 transition cursor-pointer"
                        onClick={() => {
                          if (rec?.file_url) window.open(rec.file_url, "_blank")
                          else if (rec?.id)
                            router.push(
                              `/dashboard/user/bookings/${bUuid}/recordings/${rec.id}`
                            )
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                          <Film className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[14px] font-medium text-olive-900">
                            Watch Recording
                          </div>
                          <div className="text-[12px] text-olive-400">
                            {rec.duration_formatted ||
                              (rec.duration_seconds
                                ? formatDuration(
                                    Math.round(rec.duration_seconds / 60)
                                  )
                                : "Recording available")}
                          </div>
                        </div>
                        <Play className="h-4 w-4 text-amber-500" />
                      </div>
                    )
                  )}
                </div>
              )}

            {/* Resources — completed only */}
            {workshopState === "completed" &&
              (booking as any).resources &&
              Array.isArray((booking as any).resources) &&
              (booking as any).resources.length > 0 && (
                <div>
                  <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-amber-200/50">
                    Resources & Materials
                  </h2>
                  <div className="space-y-2">
                    {(booking as any).resources.map(
                      (resource: any, i: number) => (
                        <div
                          key={resource?.id ?? i}
                          className="flex items-center gap-4 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-amber-300 transition cursor-pointer"
                          onClick={() => {
                            if (resource?.file_url)
                              window.open(resource.file_url, "_blank")
                          }}
                        >
                          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Film className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[14px] font-medium text-olive-900">
                              {resource.title ?? "Resource"}
                            </div>
                            <div className="text-[12px] text-olive-400">
                              {resource.meta ?? resource.description ?? ""}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Journal */}
            <JournalSection bookingUuid={bUuid} accentColor="amber" />

            {/* Facilitator Card */}
            {practitioner && (
              <div>
                <h2 className="text-[11px] font-medium tracking-widest uppercase text-olive-400 mb-3 pb-2 border-b border-amber-200/50">
                  Your Facilitator
                </h2>
                <div className="flex items-start gap-4 p-5 bg-white border border-sage-200/60 rounded-xl">
                  <Avatar className="h-14 w-14">
                    {practitioner.profile_image_url ? (
                      <AvatarImage
                        src={practitioner.profile_image_url}
                        alt={practitioner.name ?? "Facilitator"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-amber-200 to-amber-300 text-olive-700 font-serif text-xl italic">
                      {practitioner?.name?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-[16px] font-medium text-olive-900">
                      {practitioner?.name}
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
                        className="rounded-full text-[12px] border-amber-200 text-olive-600 min-h-[44px] sm:min-h-0"
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
                        className="rounded-full text-[12px] border-amber-200 text-olive-600 min-h-[44px] sm:min-h-0"
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
            {/* Countdown — upcoming only */}
            {workshopState === "upcoming" && startTime && (
              <div className="flex items-center justify-center gap-5 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div>
                  <div className="font-serif text-2xl font-medium text-amber-700 leading-none">
                    {fmt(countdown.days)}
                  </div>
                  <div className="text-[9px] tracking-widest uppercase text-olive-400 mt-0.5">
                    Days
                  </div>
                </div>
                <span className="text-amber-300 text-lg">·</span>
                <div>
                  <div className="font-serif text-2xl font-medium text-amber-700 leading-none">
                    {fmt(countdown.hours)}
                  </div>
                  <div className="text-[9px] tracking-widest uppercase text-olive-400 mt-0.5">
                    Hrs
                  </div>
                </div>
                <span className="text-amber-300 text-lg">·</span>
                <div>
                  <div className="font-serif text-2xl font-medium text-amber-700 leading-none">
                    {fmt(countdown.mins)}
                  </div>
                  <div className="text-[9px] tracking-widest uppercase text-olive-400 mt-0.5">
                    Min
                  </div>
                </div>
              </div>
            )}

            {/* Live banner — joinable/live */}
            {(workshopState === "joinable" || workshopState === "live") && (
              <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-[13px] text-olive-700">
                  <strong>
                    {workshopState === "live"
                      ? "Workshop in progress"
                      : "Starting soon"}
                  </strong>
                </div>
              </div>
            )}

            {/* Workshop Details Card */}
            <div className="bg-white border border-sage-200/60 rounded-xl overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-amber-200/40 bg-amber-50/50">
                <div className="text-[10px] font-medium tracking-widest uppercase text-olive-400 mb-1">
                  Workshop Details
                </div>
              </div>

              <div className="px-5 py-3">
                {/* Date */}
                {startTime && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="flex items-center gap-2 text-olive-400">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      Date
                    </span>
                    <span className="font-medium text-olive-800">
                      {format(toDate(startTime), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {/* Time */}
                {startTime && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="flex items-center gap-2 text-olive-400">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Time
                    </span>
                    <span className="font-medium text-olive-800">
                      {format(toDate(startTime), "h:mm a")}
                      {endTime ? ` - ${format(toDate(endTime), "h:mm a")}` : ""}
                    </span>
                  </div>
                )}

                {/* Duration */}
                {duration && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="text-olive-400">Duration</span>
                    <span className="font-medium text-olive-800">
                      {formatDuration(duration)}
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                  <span className="flex items-center gap-2 text-olive-400">
                    {isVirtual ? (
                      <Video className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    Location
                  </span>
                  <span className="font-medium text-olive-800">
                    {isVirtual
                      ? "Virtual"
                      : (session as any)?.location_name ?? "In Person"}
                  </span>
                </div>

                {/* Participants */}
                {maxParticipants && (
                  <div className="flex justify-between py-2.5 border-b border-sage-100 text-[13px]">
                    <span className="flex items-center gap-2 text-olive-400">
                      <Users className="h-3.5 w-3.5 text-amber-500" />
                      Participants
                    </span>
                    <span className="font-medium text-olive-800">
                      {currentParticipants != null
                        ? `${currentParticipants} of ${maxParticipants}`
                        : `Up to ${maxParticipants}`}
                    </span>
                  </div>
                )}

                {/* Confirmation */}
                <div className="flex justify-between py-2.5 text-[13px]">
                  <span className="text-olive-400">Confirmation</span>
                  <span className="font-mono text-[11px] text-amber-600 tracking-wide">
                    {bUuid.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Upcoming: Join (disabled), Calendar, Cancel */}
              {workshopState === "upcoming" && (
                <>
                  {isVirtual && roomUuid && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              className="w-full h-11 rounded-full bg-amber-500 text-white"
                              disabled
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Join Workshop
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Available 15 minutes before the workshop
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-full border-amber-200 text-olive-600 text-[13px]"
                    onClick={() => {
                      if (!startTime) return
                      const start = toDate(startTime)
                      const end = endTime
                        ? toDate(endTime)
                        : new Date(start.getTime() + (duration || 60) * 60000)
                      window.open(
                        generateCalendarUrl(
                          service?.name || "Workshop",
                          start,
                          end,
                          `Workshop with ${practitioner?.name || "your facilitator"}`,
                          isVirtual ? "Virtual (Estuary)" : "In Person"
                        ),
                        "_blank"
                      )
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-2" />
                    Add to Calendar
                  </Button>
                  <button
                    className="w-full text-center text-[12px] text-olive-400 hover:text-red-500 py-2 min-h-[44px] min-w-[44px] transition-colors"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    Cancel Workshop
                  </button>
                </>
              )}

              {/* Joinable / Live: Join Now */}
              {(workshopState === "joinable" || workshopState === "live") &&
                isVirtual &&
                roomUuid && (
                  <Button
                    className="w-full h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-medium"
                    asChild
                  >
                    <Link href={`/room/${roomUuid}/lobby`}>
                      <Play className="h-4 w-4 mr-2" />
                      Join Now
                    </Link>
                  </Button>
                )}

              {/* Completed: Watch Recording, Leave Review */}
              {workshopState === "completed" && (
                <>
                  {booking.recordings &&
                    (booking.recordings as unknown as any[]).length > 0 && (
                      <Button
                        className="w-full h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => {
                          const rec = (
                            booking.recordings as unknown as any[]
                          )[0]
                          if (rec?.file_url) window.open(rec.file_url, "_blank")
                          else if (rec?.id)
                            router.push(
                              `/dashboard/user/bookings/${bUuid}/recordings/${rec.id}`
                            )
                        }}
                      >
                        <Film className="h-4 w-4 mr-2" />
                        Watch Recording
                      </Button>
                    )}
                  {!(booking as any).has_review && (
                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-full border-amber-200 text-olive-600 text-[13px]"
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
      <CancelBookingDialog
        bookingId={booking.public_uuid || String((booking as any).id)}
        serviceName={service?.name || "Workshop"}
        practitionerName={practitioner?.name || "Facilitator"}
        date={startTime ? format(toDate(startTime), "MMMM d, yyyy") : ""}
        time={startTime ? format(toDate(startTime), "h:mm a") : ""}
        price={`$${(booking as any).credits_allocated_dollars || 0}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={(reason: string) => cancelBooking(reason)}
        isLoading={isCancelling}
      />
      <ReviewBookingDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={booking as any}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
