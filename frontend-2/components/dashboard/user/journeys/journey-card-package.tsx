"use client"

import type { JourneyListItem } from "./use-journeys"
import { Calendar, CalendarClock, ChevronRight, Layers } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

interface JourneyCardPackageProps {
  journey: JourneyListItem
}

export default function JourneyCardPackage({ journey }: JourneyCardPackageProps) {
  const practitioner = journey.practitioner
  const { completed_sessions, total_sessions, needs_scheduling } = journey

  const nextSessionTime = journey.next_session_time
    ? toDate(journey.next_session_time)
    : null

  return (
    <Link
      href={`/dashboard/user/journeys/${journey.journey_id}`}
      className="block group"
    >
      <div className={`flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white border rounded-xl hover:shadow-md transition-all ${
        needs_scheduling > 0 && journey.status === "unscheduled"
          ? "border-amber-200 hover:border-amber-300"
          : "border-sage-200/60 hover:border-sage-300"
      }`}>
        {/* Image */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-sage-50">
          {journey.service_image_url ? (
            <img src={journey.service_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sage-400">
              <Layers className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Title */}
          <h3 className="text-[15px] font-medium text-olive-900 truncate group-hover:text-sage-700 transition-colors">
            {journey.service_name}
          </h3>

          {/* Line 2: Practitioner */}
          {practitioner?.name && (
            <div className="flex items-center gap-1.5 mt-1">
              {practitioner.profile_image_url ? (
                <img src={practitioner.profile_image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-sage-200 flex items-center justify-center">
                  <span className="text-[8px] text-olive-600">{practitioner.name?.charAt(0)}</span>
                </div>
              )}
              <span className="text-[12px] text-olive-500">with {practitioner.name}</span>
            </div>
          )}

          {/* Line 3: Dot progress */}
          <div className="flex items-center gap-2 mt-2 overflow-hidden">
            <div
              className="flex items-center gap-1 flex-wrap"
              aria-label={`${completed_sessions} of ${total_sessions} complete`}
            >
              {Array.from({ length: Math.min(total_sessions, 12) }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block h-2 w-2 rounded-full ${
                    i < completed_sessions ? "bg-sage-500" : "bg-sage-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-olive-500">
              {completed_sessions} of {total_sessions} used
            </span>
          </div>

          {/* Line 4: Next session or scheduling notice */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px]">
            {nextSessionTime && (
              <span className="flex items-center gap-1 text-olive-500">
                <Calendar className="h-3 w-3" />
                Next: {format(nextSessionTime, "EEE MMM d · h:mm a")}
              </span>
            )}
            {needs_scheduling > 0 && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <CalendarClock className="h-3 w-3" />
                {needs_scheduling} need{needs_scheduling === 1 ? "s" : ""} scheduling
              </span>
            )}
          </div>
        </div>

        {/* Right: type badge + status + chevron */}
        <div className="hidden sm:flex flex-col items-end justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sage-50 text-sage-600">
              Package
            </span>
            {journey.status === "completed" ? (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-olive-100 text-olive-600">
                Completed
              </span>
            ) : needs_scheduling > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Schedule
              </span>
            ) : (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                Active
              </span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-olive-300 group-hover:text-sage-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
