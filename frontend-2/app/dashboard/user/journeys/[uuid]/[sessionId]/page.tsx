"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  bookingsRetrieveOptions,
  bookingsListOptions,
} from "@/src/client/@tanstack/react-query.gen"
import type {
  BookingDetailReadable,
  BookingListReadable,
} from "@/src/client/types.gen"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Video,
  MapPin,
  Play,
  Check,
  CheckCircle,
  PlayCircle,
  Download,
  Film,
  MessageSquare,
  ChevronRight,
  FileText,
} from "lucide-react"
import {
  format,
  parseISO,
  isFuture,
  isPast,
  differenceInMinutes,
} from "date-fns"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModuleState = "upcoming" | "live" | "completed" | "canceled"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveModuleState(booking: BookingDetailReadable): ModuleState {
  if (booking.status === "canceled") return "canceled"
  const session = booking.service_session
  if (session?.status === "completed") return "completed"
  if (session?.status === "in_progress") return "live"
  if (
    session?.status === "scheduled" &&
    session?.start_time &&
    isPast(parseISO(String(session.start_time)))
  ) {
    return "completed"
  }
  return "upcoming"
}

function isJoinable(
  booking: BookingDetailReadable,
  state: ModuleState
): boolean {
  if (state === "canceled" || state === "completed") return false
  const session = booking.service_session
  const isVirtual = booking.service?.location_type === "virtual"
  if (!isVirtual) return false
  if (!session?.start_time) return false
  const start = parseISO(String(session.start_time))
  const minutesUntil = differenceInMinutes(start, new Date())
  return minutesUntil <= 15 || state === "live"
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CourseSessionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-[#f5f2ed]">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-teal-50 via-[#faf8f5] to-[#f0ede8]/30 px-6 py-12 pb-16">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-4 w-48 bg-teal-100/50" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 bg-teal-100/50 rounded-full" />
            <Skeleton className="h-6 w-24 bg-teal-100/50 rounded-full" />
          </div>
          <Skeleton className="h-12 w-3/4 bg-teal-100/50" />
          <Skeleton className="h-5 w-1/3 bg-teal-100/50" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-8 w-36 bg-teal-100/50 rounded-full" />
            <Skeleton className="h-5 w-20 bg-teal-100/50" />
          </div>
        </div>
      </div>
      {/* Body skeleton */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 py-10">
        <div className="space-y-8">
          <div className="bg-white border border-[#e0d8ce]/60 rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="bg-white border border-[#e0d8ce]/60 rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ state }: { state: ModuleState }) {
  switch (state) {
    case "upcoming":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-teal-700 border border-teal-200 bg-teal-50 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Upcoming
        </span>
      )
    case "live":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Now
        </span>
      )
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-olive-600 border border-[#e0d8ce] bg-[#f0ede8] rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-olive-500" />
          Completed
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
  moduleState,
  moduleNumber,
  totalModules,
  courseName,
  courseUuid,
}: {
  booking: BookingDetailReadable
  moduleState: ModuleState
  moduleNumber: number
  totalModules: number
  courseName: string
  courseUuid: string
}) {
  const service = booking.service
  const practitioner = booking.practitioner
  const session = booking.service_session
  const startTime = session?.start_time
    ? parseISO(String(session.start_time))
    : null
  const endTime = session?.end_time
    ? parseISO(String(session.end_time))
    : null
  const duration = booking.duration_minutes ?? session?.duration
  const isVirtual = service?.location_type === "virtual"
  const moduleTitle =
    session?.title ?? `Module ${moduleNumber}`

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-[#faf8f5] to-[#f0ede8]/30">
      {/* Subtle decorative radials */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(45,106,106,0.06)_0%,transparent_50%),radial-gradient(ellipse_at_10%_80%,rgba(156,175,136,0.08)_0%,transparent_45%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-14">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[13px] text-[#7a6f5d] mb-6 flex-wrap">
          <Link
            href="/dashboard/user/journeys"
            className="hover:text-[#5a5040] transition-colors"
          >
            My Journey
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link
            href={`/dashboard/user/journeys/${courseUuid}`}
            className="hover:text-[#5a5040] transition-colors"
          >
            {courseName}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#3d2e1e]">
            Module {moduleNumber}: {moduleTitle}
          </span>
        </nav>

        <div className="max-w-[660px]">
          {/* Eyebrow badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-teal-700 border border-teal-200 bg-teal-100 rounded-full px-2.5 py-0.5">
              Module {moduleNumber} of {totalModules}
            </span>
            <StatusBadge state={moduleState} />
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-[50px] font-medium text-[#2a2218] leading-none tracking-tight mb-2">
            {moduleTitle}
          </h1>

          {/* Course name subtitle */}
          <p className="text-[15px] text-[#7a6f5d] mb-5">
            {courseName}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-5 flex-wrap">
            {practitioner && (
              <Link
                href={`/practitioners/${practitioner.slug || practitioner.id}`}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-8 h-8 border border-[#e0d8ce]">
                  {practitioner.profile_image_url ? (
                    <AvatarImage
                      src={practitioner.profile_image_url}
                      alt={practitioner.name ?? "Practitioner"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 text-xs font-serif italic">
                    {practitioner.name?.charAt(0) ?? "P"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-[#5a5040]">
                  with {practitioner.name}
                </span>
              </Link>
            )}

            {startTime && (
              <span className="flex items-center gap-1.5 text-[13px] text-[#9b9088]">
                <Calendar className="w-3.5 h-3.5" />
                {format(startTime, "EEE, MMM d")}
              </span>
            )}

            {startTime && (
              <span className="flex items-center gap-1.5 text-[13px] text-[#9b9088]">
                <Clock className="w-3.5 h-3.5" />
                {format(startTime, "h:mm a")}
                {endTime && ` - ${format(endTime, "h:mm a")}`}
              </span>
            )}

            {duration && (
              <span className="flex items-center gap-1.5 text-[13px] text-[#9b9088]">
                <Clock className="w-3.5 h-3.5" />
                {duration} min
              </span>
            )}

            <span className="flex items-center gap-1.5 text-[13px] text-[#9b9088]">
              {isVirtual ? (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Virtual
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" />
                  In-person
                </>
              )}
            </span>
          </div>
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
  moduleState,
  prevModule,
  nextModule,
  courseUuid,
}: {
  booking: BookingDetailReadable
  moduleState: ModuleState
  prevModule: BookingListReadable | null
  nextModule: BookingListReadable | null
  courseUuid: string
}) {
  const session = booking.service_session
  const practitioner = booking.practitioner
  const [clientNotes, setClientNotes] = useState(booking.client_notes ?? "")
  const [isEditingNotes, setIsEditingNotes] = useState(false)

  // Save notes mutation
  const { mutate: saveNotes, isPending: isSavingNotes } = useMutation({
    mutationFn: async (notes: string) => {
      const { bookingsPartialUpdate } = await import("@/src/client")
      await bookingsPartialUpdate({
        path: { public_uuid: booking.public_uuid || String(booking.id) },
        body: { client_notes: notes } as any,
      })
    },
    onSuccess: () => {
      toast.success("Notes saved")
      setIsEditingNotes(false)
    },
    onError: () => {
      toast.error("Failed to save notes")
    },
  })

  return (
    <main className="min-w-0 space-y-6">
      {/* About This Module */}
      {(booking.service?.description || session?.title) && (
        <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm p-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[#9b9088] mb-4 pb-2.5 border-b border-[#e0d8ce]/60">
            About This Module
          </div>
          {booking.service?.description && (
            <div className="text-[15px] font-light leading-[1.75] text-[#6b6258]">
              <p>{booking.service.description}</p>
            </div>
          )}
        </div>
      )}

      {/* What You'll Learn */}
      {(session as any)?.what_youll_learn && (
        <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm p-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-[#9b9088] mb-4 pb-2.5 border-b border-[#e0d8ce]/60">
            What You&apos;ll Learn
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(session as any).what_youll_learn
              .split("\n")
              .filter(Boolean)
              .map((item: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-4 py-3.5 bg-[#faf8f5] border border-[#e0d8ce]/40 rounded-lg"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                  <span className="text-[13.5px] text-[#6b6258] leading-snug">
                    {item.trim()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Your Notes */}
      <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm p-6">
        <div className="text-[11px] font-medium uppercase tracking-widest text-[#9b9088] mb-4 pb-2.5 border-b border-[#e0d8ce]/60 flex items-center justify-between">
          <span>Your Notes</span>
          {!isEditingNotes && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-[11px] font-medium text-teal-600 hover:text-teal-800 transition-colors normal-case tracking-normal"
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
              placeholder="Add personal notes about this module..."
              className="min-h-[120px] resize-y border-[#e0d8ce] focus:border-teal-400 bg-white rounded-xl"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => saveNotes(clientNotes)}
                disabled={isSavingNotes}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-full text-xs"
              >
                {isSavingNotes ? "Saving..." : "Save Notes"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setClientNotes(booking.client_notes ?? "")
                  setIsEditingNotes(false)
                }}
                className="rounded-full text-xs text-[#9b9088]"
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-[#9b9088]">
              These notes are only visible to you.
            </p>
          </div>
        ) : (
          <p className="text-[14px] font-light text-[#6b6258] leading-relaxed">
            {booking.client_notes || "No notes yet. Click Edit to add some."}
          </p>
        )}
      </div>

      {/* Session Recording - completed state */}
      {moduleState === "completed" &&
        booking.recordings &&
        Array.isArray(booking.recordings) &&
        (booking.recordings as any[]).length > 0 && (
          <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm p-6">
            <div className="text-[11px] font-medium uppercase tracking-widest text-[#9b9088] mb-4 pb-2.5 border-b border-[#e0d8ce]/60">
              Session Recording
            </div>
            <div className="space-y-2.5">
              {(booking.recordings as any[]).map(
                (recording: any, i: number) => (
                  <div
                    key={recording?.id ?? i}
                    className="flex items-center gap-3.5 p-4 bg-[#faf8f5] border border-[#e0d8ce]/40 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                      <Film className="w-[18px] h-[18px] text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#2a2218] truncate">
                        {recording.title ?? `Module Recording`}
                      </div>
                      <div className="text-xs text-[#9b9088]">
                        {recording.duration_formatted ??
                          (recording.duration_seconds
                            ? `${Math.floor(recording.duration_seconds / 60)} min`
                            : "")}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0 rounded-full text-xs gap-1.5"
                        variant="ghost"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Watch
                      </Button>
                      {(recording.download_url || recording.file_url) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-xs gap-1.5 text-[#9b9088]"
                          asChild
                        >
                          <a
                            href={recording.download_url || recording.file_url}
                            download
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* Practitioner Notes - completed state */}
      {moduleState === "completed" &&
        (booking as any).practitioner_notes && (
          <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm p-6">
            <div className="text-[11px] font-medium uppercase tracking-widest text-[#9b9088] mb-4 pb-2.5 border-b border-[#e0d8ce]/60">
              Practitioner Notes
            </div>
            <div className="bg-[#faf8f5] border border-[#e0d8ce]/40 border-l-[3px] border-l-teal-500 rounded-r-lg p-5">
              <p className="text-[14px] font-light leading-relaxed text-[#6b6258]">
                {(booking as any).practitioner_notes}
              </p>
              {practitioner && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#e0d8ce]/60">
                  <Avatar className="w-6 h-6">
                    {practitioner.profile_image_url ? (
                      <AvatarImage
                        src={practitioner.profile_image_url}
                        alt={practitioner.name ?? "Practitioner"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 text-[10px] font-serif italic">
                      {practitioner.name?.charAt(0) ?? "P"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-[#9b9088]">
                    {practitioner.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Module Navigation */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between">
          {prevModule ? (
            <Button
              variant="outline"
              className="rounded-full border-[#e0d8ce] text-[#6b6258] hover:border-teal-300 hover:text-teal-700 text-sm gap-2"
              asChild
            >
              <Link
                href={`/dashboard/user/journeys/${courseUuid}/${prevModule.public_uuid || prevModule.id}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Module
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {nextModule ? (
            <Button
              variant="outline"
              className="rounded-full border-[#e0d8ce] text-[#6b6258] hover:border-teal-300 hover:text-teal-700 text-sm gap-2"
              asChild
            >
              <Link
                href={`/dashboard/user/journeys/${courseUuid}/${nextModule.public_uuid || nextModule.id}`}
              >
                Next Module
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  booking,
  moduleState,
  joinable: canJoin,
  moduleNumber,
  totalModules,
  completedCount,
  courseUuid,
}: {
  booking: BookingDetailReadable
  moduleState: ModuleState
  joinable: boolean
  moduleNumber: number
  totalModules: number
  completedCount: number
  courseUuid: string
}) {
  const service = booking.service
  const practitioner = booking.practitioner
  const session = booking.service_session
  const startTime = session?.start_time
    ? parseISO(String(session.start_time))
    : null
  const endTime = session?.end_time
    ? parseISO(String(session.end_time))
    : null
  const duration = booking.duration_minutes ?? session?.duration
  const isVirtual = service?.location_type === "virtual"
  const roomUuid = booking.room
  const moduleTitle = session?.title ?? `Module ${moduleNumber}`
  const progressPercent =
    totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0

  return (
    <aside className="lg:sticky lg:top-[58px] flex flex-col">
      {/* Ticket card */}
      <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm overflow-visible relative mb-5">
        {/* Ticket header - KEEP dark */}
        <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-br from-[#1a4040] to-[#2d6a6a] p-5 pb-[18px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(100,200,200,0.15)_0%,transparent_60%)]" />
          <div className="relative z-10">
            <div className="text-[10px] tracking-[0.12em] uppercase text-[#f5f0e8]/35 mb-1.5">
              Module {moduleNumber} of {totalModules}
            </div>
            <div className="font-serif text-xl font-medium text-[#f5f0e8] leading-tight mb-3.5">
              {moduleTitle}
            </div>
            {startTime && (
              <>
                <div className="flex items-center gap-2 text-[13px] text-[#f5f0e8]/60 mb-1">
                  <Calendar className="w-3 h-3 text-teal-300" />
                  <span className="font-medium text-[#f5f0e8]/90">
                    {format(startTime, "EEEE, MMMM d")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#f5f0e8]/60">
                  <Clock className="w-3 h-3 text-teal-300" />
                  {format(startTime, "h:mm a")}
                  {endTime && ` - ${format(endTime, "h:mm a")}`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticket tear */}
        <div className="flex items-center -mx-[1px]">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-50 via-[#faf8f5] to-[#f0ede8]/30 shrink-0 relative z-10" />
          <div className="flex-1 border-t-[1.5px] border-dashed border-[#e0d8ce]/60 mx-1" />
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-50 via-[#faf8f5] to-[#f0ede8]/30 shrink-0 relative z-10" />
        </div>

        {/* Ticket stub */}
        <div className="px-5 py-4">
          {duration && (
            <div className="flex justify-between py-[7px] border-b border-[#e0d8ce]/60 text-[13px]">
              <span className="flex items-center gap-1.5 text-[#9b9088]">
                <Clock className="w-3 h-3 text-teal-600" />
                Duration
              </span>
              <span className="font-medium text-[#2a2218]">
                {duration} min
              </span>
            </div>
          )}
          <div className="flex justify-between py-[7px] border-b border-[#e0d8ce]/60 text-[13px]">
            <span className="flex items-center gap-1.5 text-[#9b9088]">
              <MapPin className="w-3 h-3 text-teal-600" />
              Location
            </span>
            <span className="font-medium text-[#2a2218] text-right text-xs">
              {isVirtual ? "Virtual" : "In-person"}
            </span>
          </div>
          <div className="flex justify-between py-[7px] text-[13px]">
            <span className="flex items-center gap-1.5 text-[#9b9088]">
              <FileText className="w-3 h-3 text-teal-600" />
              Status
            </span>
            <span className="font-medium text-[#2a2218] capitalize text-xs">
              {moduleState}
            </span>
          </div>
        </div>
      </div>

      {/* Course Progress Mini-Tracker */}
      <div className="bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm p-5 mb-5">
        <div className="text-[11px] font-medium uppercase tracking-widest text-[#9b9088] mb-3">
          Course Progress
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#6b6258]">
            {completedCount} of {totalModules} complete
          </span>
          <span className="font-medium text-[#2a2218]">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-[#e0d8ce]/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Module dots */}
        <div className="flex gap-1 mt-3 flex-wrap">
          {Array.from({ length: totalModules }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i + 1 === moduleNumber
                  ? "bg-teal-500 ring-2 ring-teal-500/30"
                  : i < completedCount
                    ? "bg-teal-500/60"
                    : "bg-[#e0d8ce]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mb-5">
        {/* Join Session - live or upcoming+joinable */}
        {canJoin && isVirtual && roomUuid && (
          <Button
            className="w-full h-[50px] rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[15px] font-medium gap-2"
            asChild
          >
            <a href={`/room/${roomUuid}/lobby`}>
              <Video className="w-4 h-4" />
              Join Session
            </a>
          </Button>
        )}

        {/* Back to Course */}
        <Button
          variant="outline"
          className="w-full h-11 rounded-full border-[#e0d8ce] text-[#6b6258] hover:border-teal-300 hover:text-teal-700 text-sm gap-2"
          asChild
        >
          <Link href={`/dashboard/user/journeys/${courseUuid}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Course
          </Link>
        </Button>
      </div>

      {/* Practitioner chip */}
      {practitioner && (
        <div className="flex items-center gap-3 p-4 bg-white border border-[#e0d8ce]/60 rounded-xl shadow-sm mb-5">
          <Avatar className="w-11 h-11">
            {practitioner.profile_image_url ? (
              <AvatarImage
                src={practitioner.profile_image_url}
                alt={practitioner.name ?? "Practitioner"}
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 font-serif text-lg italic">
              {practitioner.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#3d2e1e] truncate">
              {practitioner.name}
            </div>
            <div className="text-xs text-[#9b9088]">Course Instructor</div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full text-xs shrink-0 gap-1.5"
          >
            <MessageSquare className="w-3 h-3" />
            Message
          </Button>
        </div>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function CourseSessionDetailPage({
  params,
}: {
  params: Promise<{ uuid: string; sessionId: string }>
}) {
  const { uuid, sessionId } = React.use(params)

  // Fetch the specific session booking
  const {
    data: booking,
    isLoading: isLoadingBooking,
    error: bookingError,
  } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: sessionId } }),
  })

  // Fetch all bookings to find course siblings
  const serviceId = booking?.service?.id
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
    enabled: !!serviceId,
  })

  // Filter to same-course bookings and sort by sequence
  const courseModules = useMemo(() => {
    if (!allBookingsData?.results || !serviceId) return []
    return (allBookingsData.results as BookingListReadable[])
      .filter((b) => b.service?.id === serviceId && b.status !== "canceled")
      .sort((a, b) => {
        const seqA = a.service_session?.sequence_number ?? 0
        const seqB = b.service_session?.sequence_number ?? 0
        if (seqA !== seqB) return seqA - seqB
        const timeA = a.service_session?.start_time
          ? parseISO(String(a.service_session.start_time)).getTime()
          : 0
        const timeB = b.service_session?.start_time
          ? parseISO(String(b.service_session.start_time)).getTime()
          : 0
        return timeA - timeB
      })
  }, [allBookingsData?.results, serviceId])

  // Derive module position
  const currentIndex = courseModules.findIndex(
    (m) =>
      (m.public_uuid && m.public_uuid === sessionId) ||
      String(m.id) === sessionId
  )
  const moduleNumber = currentIndex >= 0 ? currentIndex + 1 : 1
  const totalModules = courseModules.length || 1
  const prevModule = currentIndex > 0 ? courseModules[currentIndex - 1] : null
  const nextModule =
    currentIndex >= 0 && currentIndex < courseModules.length - 1
      ? courseModules[currentIndex + 1]
      : null
  const completedCount = courseModules.filter(
    (m) =>
      m.service_session?.status === "completed" ||
      (m.service_session?.status === "scheduled" &&
        m.service_session?.start_time &&
        isPast(parseISO(String(m.service_session.start_time))))
  ).length
  const courseName = booking?.service?.name ?? "Course"

  // Derive module state
  const moduleState = useMemo(
    () => (booking ? deriveModuleState(booking) : "upcoming"),
    [booking]
  )
  const joinable = useMemo(
    () => (booking ? isJoinable(booking, moduleState) : false),
    [booking, moduleState]
  )

  // Loading
  if (isLoadingBooking || (serviceId && isLoadingAll)) {
    return <CourseSessionSkeleton />
  }

  // Error
  if (bookingError || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-[#f5f2ed] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#9b9088] mb-4">
            Failed to load module details.
          </div>
          <Button variant="outline" className="rounded-full" asChild>
            <Link href={`/dashboard/user/journeys/${uuid}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-[#f5f2ed]">
      {/* Hero */}
      <HeroSection
        booking={booking}
        moduleState={moduleState}
        moduleNumber={moduleNumber}
        totalModules={totalModules}
        courseName={courseName}
        courseUuid={uuid}
      />

      {/* Body - two column */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 py-10">
        <MainColumn
          booking={booking}
          moduleState={moduleState}
          prevModule={prevModule}
          nextModule={nextModule}
          courseUuid={uuid}
        />
        <Sidebar
          booking={booking}
          moduleState={moduleState}
          joinable={joinable}
          moduleNumber={moduleNumber}
          totalModules={totalModules}
          completedCount={completedCount}
          courseUuid={uuid}
        />
      </div>
    </div>
  )
}
