"use client"

import type { JourneyListItem } from "./use-journeys"
import { Calendar, CalendarClock, ChevronRight, User, FileText } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

interface JourneyCardSessionProps {
  journey: JourneyListItem
}

export default function JourneyCardSession({ journey }: JourneyCardSessionProps) {
  const practitioner = journey.practitioner
  const nextSessionTime = journey.next_session_time
    ? toDate(journey.next_session_time)
    : null
  const isCompleted = journey.status === "completed"
  const isUnscheduled = journey.status === "unscheduled"
  const isUpcoming = nextSessionTime && nextSessionTime > new Date()
  const isJoinable = isUpcoming && nextSessionTime && (nextSessionTime.getTime() - Date.now()) <= 15 * 60 * 1000

  return (
    <Link
      href={`/dashboard/user/journeys/${journey.journey_id}`}
      className="block group"
    >
      <div className={`flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white border rounded-xl hover:shadow-md transition-all ${
        isUnscheduled
          ? "border-amber-200 hover:border-amber-300"
          : "border-sage-200/60 hover:border-sage-300"
      }`}>
        {/* Image */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-sage-50">
          {journey.service_image_url ? (
            <img src={journey.service_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sage-400">
              <User className="h-6 w-6" />
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

          {/* Line 3: Date + meta OR scheduling prompt */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[12px]">
            {isUnscheduled ? (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <CalendarClock className="h-3 w-3" />
                Pick a date &amp; time to get started
              </span>
            ) : (
              <span className="flex items-center gap-2 text-olive-500">
                {nextSessionTime && (
                  <>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(nextSessionTime, "EEE, MMM d")}
                    </span>
                    <span>·</span>
                    <span>{format(nextSessionTime, "h:mm a")}</span>
                  </>
                )}
                {journey.service_duration_minutes && (
                  <>
                    <span>·</span>
                    <span>{journey.service_duration_minutes} min</span>
                  </>
                )}
                {journey.service_location_type && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{journey.service_location_type}</span>
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: action indicator + type badge + status */}
        <div className="flex flex-col items-end justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sage-50 text-sage-600">
              Session
            </span>
            {(journey as any).has_pending_intake_forms && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                <FileText className="h-3 w-3" />
                Form
              </span>
            )}
            {isUnscheduled ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Schedule
              </span>
            ) : isCompleted ? (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-olive-100 text-olive-600">
                Completed
              </span>
            ) : isUpcoming ? (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                Upcoming
              </span>
            ) : null}
          </div>
          <span className={`text-[12px] font-medium flex items-center gap-1 ${
            isJoinable ? "text-sage-700" : "text-olive-400 group-hover:text-olive-600"
          } transition-colors`}>
            {isJoinable ? "Join" : "View"} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Mobile form badge */}
        {(journey as any).has_pending_intake_forms && (
          <div className="flex sm:hidden items-center gap-1 mt-1 ml-[60px]">
            <FileText className="h-3 w-3 text-amber-600" />
            <span className="text-[11px] font-medium text-amber-700">Form required</span>
          </div>
        )}
      </div>
    </Link>
  )
}
