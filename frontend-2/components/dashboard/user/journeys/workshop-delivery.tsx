"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { conversationsCreate, conversationsList } from "@/src/client"
import { bookingsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import type {
  BookingDetailReadable,
  BookingService,
  BookingPractitioner,
  ServiceSession,
  JourneyDetail,
} from "@/src/client/types.gen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  ChevronRight,
  Check,
  PlayCircle,
  Download,
  Star,
  MessageSquare,
  CalendarPlus,
  XCircle,
  FileText,
  Music,
  ArrowLeft,
  Layers,
  Phone,
  ExternalLink,
} from "lucide-react"
import {
  format,
  parseISO,
  isFuture,
  isPast,
  differenceInMinutes,
  differenceInDays,
  differenceInHours,
} from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import JournalSection from "@/components/dashboard/user/journeys/journal-section"
import { ReviewBookingDialog } from "@/components/dashboard/user/bookings/review-booking-dialog"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkshopState = "upcoming" | "live" | "completed" | "canceled"

interface WorkshopDeliveryProps {
  bookingUuid: string
  journeyData?: JourneyDetail
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return parseISO(value)
  return new Date(String(value))
}

function deriveWorkshopState(
  booking: BookingDetailReadable
): WorkshopState {
  if (booking.status === "canceled") return "canceled"
  const session = booking.service_session
  if (session?.status === "completed") return "completed"
  if (session?.status === "in_progress") return "live"
  // scheduled + future = upcoming
  if (
    session?.status === "scheduled" &&
    session?.start_time &&
    isFuture(toDate(session.start_time))
  ) {
    return "upcoming"
  }
  // scheduled but past and not completed => treat as completed
  if (
    session?.status === "scheduled" &&
    session?.start_time &&
    isPast(toDate(session.start_time))
  ) {
    return "completed"
  }
  return "upcoming"
}

function isJoinable(
  booking: BookingDetailReadable,
  workshopState: WorkshopState
): boolean {
  if (workshopState === "canceled" || workshopState === "completed") return false
  const session = booking.service_session
  const isVirtual = booking.service?.location_type === "virtual"
  if (!isVirtual) return false
  if (!session?.start_time) return false
  const start = toDate(session.start_time)
  const minutesUntil = differenceInMinutes(start, new Date())
  return minutesUntil <= 15 || workshopState === "live"
}

function formatCountdown(targetDate: Date): {
  days: number
  hours: number
  minutes: number
} {
  const now = new Date()
  const totalMinutes = differenceInMinutes(targetDate, now)
  if (totalMinutes <= 0) return { days: 0, hours: 0, minutes: 0 }
  const days = differenceInDays(targetDate, now)
  const hours = differenceInHours(targetDate, now) % 24
  const minutes = totalMinutes % 60
  return { days, hours, minutes }
}

function generateCalendarUrl(title: string, startTime: Date, endTime: Date, description: string, location: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startTime)}/${fmt(endTime)}`,
    details: description,
    location: location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function WorkshopDeliverySkeleton() {
  return (
    <div className="space-y-0">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-amber-50 via-cream-50 to-orange-50/30 px-8 py-12 pb-16">
        <div className="max-w-[660px] space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 bg-olive-200/30 rounded-full" />
            <Skeleton className="h-6 w-24 bg-olive-200/30 rounded-full" />
          </div>
          <Skeleton className="h-12 w-3/4 bg-olive-200/30" />
          <Skeleton className="h-5 w-full bg-olive-200/30" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-8 w-36 bg-olive-200/30 rounded-full" />
            <Skeleton className="h-5 w-20 bg-olive-200/30" />
            <Skeleton className="h-5 w-28 bg-olive-200/30" />
          </div>
        </div>
      </div>
      {/* Body skeleton */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="p-8 space-y-8">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-6 w-36" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="p-7 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ state }: { state: WorkshopState }) {
  switch (state) {
    case "upcoming":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-sage-700 bg-sage-100 border border-sage-200 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
          Registered
        </span>
      )
    case "live":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Live
        </span>
      )
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-olive-700 bg-olive-100 border border-olive-200 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-olive-500" />
          Attended
        </span>
      )
    case "canceled":
      return (
        <Badge variant="destructive" className="text-[11px] uppercase tracking-wider">
          Canceled
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------

function HeroSection({
  booking,
  service,
  practitioner,
  session,
  workshopState,
}: {
  booking: BookingDetailReadable
  service: BookingService | undefined
  practitioner: BookingPractitioner | undefined
  session: ServiceSession | undefined
  workshopState: WorkshopState
}) {
  const startTime = session?.start_time
    ? toDate(session.start_time)
    : null
  const endTime = session?.end_time
    ? toDate(session.end_time)
    : null
  const countdown = startTime ? formatCountdown(startTime) : null
  const isVirtual = service?.location_type === "virtual"

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-cream-50 to-orange-50/30">
      <div className="relative z-10 px-8 md:px-12 pt-4 pb-6 max-w-6xl mx-auto" style={{ minHeight: "280px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div>
          {/* Personal greeting strip */}
          <div className="flex items-center gap-2.5 mb-4 bg-amber-50 border-b border-amber-200 rounded-lg px-4 py-3">
            <Avatar className="w-9 h-9 border-2 border-amber-300/50">
              {(booking.user as any)?.profile_image_url ? (
                <AvatarImage src={(booking.user as any).profile_image_url} alt="You" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-sm font-serif italic">
                {(booking.user as any)?.first_name?.charAt(0) ?? "Y"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] text-olive-700 font-light">
              Hey <strong className="text-olive-900 font-medium">{(booking.user as any)?.first_name ?? "there"}</strong> — you&apos;re registered for this workshop
            </span>
            <div className="ml-auto">
              <StatusBadge state={workshopState} />
            </div>
          </div>

          {/* Workshop type label */}
          <div className="text-xs font-medium tracking-[0.1em] uppercase text-olive-500 mb-2">
            Workshop{(service as any)?.category_name ? ` · ${(service as any).category_name}` : ""}
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-[46px] font-medium text-olive-900 leading-none tracking-tight mb-3.5">
            {service?.name ?? "Workshop"}
          </h1>

          {/* Countdown strip - upcoming */}
          {workshopState === "upcoming" && startTime && countdown && (
            <div className="flex items-center gap-6 bg-white/60 border border-amber-200 rounded-lg px-5 py-3.5 mt-4">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="font-serif text-[32px] font-medium text-amber-700 leading-none">
                    {String(countdown.days).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] tracking-[0.1em] uppercase text-olive-500 mt-0.5">
                    Days
                  </div>
                </div>
                <span className="text-2xl text-amber-300 font-light -mt-1">·</span>
                <div className="text-center">
                  <div className="font-serif text-[32px] font-medium text-amber-700 leading-none">
                    {String(countdown.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] tracking-[0.1em] uppercase text-olive-500 mt-0.5">
                    Hours
                  </div>
                </div>
                <span className="text-2xl text-amber-300 font-light -mt-1">·</span>
                <div className="text-center">
                  <div className="font-serif text-[32px] font-medium text-amber-700 leading-none">
                    {String(countdown.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] tracking-[0.1em] uppercase text-olive-500 mt-0.5">
                    Min
                  </div>
                </div>
              </div>
              <div className="ml-auto text-[13px] text-olive-600 leading-snug text-right">
                {format(startTime, "EEEE, MMMM d")}
                <br />
                {format(startTime, "h:mm a")}
                {!isVirtual && (session as any)?.location_name
                  ? ` · ${(session as any).location_name}`
                  : isVirtual
                    ? " · Virtual"
                    : ""}
              </div>
            </div>
          )}

          {/* Today strip */}
          {workshopState === "live" && startTime && (
            <div className="flex items-center gap-3.5 bg-amber-100/60 border border-amber-300 rounded-lg px-5 py-3.5 mt-4">
              <Clock className="w-[22px] h-[22px] text-amber-600 shrink-0" />
              <div className="text-sm text-olive-600 leading-snug">
                <strong className="text-olive-900 font-medium">Your workshop starts soon.</strong>
                <br />
                {format(startTime, "h:mm a")}
                {!isVirtual && (session as any)?.location_name
                  ? ` at ${(session as any).location_name}`
                  : isVirtual
                    ? " · Virtual"
                    : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prep Checklist Item
// ---------------------------------------------------------------------------

function PrepItem({
  title,
  description,
  done,
  onToggle,
}: {
  title: string
  description: string
  done: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`flex items-start gap-3.5 p-4 px-[18px] bg-white border rounded-xl shadow-sm cursor-pointer transition-colors ${
        done
          ? "border-amber-200 bg-amber-50/30"
          : "border-sage-200/60 hover:border-amber-400"
      }`}
      onClick={onToggle}
    >
      <div
        className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-all ${
          done
            ? "bg-amber-500 border-amber-500 text-white"
            : "border-sage-300"
        }`}
      >
        {done && <Check className="w-[11px] h-[11px]" strokeWidth={3} />}
      </div>
      <div className="flex-1">
        <div
          className={`text-sm font-medium mb-0.5 ${
            done
              ? "text-olive-400 line-through decoration-amber-400/40"
              : "text-olive-900"
          }`}
        >
          {title}
        </div>
        <div className="text-[12.5px] text-olive-500 leading-snug">
          {description}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Column
// ---------------------------------------------------------------------------

function MainColumn({
  booking,
  service,
  practitioner,
  session,
  workshopState,
}: {
  booking: BookingDetailReadable
  service: BookingService | undefined
  practitioner: BookingPractitioner | undefined
  session: ServiceSession | undefined
  workshopState: WorkshopState
}) {
  const startTime = session?.start_time
    ? toDate(session.start_time)
    : null
  const endTime = session?.end_time
    ? toDate(session.end_time)
    : null
  const duration = booking.duration_minutes ?? session?.duration
  const isVirtual = service?.location_type === "virtual"

  // Prep checklist state (local only)
  const [prepChecked, setPrepChecked] = useState<Record<number, boolean>>({})
  const togglePrep = useCallback((idx: number) => {
    setPrepChecked((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }, [])

  const router = useRouter()

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  // Default prep items (can be extended from API data)
  const prepItems = useMemo(() => {
    const items = (session as any)?.preparation_items
    if (items && Array.isArray(items) && items.length > 0) {
      return items.map((item: any) => ({
        title: item.title ?? item,
        description: item.description ?? "",
      }))
    }
    // Fallback defaults relevant to the workshop
    return [
      {
        title: "Download any pre-workshop materials",
        description: "Check your email for any worksheets or reading materials from your facilitator.",
      },
      {
        title: "Review the workshop details",
        description: "Familiarize yourself with what to expect during the session.",
      },
      {
        title: "Add the event to your calendar",
        description: startTime
          ? `${format(startTime, "EEEE, MMMM d")} · ${format(startTime, "h:mm a")}${endTime ? ` - ${format(endTime, "h:mm a")}` : ""}${!isVirtual && (session as any)?.location_name ? ` · ${(session as any).location_name}` : ""}`
          : "Check the sidebar for date and time details.",
      },
      {
        title: isVirtual ? "Test your audio and video" : "Review the location and parking info",
        description: isVirtual
          ? "Make sure your camera and microphone are working before the session."
          : (session as any)?.location_address
            ? `${(session as any).location_address}. Arrive a few minutes early.`
            : "Check the logistics section for venue details.",
      },
    ]
  }, [session, startTime, endTime, isVirtual])

  return (
    <main className="pt-4 pb-16 min-w-0">
      {/* ── UPCOMING STATE ── */}
      {(workshopState === "upcoming" || workshopState === "live") && (
        <>
          {/* Message from Facilitator */}
          {practitioner && (
            <section className="mb-11">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Message from Your Facilitator
              </div>
              <div className="bg-white border border-sage-200/60 border-l-4 border-l-amber-400 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar className="w-9 h-9 shrink-0">
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
                  <div className="flex-1">
                    <div className="text-[13.5px] font-medium text-olive-900">
                      {practitioner.name}
                    </div>
                    <div className="text-xs text-olive-500">
                      Workshop Facilitator
                    </div>
                  </div>
                  {(session as any)?.facilitator_message_date && (
                    <div className="text-xs text-olive-500">
                      Sent {(session as any).facilitator_message_date}
                    </div>
                  )}
                </div>
                <div className="text-sm font-light leading-[1.7] text-olive-600">
                  {(session as any)?.facilitator_message ??
                    service?.description ??
                    `Looking forward to meeting you at the workshop. Come with an open mind and a willingness to explore.`}
                </div>
              </div>
            </section>
          )}

          {/* Preparation Checklist */}
          {workshopState === "upcoming" && (
            <section className="mb-11">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Prepare for Your Workshop
              </div>
              <div className="flex flex-col gap-2.5">
                {prepItems.map((item, i) => (
                  <PrepItem
                    key={i}
                    title={item.title}
                    description={item.description}
                    done={!!prepChecked[i]}
                    onToggle={() => togglePrep(i)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Logistics Grid */}
          {workshopState === "upcoming" && (
            <section className="mb-11">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Day-of Logistics
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Location card */}
                <div className="p-[18px] px-5 bg-white border border-sage-200/60 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-olive-500 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-[13px] h-[13px] text-amber-600" />
                    Location
                  </div>
                  <div className="text-[15px] font-medium text-olive-900 mb-1">
                    {isVirtual
                      ? "Virtual — Online"
                      : (session as any)?.location_name ?? "See details"}
                  </div>
                  <div className="text-[12.5px] text-olive-500 leading-snug">
                    {isVirtual
                      ? "Join from your device via the link provided"
                      : (session as any)?.location_address ?? "Address details will be shared closer to the event."}
                  </div>
                  {!isVirtual && (session as any)?.location_address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent((session as any).location_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12.5px] text-amber-600 mt-2 hover:opacity-75 transition-opacity"
                    >
                      Open in Maps
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Time card */}
                <div className="p-[18px] px-5 bg-white border border-sage-200/60 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-olive-500 mb-2 flex items-center gap-1.5">
                    <Clock className="w-[13px] h-[13px] text-amber-600" />
                    Time
                  </div>
                  <div className="text-[15px] font-medium text-olive-900 mb-1">
                    {startTime
                      ? `${format(startTime, "h:mm")} – ${endTime ? format(endTime, "h:mm a") : format(startTime, "h:mm a")}`
                      : "Time TBD"}
                  </div>
                  <div className="text-[12.5px] text-olive-500 leading-snug">
                    {isVirtual
                      ? "Link will be available 15 minutes before start."
                      : "Please arrive a few minutes early."}
                  </div>
                </div>

                {/* Group Size card */}
                <div className="p-[18px] px-5 bg-white border border-sage-200/60 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-olive-500 mb-2 flex items-center gap-1.5">
                    <Users className="w-[13px] h-[13px] text-amber-600" />
                    Group Size
                  </div>
                  <div className="text-[15px] font-medium text-olive-900 mb-1">
                    {session?.current_participants != null && session?.max_participants
                      ? `${session.current_participants} of ${session.max_participants} registered`
                      : session?.max_participants
                        ? `Up to ${session.max_participants} participants`
                        : "Small group format"}
                  </div>
                  <div className="text-[12.5px] text-olive-500 leading-snug">
                    Small, intimate group format.
                  </div>
                </div>

                {/* What to Bring card */}
                <div className="p-[18px] px-5 bg-white border border-sage-200/60 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-olive-500 mb-2 flex items-center gap-1.5">
                    <Layers className="w-[13px] h-[13px] text-amber-600" />
                    What to Bring
                  </div>
                  <div className="text-[15px] font-medium text-olive-900 mb-1">
                    {(session as any)?.what_to_bring ?? "Just yourself"}
                  </div>
                  <div className="text-[12.5px] text-olive-500 leading-snug">
                    All materials provided.{" "}
                    {(session as any)?.what_to_bring_note ?? "Optional: a journal if you like to write."}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Today: Big logistics view */}
          {workshopState === "live" && (
            <section className="mb-11">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Getting There
              </div>
              <div className="bg-amber-50/60 border-[1.5px] border-amber-200 rounded-xl shadow-sm p-5 mb-3">
                <div className="text-[15px] font-medium text-olive-900 mb-1">
                  {isVirtual
                    ? "Your virtual session room"
                    : (session as any)?.location_name ?? "Workshop venue"}
                </div>
                <div className="text-[13px] text-olive-500">
                  {isVirtual
                    ? "Click Join Session to enter the room"
                    : (session as any)?.location_address ?? "See your booking details"}
                </div>
                {!isVirtual && (session as any)?.location_address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent((session as any).location_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12.5px] text-amber-600 mt-2.5 hover:opacity-75 transition-opacity"
                  >
                    <MapPin className="w-[13px] h-[13px]" />
                    Open in Maps
                    <ChevronRight className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="p-[18px] px-5 bg-white border border-sage-200/60 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-olive-500 mb-2 flex items-center gap-1.5">
                    <Clock className="w-[13px] h-[13px] text-amber-600" />
                    Timing
                  </div>
                  <div className="text-[15px] font-medium text-olive-900 mb-1">
                    {startTime ? `Starts at ${format(startTime, "h:mm a")}` : "Starting soon"}
                  </div>
                  <div className="text-[12.5px] text-olive-500 leading-snug">
                    Please arrive a few minutes early.
                  </div>
                </div>
                <div className="p-[18px] px-5 bg-white border border-sage-200/60 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-olive-500 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-[13px] h-[13px] text-amber-600" />
                    Questions?
                  </div>
                  <div className="text-[15px] font-medium text-olive-900 mb-1">
                    Message {practitioner?.name ?? "your facilitator"}
                  </div>
                  <div className="text-[12.5px] text-olive-500 leading-snug">
                    Available for questions before the session.
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Fellow Attendees */}
          {workshopState === "upcoming" && (session as any)?.attendees && Array.isArray((session as any).attendees) && (session as any).attendees.length > 0 && (
            <section className="mb-11">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Who&apos;s Attending{" "}
                {session?.current_participants != null
                  ? `· ${session.current_participants} registered`
                  : ""}
              </div>
              <div>
                {(session as any).attendees.slice(0, 5).map((attendee: any, i: number) => {
                  const isYou = attendee.is_current_user
                  const gradients = [
                    "from-[#8a7060] to-[#5a4030]",
                    "from-[#6a7a5a] to-[#3a4a2a]",
                    "from-[#6a5a7a] to-[#3a2a4a]",
                    "from-[#5a6a7a] to-[#2a3a4a]",
                    "from-[#7a6a5a] to-[#4a3a2a]",
                  ]
                  return (
                    <div
                      key={attendee.id ?? i}
                      className={`flex items-center gap-2.5 py-2.5 ${
                        i < ((session as any).attendees as any[]).length - 1
                          ? "border-b border-sage-200/60"
                          : ""
                      }`}
                    >
                      <Avatar className="w-[34px] h-[34px] shrink-0">
                        {attendee.profile_image_url ? (
                          <AvatarImage src={attendee.profile_image_url} alt={attendee.first_name} />
                        ) : null}
                        <AvatarFallback className={`bg-gradient-to-br ${gradients[i % gradients.length]} text-white/80 font-serif text-sm italic`}>
                          {attendee.first_name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm text-olive-900">
                          {attendee.first_name}
                          {attendee.last_initial ? ` ${attendee.last_initial}.` : ""}
                        </div>
                        {attendee.location && (
                          <div className="text-xs text-olive-500">
                            {attendee.location}
                          </div>
                        )}
                      </div>
                      {isYou && (
                        <span className="text-[11px] font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 ml-auto">
                          You
                        </span>
                      )}
                    </div>
                  )
                })}
                {(session as any).attendees.length > 5 && (
                  <div className="pt-3 text-[13px] text-olive-500">
                    + {(session as any).attendees.length - 5} others · names visible to facilitator only
                  </div>
                )}
                {session?.current_participants != null &&
                  (session as any).attendees.length < session.current_participants && (
                    <div className="pt-3 text-[13px] text-olive-500">
                      + {session.current_participants - (session as any).attendees.length} others · names visible to facilitator only
                    </div>
                  )}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── POST-WORKSHOP STATE ── */}
      {workshopState === "completed" && (
        <>
          {/* ── Your Journal ── */}
          <JournalSection bookingUuid={String(booking.public_uuid || "")} accentColor="amber" />

          {/* ── Resources & Materials ── */}
          <section className="mb-11">
            <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
              Resources &amp; Materials
            </div>

            {/* Session recordings */}
            {booking.recordings && Array.isArray(booking.recordings) && booking.recordings.length > 0 && (
              <div className="space-y-2.5 mb-4">
                {booking.recordings.map((recording: any, i: number) => (
                  <div
                    key={recording?.id ?? i}
                    className="flex items-center gap-3.5 p-3.5 px-4 bg-white border border-sage-200/60 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Video className="w-[18px] h-[18px] text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-olive-900 truncate">
                        {recording.title ??
                          `${service?.name ?? "Workshop"} — Full Session`}
                      </div>
                      <div className="text-xs text-olive-500">
                        {recording.date_formatted ??
                          (session?.start_time
                            ? format(toDate(session.start_time), "MMM d, yyyy")
                            : "")}
                        {recording.duration_formatted
                          ? ` · ${recording.duration_formatted}`
                          : recording.duration_seconds
                            ? ` · ${Math.floor(recording.duration_seconds / 60)} min`
                            : ""}
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1.5 text-[12.5px] text-amber-700 bg-amber-100 border-none rounded-full px-3 py-1.5 hover:bg-amber-200 transition-colors"
                      onClick={() => {
                        if (recording?.file_url) {
                          window.open(recording.file_url, '_blank')
                        } else if (booking?.public_uuid) {
                          router.push(`/dashboard/user/bookings/${booking.public_uuid}/recordings/${recording?.id || ''}`)
                        }
                      }}
                    >
                      <PlayCircle className="w-3 h-3" />
                      Watch
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Attached files / resources */}
            {(booking as any).resources && Array.isArray((booking as any).resources) && (booking as any).resources.length > 0 && (
              <div className="space-y-2.5 mb-4">
                {(booking as any).resources.map((resource: any, i: number) => {
                  const type = resource.type ?? "pdf"
                  const iconBg =
                    type === "video"
                      ? "bg-amber-100"
                      : type === "audio"
                        ? "bg-orange-100"
                        : "bg-sage-100"
                  const iconColor =
                    type === "video"
                      ? "text-amber-600"
                      : type === "audio"
                        ? "text-orange-600"
                        : "text-sage-700"
                  const Icon =
                    type === "video"
                      ? Video
                      : type === "audio"
                        ? Music
                        : FileText
                  const actionLabel =
                    type === "video"
                      ? "Watch"
                      : type === "audio"
                        ? "Play"
                        : "Download"
                  const ActionIcon =
                    type === "video" || type === "audio"
                      ? PlayCircle
                      : Download

                  return (
                    <div
                      key={resource?.id ?? i}
                      className="flex items-center gap-3.5 p-3.5 px-4 bg-white border border-sage-200/60 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-olive-900 truncate">
                          {resource.title}
                        </div>
                        <div className="text-xs text-olive-500">
                          {resource.meta ?? resource.description ?? ""}
                        </div>
                      </div>
                      <button className="flex items-center gap-1.5 text-[12.5px] text-amber-700 bg-amber-100 border-none rounded-full px-3 py-1.5 hover:bg-amber-200 transition-colors whitespace-nowrap">
                        <ActionIcon className="w-3 h-3" />
                        {actionLabel}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Placeholder when no resources yet */}
            {!(booking.recordings && Array.isArray(booking.recordings) && booking.recordings.length > 0) &&
              !((booking as any).resources && Array.isArray((booking as any).resources) && (booking as any).resources.length > 0) && (
              <p className="text-sm text-olive-400 italic">
                Recordings, files and materials from your workshop will appear here.
              </p>
            )}
          </section>

          {/* Post-workshop Note from Facilitator */}
          {practitioner && (
            <section className="mb-11">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-olive-500 mb-4 pb-2.5 border-b border-sage-200/60">
                Note from {practitioner.name}
              </div>
              <div className="bg-white border border-sage-200/60 border-l-4 border-l-amber-400 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar className="w-9 h-9 shrink-0">
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
                  <div className="flex-1">
                    <div className="text-[13.5px] font-medium text-olive-900">
                      {practitioner.name}
                    </div>
                    <div className="text-xs text-olive-500">
                      Workshop Facilitator
                    </div>
                  </div>
                  {session?.start_time && (
                    <div className="text-xs text-olive-500">
                      {format(toDate(session.start_time), "MMM d")}
                    </div>
                  )}
                </div>
                <div className="text-sm font-light leading-[1.7] text-olive-600">
                  {(session as any)?.post_workshop_message ??
                    `Thank you for being part of this workshop. The resources above are yours to keep. If you'd like to continue the work with more personal attention, I'm always available for a 1:1 session.`}
                </div>
              </div>
            </section>
          )}

          <ReviewBookingDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            booking={booking as any}
          />
        </>
      )}

      {/* ── CANCELED STATE ── */}
      {workshopState === "canceled" && (
        <section className="mb-11">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-2">
              <XCircle className="w-4 h-4" />
              Booking Canceled
            </div>
            {booking.cancellation_reason && (
              <p className="text-sm text-red-700">
                Reason: {booking.cancellation_reason}
              </p>
            )}
            {booking.canceled_at && (
              <p className="text-xs text-red-600 mt-1">
                Canceled on{" "}
                {format(
                  toDate(booking.canceled_at),
                  "MMM d, yyyy"
                )}
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  booking,
  service,
  practitioner,
  session,
  workshopState,
  joinable,
  journeyData,
}: {
  booking: BookingDetailReadable
  service: BookingService | undefined
  practitioner: BookingPractitioner | undefined
  session: ServiceSession | undefined
  workshopState: WorkshopState
  joinable: boolean
  journeyData?: JourneyDetail
}) {
  const startTime = session?.start_time
    ? toDate(session.start_time)
    : null
  const endTime = session?.end_time
    ? toDate(session.end_time)
    : null
  const isVirtual = service?.location_type === "virtual"
  const priceDollars = service?.price_cents
    ? `$${(service.price_cents / 100).toFixed(2)}`
    : null
  const roomUuid = booking.room
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const bookingUuid = String(booking.public_uuid || (booking as any).id || "")

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (reason: string) => {
      const { bookingsCancelCreate } = await import("@/src/client")
      await bookingsCancelCreate({
        path: { public_uuid: bookingUuid },
        body: { reason, status: "canceled", canceled_by: "client" } as any,
      })
    },
    onSuccess: () => {
      toast.success("Workshop booking canceled")
      router.push("/dashboard/user/journeys")
    },
    onError: () => {
      toast.error("Failed to cancel booking")
    },
  })

  const handleMessagePractitioner = async () => {
    const practitionerUserId = (practitioner as any)?.user_id
    if (!practitionerUserId) {
      toast.error("Unable to message practitioner")
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
    <aside className="lg:sticky lg:top-20 pb-16 flex flex-col gap-0 self-start">
      {/* ── TICKET CARD ── */}
      <div className="bg-white border border-sage-200/60 rounded-xl shadow-sm overflow-visible relative mb-5">
        {/* Ticket header */}
        <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-br from-[#1e1508] to-[#2e1f0a] p-5 pb-[18px]">
          {/* Service image background */}
          {(journeyData?.service_image_url || (service as any)?.featured_image_url) && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${journeyData?.service_image_url || (service as any)?.featured_image_url})` }}
            />
          )}
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1508] via-[#1e1508]/60 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(176,125,58,0.2)_0%,transparent_60%)]" />
          <div className="relative z-10">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[#f5f0e8]/35 mb-1.5">
              Your Ticket
            </div>
            <div className="font-serif text-xl font-medium text-[#f5f0e8] leading-tight mb-3.5">
              {service?.name ?? "Workshop"}
            </div>
            {startTime && (
              <>
                <div className="flex items-center gap-2 text-[13px] text-[#f5f0e8]/60 mb-1">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  <strong className="text-[#f5f0e8]/90 font-medium">
                    {format(startTime, "EEEE, MMMM d")}
                  </strong>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#f5f0e8]/60">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {format(startTime, "h:mm")}
                  {endTime ? ` – ${format(endTime, "h:mm a")}` : ` ${format(startTime, "a")}`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticket tear */}
        <div className="flex items-center -mx-[1px]">
          <div className="w-4 h-4 rounded-full bg-cream-50 shrink-0 relative z-10" />
          <div className="flex-1 border-t-[1.5px] border-dashed border-sage-200/60 mx-1" />
          <div className="w-4 h-4 rounded-full bg-cream-50 shrink-0 relative z-10" />
        </div>

        {/* Ticket stub */}
        <div className="px-5 py-4">
          {/* Attendee */}
          {(booking.user as any)?.first_name && (
            <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
              <span className="flex items-center gap-1.5 text-olive-500">
                <Users className="w-3 h-3 text-amber-600" />
                Attendee
              </span>
              <span className="font-medium text-olive-900">
                {(booking.user as any).first_name}
                {(booking.user as any).last_name ? ` ${(booking.user as any).last_name}` : ""}
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
            <span className="flex items-center gap-1.5 text-olive-500">
              <MapPin className="w-3 h-3 text-amber-600" />
              Location
            </span>
            <span className="font-medium text-olive-900 text-right text-xs">
              {isVirtual
                ? "Virtual"
                : (session as any)?.location_name ?? "In-person"}
            </span>
          </div>

          {/* Facilitator */}
          {practitioner?.name && (
            <div className="flex justify-between py-[7px] border-b border-sage-200/60 text-[13px]">
              <span className="flex items-center gap-1.5 text-olive-500">
                <Layers className="w-3 h-3 text-amber-600" />
                Facilitator
              </span>
              <span className="font-medium text-olive-900">
                {practitioner.name}
              </span>
            </div>
          )}

          {/* Paid */}
          {priceDollars && (
            <div className="flex justify-between py-[7px] text-[13px]">
              <span className="flex items-center gap-1.5 text-olive-500">
                <FileText className="w-3 h-3 text-amber-600" />
                Paid
              </span>
              <span className="font-medium text-olive-900">
                {priceDollars}
              </span>
            </div>
          )}

          {/* Confirmation number */}
          {booking.public_uuid && (
            <div className="mt-3 pt-3 border-t border-sage-200/60 text-center">
              <div className="text-[10px] tracking-[0.1em] uppercase text-olive-500 mb-1">
                Confirmation
              </div>
              <div className="font-serif text-lg font-medium tracking-wider text-amber-600">
                {booking.public_uuid.slice(0, 8).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ACTION BUTTONS: Upcoming ── */}
      {workshopState === "upcoming" && (
        <div className="flex flex-col gap-2 mb-5">
          {joinable && isVirtual && roomUuid && (
            <Button
              className="w-full h-[50px] rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-medium gap-2"
              asChild
            >
              <a href={`/room/${roomUuid}/lobby`}>
                <Video className="w-[15px] h-[15px]" />
                Join Session
              </a>
            </Button>
          )}
          <Button
            className="w-full h-[50px] rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-medium gap-2"
            onClick={() => {
              if (!startTime) return
              const start = startTime
              const end = endTime ?? new Date(start.getTime() + 60 * 60000)
              const url = generateCalendarUrl(
                service?.name || 'Workshop',
                start,
                end,
                `Workshop with ${(practitioner as any)?.display_name || practitioner?.name || 'your facilitator'}`,
                isVirtual ? 'Virtual (Estuary)' : 'In Person'
              )
              window.open(url, '_blank')
            }}
          >
            <CalendarPlus className="w-[15px] h-[15px]" />
            Add to Calendar
          </Button>
          {!isVirtual && (
            <Button
              variant="outline"
              className="w-full h-11 rounded-full border border-sage-200 text-olive-700 hover:border-sage-300 hover:text-olive-900 text-sm gap-2"
            >
              <MapPin className="w-3.5 h-3.5" />
              Get Directions
            </Button>
          )}
          <button
            onClick={() => setCancelDialogOpen(true)}
            className="w-full text-center text-[12.5px] text-olive-400 hover:text-red-500 transition-colors py-1"
          >
            Cancel Workshop
          </button>
        </div>
      )}

      {/* ── ACTION BUTTONS: Today/Live ── */}
      {workshopState === "live" && (
        <div className="flex flex-col gap-2 mb-5">
          {isVirtual && roomUuid ? (
            <Button
              className="w-full h-[50px] rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-medium gap-2"
              asChild
            >
              <a href={`/room/${roomUuid}/lobby`}>
                <Video className="w-[15px] h-[15px]" />
                Join Session Now
              </a>
            </Button>
          ) : (
            <Button className="w-full h-[50px] rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[15px] font-medium gap-2">
              <MapPin className="w-[15px] h-[15px]" />
              Get Directions
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-11 rounded-full border border-sage-200 text-olive-700 hover:border-sage-300 hover:text-olive-900 text-sm gap-2"
            onClick={handleMessagePractitioner}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Message {practitioner?.name?.split(" ")[0] ?? "Facilitator"}
          </Button>
        </div>
      )}

      {/* ── ACTION BUTTONS: Completed ── */}
      {workshopState === "completed" && (
        <div className="flex flex-col gap-2 mb-5">
          {booking.recordings &&
            Array.isArray(booking.recordings) &&
            booking.recordings.length > 0 && (
              <Button
                className="w-full h-[50px] rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[15px] font-medium gap-2"
                onClick={() => {
                  const recording = (booking as any)?.recordings?.[0]
                  if (recording?.file_url) {
                    window.open(recording.file_url, '_blank')
                  } else if (booking?.public_uuid) {
                    router.push(`/dashboard/user/bookings/${booking.public_uuid}/recordings/${recording?.id || ''}`)
                  }
                }}
              >
                <Video className="w-[15px] h-[15px]" />
                Watch Recording
              </Button>
            )}
          <Button
            variant="outline"
            className="w-full h-11 rounded-full border border-sage-200 text-olive-700 hover:border-sage-300 hover:text-olive-900 text-sm gap-2"
            onClick={handleMessagePractitioner}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Message {practitioner?.name?.split(" ")[0] ?? "Facilitator"}
          </Button>
        </div>
      )}

      {/* ── CANCELED STATE ── */}
      {workshopState === "canceled" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-5">
          <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-2">
            <XCircle className="w-4 h-4" />
            Booking Canceled
          </div>
          {booking.cancellation_reason && (
            <p className="text-sm text-red-700">
              Reason: {booking.cancellation_reason}
            </p>
          )}
        </div>
      )}

      {/* ── PRACTITIONER CONTACT ── */}
      {practitioner && (
        <div className="flex items-center gap-3 p-4 bg-cream-50 border border-sage-200/60 rounded-xl shadow-sm mb-5">
          <Avatar className="w-11 h-11 shrink-0">
            {practitioner.profile_image_url ? (
              <AvatarImage
                src={practitioner.profile_image_url}
                alt={practitioner.name ?? "Facilitator"}
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white font-serif text-lg italic">
              {practitioner.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-olive-900 truncate">
              {practitioner.name}
            </div>
            <div className="text-xs text-olive-500">Your facilitator</div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-sage-700 bg-sage-100 hover:bg-sage-200 rounded-full text-xs shrink-0 gap-1.5"
            onClick={handleMessagePractitioner}
          >
            <MessageSquare className="w-3 h-3" />
            Message
          </Button>
        </div>
      )}

      {/* ── CONTINUE YOUR JOURNEY UPSELL ── */}
      {practitioner && (
        <div className="bg-sage-50 border border-sage-200 rounded-xl p-[18px]">
          <div className="text-[10px] tracking-[0.1em] uppercase text-sage-600 mb-2">
            Continue the work
          </div>
          <div className="font-serif text-lg font-medium text-olive-900 mb-1">
            Explore more from {practitioner.name}
          </div>
          <div className="text-[12.5px] text-olive-500 leading-snug mb-3">
            {practitioner.name}&apos;s sessions, workshops and courses to deepen your practice.
          </div>
          <Button
            className="w-full h-[38px] rounded-full bg-sage-600 hover:bg-sage-700 text-white text-[13px] font-medium gap-1.5"
            asChild
          >
            <Link href={`/practitioners/${practitioner.slug || practitioner.id}`}>
              <Layers className="w-[13px] h-[13px]" />
              Explore Offerings
            </Link>
          </Button>
        </div>
      )}

      {/* ── Cancel Dialog ── */}
      <CancelBookingDialog
        bookingId={booking.public_uuid || String(booking.id)}
        serviceName={service?.name || "Workshop"}
        practitionerName={practitioner?.name || "Facilitator"}
        date={startTime ? format(startTime, "MMMM d, yyyy") : ""}
        time={startTime ? format(startTime, "h:mm a") : ""}
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

export default function WorkshopDelivery({ bookingUuid, journeyData }: WorkshopDeliveryProps) {
  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingUuid } }),
  })

  const workshopState = useMemo(
    () => (booking ? deriveWorkshopState(booking) : "upcoming"),
    [booking]
  )

  const joinable = useMemo(
    () => (booking ? isJoinable(booking, workshopState) : false),
    [booking, workshopState]
  )

  if (isLoading) {
    return <WorkshopDeliverySkeleton />
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-olive-500 mb-4">
          Failed to load workshop details.
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

  const service = booking.service
  const practitioner = booking.practitioner
  const session = booking.service_session

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <HeroSection
        booking={booking}
        service={service}
        practitioner={practitioner}
        session={session}
        workshopState={workshopState}
      />

      {/* Body - two column */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <MainColumn
          booking={booking}
          service={service}
          practitioner={practitioner}
          session={session}
          workshopState={workshopState}
        />
        <Sidebar
          booking={booking}
          service={service}
          practitioner={practitioner}
          session={session}
          workshopState={workshopState}
          joinable={joinable}
          journeyData={journeyData}
        />
      </div>
    </div>
  )
}
