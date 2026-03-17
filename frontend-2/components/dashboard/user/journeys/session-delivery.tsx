"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { conversationsCreate, conversationsList } from "@/src/client"
import type { BookingDetailReadable, JourneyDetail } from "@/src/client/types.gen"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
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
  User,
  MessageSquare,
  Film,
  PlayCircle,
  Download,
  Star,
  DollarSign,
  Layers,
  Check,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"
import { ReviewBookingDialog } from "@/components/dashboard/user/bookings/review-booking-dialog"
import {
  format,
  parseISO,
  differenceInHours,
  isPast,
} from "date-fns"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionDeliveryProps {
  booking?: BookingDetailReadable
  refetch: () => void
  journeyData?: JourneyDetail
}

type SessionState =
  | "upcoming"
  | "joinable"
  | "in_progress"
  | "completed"
  | "canceled"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely convert any date value (Date, string, or null) to a Date object */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return parseISO(value)
  return new Date(String(value))
}

function deriveSessionState(booking: BookingDetailReadable): SessionState {
  if (booking.status === "canceled") return "canceled"

  const sessionStatus = booking.service_session?.status
  if (sessionStatus === "completed") return "completed"
  if (sessionStatus === "in_progress") return "in_progress"

  const startTime = booking.service_session?.start_time
  if (startTime) {
    const start = toDate(startTime)
    const endTime = booking.service_session?.end_time
    const end = endTime
      ? toDate(endTime)
      : new Date(start.getTime() + 60 * 60 * 1000)
    const now = new Date()
    const joinWindow = new Date(start.getTime() - 15 * 60 * 1000)

    if (now >= joinWindow && now < end && booking.status === "confirmed") {
      return "joinable"
    }

    if (isPast(end)) return "completed"
  }

  return "upcoming"
}

function getStatusConfig(state: SessionState) {
  switch (state) {
    case "upcoming":
      return {
        label: "Confirmed",
        pillClass: "bg-sage-100 border border-sage-300 text-sage-700",
        dotClass: "bg-sage-500 animate-pulse",
      }
    case "joinable":
      return {
        label: "Live",
        pillClass: "bg-amber-50 border border-amber-300 text-amber-700",
        dotClass: "bg-amber-500 animate-[pulse_1.4s_ease-in-out_infinite]",
      }
    case "in_progress":
      return {
        label: "In Progress",
        pillClass: "bg-amber-50 border border-amber-300 text-amber-700",
        dotClass: "bg-amber-500 animate-[pulse_1.4s_ease-in-out_infinite]",
      }
    case "completed":
      return {
        label: "Completed",
        pillClass: "bg-sage-100 border border-sage-200 text-sage-600",
        dotClass: "bg-sage-500",
      }
    case "canceled":
      return {
        label: "Canceled",
        pillClass: "bg-red-50 border border-red-200 text-red-600",
        dotClass: "bg-red-400",
      }
  }
}

// Prep checklist items for sessions
const SESSION_PREP_ITEMS = [
  {
    id: "quiet_space",
    title: "Find a quiet, comfortable space",
    desc: "Choose somewhere you won't be interrupted for the duration of your session.",
  },
  {
    id: "test_tech",
    title: "Test your camera and microphone",
    desc: "Make sure your video and audio are working before the session begins.",
  },
  {
    id: "intentions",
    title: "Write down your intentions",
    desc: "Take a moment to reflect on what you'd like to explore or receive from this session.",
  },
  {
    id: "calendar",
    title: "Add the session to your calendar",
    desc: "Block out the time so you can be fully present.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionDelivery({
  booking,
  refetch,
  journeyData,
}: SessionDeliveryProps) {
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const initialNotes = booking?.client_notes ?? journeyData?.sessions?.[0]?.client_notes ?? ""
  const [clientNotes, setClientNotes] = useState(initialNotes)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [checkedPrep, setCheckedPrep] = useState<Set<string>>(new Set())

  // Countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 })

  // Build a booking-like object from journeyData if no booking provided
  const effectiveBooking: BookingDetailReadable | undefined = booking ?? (journeyData ? (() => {
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
        location_type: "virtual",
      },
      practitioner: journeyData.practitioner ? {
        display_name: journeyData.practitioner.name,
        slug: journeyData.practitioner.slug,
        public_uuid: journeyData.practitioner.public_uuid,
        bio: journeyData.practitioner.bio,
      } : undefined,
      service_session: s ? {
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
      } : undefined,
      room: s?.room_uuid,
      duration_minutes: s?.duration_minutes,
    } as any as BookingDetailReadable
  })() : undefined)

  if (!effectiveBooking) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <p className="text-olive-500">Loading session details...</p>
      </div>
    )
  }

  const service = effectiveBooking.service
  const practitioner = effectiveBooking.practitioner
  const session = effectiveBooking.service_session
  const startTime = session?.start_time
  const endTime = session?.end_time
  const isVirtual = (service as any)?.location_type === "virtual"
  const duration = effectiveBooking.duration_minutes ?? session?.duration
  const sessionState = deriveSessionState(effectiveBooking)
  const statusConfig = getStatusConfig(sessionState)

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

  // Check if modifiable (24+ hours before start)
  const isModifiable = (() => {
    if (effectiveBooking.status !== "confirmed" || !startTime) return false
    const start = toDate(startTime)
    return differenceInHours(start, new Date()) >= 24
  })()

  const bookingUuid = String(effectiveBooking.public_uuid || (effectiveBooking as any).id || "")

  // Cancel booking mutation
  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (reason: string) => {
      const { bookingsCancelCreate } = await import("@/src/client")
      await bookingsCancelCreate({
        path: { public_uuid: bookingUuid },
        body: {
          reason,
          status: "canceled",
          canceled_by: "client",
        } as any,
      })
    },
    onSuccess: () => {
      toast.success("Booking canceled successfully")
      refetch()
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to cancel booking. Please try again."
      )
    },
  })

  // Save notes mutation
  const { mutate: saveNotes, isPending: isSavingNotes } = useMutation({
    mutationFn: async (notes: string) => {
      const { bookingsPartialUpdate } = await import("@/src/client")
      await bookingsPartialUpdate({
        path: { public_uuid: bookingUuid },
        body: { client_notes: notes } as any,
      })
    },
    onSuccess: () => {
      toast.success("Notes saved")
      setIsEditingNotes(false)
      refetch()
    },
    onError: () => {
      toast.error("Failed to save notes")
    },
  })

  // Message practitioner handler
  const handleMessagePractitioner = async () => {
    if (!practitioner?.user_id) {
      toast.error("Unable to message practitioner")
      return
    }

    try {
      const conversationsResponse = await conversationsList()
      const existingConversation = conversationsResponse.data?.results?.find(
        (conv: any) =>
          conv.participants?.some(
            (p: any) => p.user_id === practitioner.user_id
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
          other_user_id: practitioner.user_id,
          initial_message: `Hi, I have a question about my booking for "${service?.name}".`,
        },
      })

      if ((response.data as any)?.id) {
        router.push(
          `/dashboard/user/messages?conversationId=${(response.data as any).id}`
        )
      }
    } catch {
      toast.error("Unable to open conversation. Please try again.")
    }
  }

  // Room UUID - effectiveBooking.room is typed as string but may be an object
  const roomUuid =
    typeof effectiveBooking.room === "object" && effectiveBooking.room
      ? (effectiveBooking.room as any).public_uuid
      : effectiveBooking.room

  const togglePrep = useCallback((id: string) => {
    setCheckedPrep((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const fmt = (n: number) => String(n).padStart(2, "0")

  return (
    <div className="min-h-screen">
      {/* ── HERO SECTION ── */}
      <div
        className="relative overflow-hidden px-6 md:px-12 pt-10 pb-16 bg-gradient-to-br from-sage-50 via-cream-50 to-sage-50/30 border-b border-sage-200/40"
      >
        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Back link */}
          <Link
            href="/dashboard/user/journeys"
            className="inline-flex items-center gap-2 text-[13px] text-olive-500 hover:text-sage-600 transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Journeys
          </Link>

          {/* Greeting + status pill */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase px-3 py-1 rounded-full ${statusConfig.pillClass}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}
              />
              {statusConfig.label}
            </span>
          </div>

          {/* Session type label */}
          <div className="text-[12px] font-medium tracking-widest uppercase text-olive-400 mb-2">
            Session {(service as any)?.category_name ? `\u00b7 ${(service as any).category_name}` : ""}
          </div>

          {/* Title */}
          <h1 className="font-serif text-[40px] md:text-[46px] font-medium text-olive-900 leading-none tracking-tight mb-4">
            {service?.name ?? "Session"}
          </h1>

          {/* Practitioner chip */}
          {practitioner?.name && (
            <div className="flex items-center gap-2.5 mb-6">
              <Avatar className="h-8 w-8 border-2 border-sage-300">
                {practitioner.profile_image_url ? (
                  <AvatarImage
                    src={practitioner.profile_image_url}
                    alt={practitioner.name}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-sage-200 to-sage-300 text-olive-700 text-xs font-serif italic">
                  {practitioner.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[13px] text-olive-500">
                with{" "}
                <span className="text-olive-700 font-medium">
                  {practitioner.name}
                </span>
              </span>
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-olive-500">
            {duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sage-500" />
                {duration} min
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {isVirtual ? (
                <>
                  <Video className="h-3.5 w-3.5 text-sage-500" />
                  Virtual
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5 text-sage-500" />
                  In-person
                </>
              )}
            </span>
            {startTime && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-sage-500" />
                {format(toDate(startTime), "EEEE, MMMM d")} at{" "}
                {format(toDate(startTime), "h:mm a")}
              </span>
            )}
          </div>

          {/* Countdown strip — upcoming */}
          {sessionState === "upcoming" && startTime && (
            <div className="flex items-center gap-6 mt-6 px-5 py-3.5 bg-sage-50 border border-sage-200 rounded-xl">
              <div className="text-center">
                <div className="font-serif text-[32px] font-medium text-sage-700 leading-none">
                  {fmt(countdown.days)}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-olive-400 mt-0.5">
                  Days
                </div>
              </div>
              <span className="text-[24px] text-sage-300 font-light -mt-1">
                ·
              </span>
              <div className="text-center">
                <div className="font-serif text-[32px] font-medium text-sage-700 leading-none">
                  {fmt(countdown.hours)}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-olive-400 mt-0.5">
                  Hours
                </div>
              </div>
              <span className="text-[24px] text-sage-300 font-light -mt-1">
                ·
              </span>
              <div className="text-center">
                <div className="font-serif text-[32px] font-medium text-sage-700 leading-none">
                  {fmt(countdown.mins)}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-olive-400 mt-0.5">
                  Min
                </div>
              </div>
              <div className="ml-auto text-[13px] text-olive-500 leading-snug text-right hidden sm:block">
                {format(toDate(startTime), "EEEE, MMMM d")}
                <br />
                {format(toDate(startTime), "h:mm a")}
                {isVirtual ? " \u00b7 Virtual" : ""}
              </div>
            </div>
          )}

          {/* Today/Live strip */}
          {(sessionState === "joinable" || sessionState === "in_progress") && (
            <div className="flex items-center gap-3.5 mt-6 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="text-[14px] text-olive-600 leading-snug">
                <strong className="text-olive-800 font-medium">
                  {sessionState === "in_progress"
                    ? "Your session is in progress."
                    : "Your session is starting soon."}
                </strong>
                <br />
                {startTime &&
                  format(toDate(startTime), "h:mm a")}
                {isVirtual
                  ? " \u00b7 Virtual Session"
                  : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TWO-COLUMN BODY ── */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* ── MAIN COLUMN ── */}
        <main className="pt-10 pb-20 min-w-0">

          {/* ── Canceled notice ── */}
          {sessionState === "canceled" && (
            <div className="mb-10">
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-red-900">
                    Session Canceled
                  </h3>
                </div>
                {effectiveBooking.cancellation_reason && (
                  <p className="text-sm text-red-700 mt-1">
                    Reason: {effectiveBooking.cancellation_reason}
                  </p>
                )}
                {effectiveBooking.canceled_at && (
                  <p className="text-sm text-red-700 mt-1">
                    Canceled on:{" "}
                    {format(
                      toDate(effectiveBooking.canceled_at),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── About This Session ── */}
          {service?.description && (
            <div className="mb-11">
              <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                About This Session
              </div>
              <div className="text-[15px] font-light leading-relaxed text-olive-600">
                {service.description}
              </div>
            </div>
          )}

          {/* ── Preparation — upcoming only ── */}
          {(sessionState === "upcoming" ||
            sessionState === "joinable") && (
            <div className="mb-11">
              <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Prepare for Your Session
              </div>
              <div className="flex flex-col gap-2.5">
                {SESSION_PREP_ITEMS.map((item) => {
                  const isDone = checkedPrep.has(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePrep(item.id)}
                      className={`flex items-start gap-3.5 px-[18px] py-4 bg-white border rounded-xl text-left transition-colors cursor-pointer ${
                        isDone
                          ? "bg-cream-50 border-sage-600/25"
                          : "border-sage-200/60 hover:border-sage-400"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          isDone
                            ? "bg-sage-600 border-sage-600 text-white"
                            : "border-sage-200/60"
                        }`}
                      >
                        {isDone && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-[14px] font-medium mb-0.5 ${
                            isDone
                              ? "text-olive-400 line-through decoration-sage-600/40"
                              : "text-olive-900"
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-[12.5px] text-olive-400 leading-snug">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Your Notes ── */}
          <div className="mb-11">
            <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60 flex items-center justify-between">
              <span>Your Notes</span>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-[12px] normal-case tracking-normal text-sage-600 hover:text-sage-700 font-medium transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Add any personal notes about this session..."
                  className="min-h-[100px] bg-white border-sage-200/60 focus:border-sage-400 text-[14px] font-light leading-relaxed text-olive-900 placeholder:text-olive-400"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-5"
                    onClick={() => saveNotes(clientNotes)}
                    disabled={isSavingNotes}
                  >
                    {isSavingNotes ? "Saving..." : "Save Notes"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-olive-400"
                    onClick={() => {
                      setClientNotes(effectiveBooking.client_notes ?? "")
                      setIsEditingNotes(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[15px] font-light leading-relaxed text-olive-600">
                {effectiveBooking.client_notes || "No notes yet. Click Edit to add some."}
              </p>
            )}
          </div>

          {/* ── Your Practitioner card ── */}
          {practitioner && (
            <div className="mb-11">
              <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Your Practitioner
              </div>
              <div className="bg-white border border-sage-200/60 rounded-xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    {practitioner.profile_image_url ? (
                      <AvatarImage
                        src={practitioner.profile_image_url}
                        alt={practitioner.name ?? "Practitioner"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-sage-200 to-sage-300 text-olive-700 font-serif text-lg italic">
                      {practitioner.name?.charAt(0) ?? "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-medium text-olive-900">
                      {practitioner.name}
                    </h3>
                    <p className="text-[13px] text-olive-400 mt-0.5">
                      Wellness Practitioner
                    </p>
                    {practitioner.bio && (
                      <p className="text-[14px] font-light leading-relaxed text-olive-600 mt-3">
                        {practitioner.bio}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-[13px] border-sage-200/60 text-olive-600 hover:border-sage-300"
                        asChild
                      >
                        <Link
                          href={`/practitioners/${practitioner.slug || practitioner.id}`}
                        >
                          <User className="h-3.5 w-3.5 mr-1.5" />
                          View Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Session Recordings — completed only ── */}
          {sessionState === "completed" &&
            effectiveBooking.recordings &&
            (effectiveBooking.recordings as any).length > 0 && (
              <div className="mb-11">
                <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                  Session Recording
                </div>
                {(effectiveBooking.recordings as any).map(
                  (recording: any, index: number) => (
                    <div
                      key={recording.recording_id || index}
                      className="flex items-center gap-3.5 px-4 py-3.5 bg-white border border-sage-200/60 rounded-xl shadow-sm mb-2.5 hover:shadow-sm transition-shadow cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-sage-600/10 flex items-center justify-center flex-shrink-0">
                        <Film className="h-[18px] w-[18px] text-sage-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-olive-900 mb-0.5">
                          {service?.name ?? "Session"} Recording{" "}
                          {(effectiveBooking.recordings as any).length > 1
                            ? `(${index + 1})`
                            : ""}
                        </div>
                        <div className="text-[12px] text-olive-400">
                          {recording.duration_seconds
                            ? `${Math.floor(recording.duration_seconds / 60)} min`
                            : ""}
                          {recording.started_at &&
                            ` \u00b7 ${format(parseISO(recording.started_at), "MMM d, h:mm a")}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/user/bookings/${effectiveBooking.public_uuid || effectiveBooking.id}/recordings/${recording.id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-[12.5px] text-sage-600 bg-sage-100 border-none px-3 py-1.5 rounded-full hover:bg-sage-200 transition-colors font-medium"
                        >
                          <PlayCircle className="h-3 w-3" />
                          Watch
                        </button>
                        {(recording.download_url || recording.file_url) && (
                          <a
                            href={recording.download_url || recording.file_url}
                            download
                            className="inline-flex items-center gap-1.5 text-[12.5px] text-sage-600 bg-sage-100 border-none px-3 py-1.5 rounded-full hover:bg-sage-200 transition-colors font-medium"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          {/* ── Leave a Review — completed only ── */}
          {sessionState === "completed" && (
            <div className="mb-11">
              <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Share Your Experience
              </div>
              <div className="bg-white border border-sage-200/60 rounded-xl p-6">
                {effectiveBooking.has_review ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-sage-600" />
                    <div>
                      <p className="text-[14px] font-medium text-olive-900">
                        Thank you for your review!
                      </p>
                      <p className="text-[13px] text-olive-400 mt-0.5">
                        Your feedback helps others find great practitioners
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[14px] font-medium text-olive-900 mb-3">
                      How was your session?
                    </p>
                    <p className="text-[13px] text-olive-400 mb-4">
                      Share your experience to help others on their wellness
                      journey.
                    </p>
                    <Button
                      onClick={() => setReviewDialogOpen(true)}
                      className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-5 text-[13.5px] font-medium"
                    >
                      <Star className="h-3.5 w-3.5 mr-1.5" />
                      Leave Review
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── SIDEBAR ── */}
        <aside className="sticky top-[58px] pt-8 pb-20 flex flex-col gap-0">
          {/* ── Ticket Card ── */}
          <div className="bg-white border border-sage-200/60 rounded-xl shadow-sm overflow-visible mb-5 relative">
            {/* Ticket header */}
            <div
              className="rounded-t-xl px-5 pt-5 pb-[18px] relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #1e1508 0%, #2e1f0a 100%)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 80% 20%, rgba(74,94,74,0.2) 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10">
                <div className="text-[10px] tracking-wider uppercase text-[#f5f0e8]/35 mb-1.5">
                  Your Session
                </div>
                <div className="font-serif text-[20px] font-medium text-[#f5f0e8] leading-tight mb-3.5">
                  {service?.name ?? "Session"}
                </div>
                {startTime && (
                  <>
                    <div className="flex items-center gap-2 text-[13px] text-[#f5f0e8]/60 mb-1">
                      <Calendar className="h-3 w-3 text-sage-600" />
                      <strong className="text-[#f5f0e8]/90 font-medium">
                        {format(
                          toDate(startTime),
                          "EEEE, MMMM d"
                        )}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[#f5f0e8]/60">
                      <Clock className="h-3 w-3 text-sage-600" />
                      {format(toDate(startTime), "h:mm a")}
                      {endTime &&
                        ` \u2013 ${format(toDate(endTime), "h:mm a")}`}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dashed tear line */}
            <div className="flex items-center -mx-[1px]">
              <div className="w-4 h-4 rounded-full bg-cream-50 flex-shrink-0 relative z-10" />
              <div className="flex-1 border-t-[1.5px] border-dashed border-sage-200/60 mx-1" />
              <div className="w-4 h-4 rounded-full bg-cream-50 flex-shrink-0 relative z-10" />
            </div>

            {/* Ticket stub */}
            <div className="px-5 py-4">
              {/* Duration */}
              {duration && (
                <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
                  <span className="flex items-center gap-1.5 text-olive-400">
                    <Clock className="h-3 w-3 text-sage-600" />
                    Duration
                  </span>
                  <span className="font-medium text-olive-900">
                    {duration} min
                  </span>
                </div>
              )}

              {/* Location */}
              <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
                <span className="flex items-center gap-1.5 text-olive-400">
                  {isVirtual ? (
                    <Video className="h-3 w-3 text-sage-600" />
                  ) : (
                    <MapPin className="h-3 w-3 text-sage-600" />
                  )}
                  Location
                </span>
                <span className="font-medium text-olive-900">
                  {isVirtual ? "Virtual" : "In-person"}
                </span>
              </div>

              {/* Type */}
              <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
                <span className="flex items-center gap-1.5 text-olive-400">
                  <Layers className="h-3 w-3 text-sage-600" />
                  Type
                </span>
                <span className="font-medium text-olive-900">
                  1:1 Session
                </span>
              </div>

              {/* Price */}
              {effectiveBooking.credits_allocated_dollars != null && (
                <div className="flex justify-between py-[7px] text-[13px]">
                  <span className="flex items-center gap-1.5 text-olive-400">
                    <DollarSign className="h-3 w-3 text-sage-600" />
                    Paid
                  </span>
                  <span className="font-medium text-olive-900">
                    ${effectiveBooking.credits_allocated_dollars}
                  </span>
                </div>
              )}

              {/* Confirmation number */}
              {effectiveBooking.public_uuid && (
                <div className="mt-3 pt-3 border-t border-sage-200/60 text-center">
                  <div className="text-[10px] tracking-widest uppercase text-olive-400 mb-1">
                    Confirmation
                  </div>
                  <div className="font-serif text-[18px] font-medium tracking-wider text-sage-600">
                    {effectiveBooking.public_uuid.slice(0, 14).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Action Buttons ── */}

          {/* Upcoming actions */}
          {sessionState === "upcoming" && (
            <div className="flex flex-col gap-2 mb-5">
              {isVirtual && roomUuid && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          className="w-full h-[50px] rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium"
                          disabled
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Join Session
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        You can join 15 minutes before your session starts
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="outline"
                className="w-full h-11 rounded-full border-[1.5px] border-sage-200/60 text-olive-600 text-[14px] hover:border-sage-300 hover:text-olive-900"
              >
                <Calendar className="h-3.5 w-3.5 mr-2" />
                Add to Calendar
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        className="w-full h-11 rounded-full border-[1.5px] border-sage-200/60 text-olive-600 text-[14px] hover:border-sage-300 hover:text-olive-900"
                        disabled={!isModifiable}
                        onClick={() =>
                          router.push(
                            `/dashboard/user/bookings/${effectiveBooking.public_uuid || effectiveBooking.id}/reschedule`
                          )
                        }
                      >
                        <CalendarRange className="h-3.5 w-3.5 mr-2" />
                        Reschedule
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!isModifiable && (
                    <TooltipContent>
                      <p>
                        Rescheduling is only available up to 24 hours before
                        your session
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <button
                        type="button"
                        className="w-full text-center text-[12.5px] text-olive-400 hover:text-red-500 py-1.5 transition-colors disabled:opacity-50"
                        disabled={!isModifiable}
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        I need to cancel this session
                      </button>
                    </div>
                  </TooltipTrigger>
                  {!isModifiable && (
                    <TooltipContent>
                      <p>
                        Cancellation is only available up to 24 hours before
                        your session
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Joinable / In Progress actions */}
          {(sessionState === "joinable" ||
            sessionState === "in_progress") && (
            <div className="flex flex-col gap-2 mb-5">
              {isVirtual && roomUuid && (
                <Button
                  className="w-full h-[50px] rounded-full text-white text-[15px] font-medium animate-pulse"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--sage-600, #6b8f6b), var(--sage-700, #4a7a4a))",
                  }}
                  asChild
                >
                  <Link href={`/room/${roomUuid}/lobby`}>
                    <Play className="h-4 w-4 mr-2" />
                    Join Now
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-11 rounded-full border-[1.5px] border-sage-200/60 text-olive-600 text-[14px] hover:border-sage-300 hover:text-olive-900"
                onClick={handleMessagePractitioner}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Message {practitioner?.name?.split(" ")[0] ?? "Practitioner"}
              </Button>
            </div>
          )}

          {/* Completed actions */}
          {sessionState === "completed" && (
            <div className="flex flex-col gap-2 mb-5">
              {effectiveBooking.recordings &&
                (effectiveBooking.recordings as any).length > 0 && (
                  <Button
                    className="w-full h-[50px] rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium"
                    onClick={() => {
                      const rec = (effectiveBooking.recordings as any)[0]
                      if (rec?.id) {
                        router.push(
                          `/dashboard/user/bookings/${effectiveBooking.public_uuid || effectiveBooking.id}/recordings/${rec.id}`
                        )
                      }
                    }}
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Watch Recording
                  </Button>
                )}
              {!effectiveBooking.has_review && (
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-full border-[1.5px] border-sage-200/60 text-olive-600 text-[14px] hover:border-sage-300 hover:text-olive-900"
                  onClick={() => setReviewDialogOpen(true)}
                >
                  <Star className="h-3.5 w-3.5 mr-2" />
                  Leave Review
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-11 rounded-full border-[1.5px] border-sage-200/60 text-olive-600 text-[14px] hover:border-sage-300 hover:text-olive-900"
                onClick={handleMessagePractitioner}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Message {practitioner?.name?.split(" ")[0] ?? "Practitioner"}
              </Button>
            </div>
          )}

          {/* Canceled actions */}
          {sessionState === "canceled" && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <XCircle className="h-5 w-5 text-red-400 mx-auto mb-2" />
              <p className="text-[13px] font-medium text-red-800">
                This session has been canceled
              </p>
            </div>
          )}

          {/* ── Practitioner chip ── */}
          {practitioner && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-sage-50 rounded-xl mb-5">
              <Avatar className="h-11 w-11">
                {practitioner.profile_image_url ? (
                  <AvatarImage
                    src={practitioner.profile_image_url}
                    alt={practitioner.name ?? "Practitioner"}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-sage-200 to-sage-300 text-olive-700 font-serif text-lg italic">
                  {practitioner.name?.charAt(0) ?? "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-olive-800">
                  {practitioner.name}
                </div>
                <div className="text-[12px] text-olive-400">
                  Your practitioner
                </div>
              </div>
              <button
                type="button"
                onClick={handleMessagePractitioner}
                className="flex items-center gap-1.5 text-[12.5px] text-sage-600 bg-sage-100 px-3 py-1.5 rounded-full hover:bg-sage-200 transition-colors whitespace-nowrap font-medium"
              >
                <MessageSquare className="h-3 w-3" />
                Message
              </button>
            </div>
          )}

          {/* ── Continue Your Journey upsell ── */}
          {practitioner && (
            <div className="bg-gradient-to-br from-sage-50 to-sage-50/30 border border-sage-200/60 rounded-xl p-[18px]">
              <div className="text-[10px] tracking-widest uppercase text-sage-500 mb-2">
                Continue the work
              </div>
              <div className="font-serif text-[18px] font-medium text-olive-800 mb-1">
                Explore More Sessions
              </div>
              <div className="text-[12.5px] text-olive-400 leading-snug mb-3">
                {practitioner.name} offers a range of services to support your
                wellness journey.
              </div>
              <Button
                className="w-full h-[38px] rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[13px] font-medium"
                asChild
              >
                <Link
                  href={`/practitioners/${practitioner.slug || practitioner.id}`}
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  View All Services
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>

      {/* ── Dialogs ── */}
      <CancelBookingDialog
        bookingId={effectiveBooking.public_uuid || String(effectiveBooking.id)}
        serviceName={service?.name || "Service"}
        practitionerName={practitioner?.name || "Practitioner"}
        date={
          startTime
            ? format(toDate(startTime), "MMMM d, yyyy")
            : ""
        }
        time={
          startTime ? format(toDate(startTime), "h:mm a") : ""
        }
        price={`$${effectiveBooking.credits_allocated_dollars || 0}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={(reason) => cancelBooking(reason)}
        isLoading={isCancelling}
      />

      <ReviewBookingDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={effectiveBooking as any}
        onSuccess={() => {
          refetch()
        }}
      />
    </div>
  )
}
