"use client"

import type { JourneyListItem } from "./use-journeys"
import { Calendar, ChevronRight, BookOpen , FileText } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

interface JourneyCardCourseProps {
  journey: JourneyListItem
}

export default function JourneyCardCourse({ journey }: JourneyCardCourseProps) {
  const practitioner = journey.practitioner
  const { completed_sessions, total_sessions, progress_percentage } = journey

  const nextSessionTime = journey.next_session_time
    ? toDate(journey.next_session_time)
    : null
  const nextTitle = journey.next_session_title
  const isUpcoming = nextSessionTime && nextSessionTime > new Date()
  const isJoinable = isUpcoming && nextSessionTime && (nextSessionTime.getTime() - Date.now()) <= 15 * 60 * 1000

  return (
    <Link
      href={`/dashboard/user/journeys/${journey.journey_id}`}
      className="block group"
    >
      <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-sage-200/60 rounded-xl hover:border-teal-300 hover:shadow-md transition-all">
        {/* Image */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-teal-50">
          {journey.service_image_url ? (
            <img src={journey.service_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-teal-400">
              <BookOpen className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Title */}
          <h3 className="text-[15px] font-medium text-olive-900 truncate group-hover:text-teal-700 transition-colors">
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

          {/* Line 3: Date + meta */}
          {nextSessionTime && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[12px] text-olive-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(nextSessionTime, "EEE, MMM d")}
              </span>
              <span>·</span>
              <span>{format(nextSessionTime, "h:mm a")}</span>
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
            </div>
          )}

          {/* Line 4: Progress bar + next module */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-sage-100 rounded-full overflow-hidden max-w-[140px]">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${progress_percentage || 0}%` }}
              />
            </div>
            <span className="text-[11px] text-olive-500">
              {completed_sessions} of {total_sessions}
            </span>
          </div>

          {nextTitle && nextSessionTime && (
            <div className="flex items-center gap-1.5 mt-1 text-[12px] text-olive-500">
              <span>
                Next: {nextTitle} · {format(nextSessionTime, "EEE MMM d")}
              </span>
            </div>
          )}
        </div>

        {/* Right: action indicator + type badge + status */}
        <div className="flex flex-col items-end justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
              Course
            </span>
            {journey.status === "completed" ? (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-olive-100 text-olive-600">
                Completed
              </span>
            ) : (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                In Progress
              </span>
            )}
          </div>
          <span className={`text-[12px] font-medium flex items-center gap-1 ${
            isJoinable ? "text-teal-700" : "text-olive-400 group-hover:text-olive-600"
          } transition-colors`}>
            {isJoinable ? "Join" : "View"} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
