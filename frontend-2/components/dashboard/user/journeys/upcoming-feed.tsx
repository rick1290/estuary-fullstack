"use client"

import type { JourneyListItem } from "./use-journeys"
import {
  Calendar,
  Clock,
  ChevronRight,
  CalendarPlus,
  User,
  Users,
  BookOpen,
  Layers,
} from "lucide-react"
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
} from "date-fns"
import Link from "next/link"

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

interface UpcomingFeedProps {
  journeys: JourneyListItem[]
}

interface FeedItem {
  journey: JourneyListItem
  startTime: Date
}

type TimeGroup = "Today" | "Tomorrow" | "This Week" | "Later"

function getTimeGroup(date: Date): TimeGroup {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This Week"
  return "Later"
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof User; iconBg: string; iconColor: string; badgeBg: string; badgeText: string }
> = {
  session: {
    label: "Session",
    icon: User,
    iconBg: "bg-sage-50",
    iconColor: "text-sage-600",
    badgeBg: "bg-sage-50",
    badgeText: "text-sage-600",
  },
  workshop: {
    label: "Workshop",
    icon: Users,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-600",
  },
  course: {
    label: "Course",
    icon: BookOpen,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-600",
  },
  package: {
    label: "Package",
    icon: Layers,
    iconBg: "bg-sage-50",
    iconColor: "text-sage-600",
    badgeBg: "bg-sage-50",
    badgeText: "text-sage-600",
  },
  bundle: {
    label: "Bundle",
    icon: Layers,
    iconBg: "bg-sage-50",
    iconColor: "text-sage-600",
    badgeBg: "bg-sage-50",
    badgeText: "text-sage-600",
  },
}

export default function UpcomingFeed({ journeys }: UpcomingFeedProps) {
  // Build feed items from journeys that have a next_session_time
  const feedItems: FeedItem[] = []

  for (const journey of journeys) {
    if (!journey.next_session_time) continue
    const parsed = toDate(journey.next_session_time)
    feedItems.push({ journey, startTime: parsed })
  }

  // Sort chronologically
  feedItems.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-sage-200/60 rounded-xl">
        <CalendarPlus className="h-10 w-10 text-sage-300 mb-4" />
        <h3 className="text-lg font-medium text-olive-900">
          Nothing coming up
        </h3>
        <p className="text-sm text-olive-400 mt-1.5 max-w-sm text-center">
          You don&apos;t have any upcoming sessions. Browse the marketplace to
          find your next experience.
        </p>
        <Link
          href="/marketplace"
          className="mt-5 inline-flex items-center px-5 py-2 rounded-full bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 transition-colors"
        >
          Explore Services
        </Link>
      </div>
    )
  }

  // Group by time period
  const grouped = new Map<TimeGroup, FeedItem[]>()
  for (const item of feedItems) {
    const group = getTimeGroup(item.startTime)
    if (!grouped.has(group)) {
      grouped.set(group, [])
    }
    grouped.get(group)!.push(item)
  }

  const groupOrder: TimeGroup[] = ["Today", "Tomorrow", "This Week", "Later"]

  return (
    <div className="space-y-8">
      {groupOrder.map((groupName) => {
        const items = grouped.get(groupName)
        if (!items || items.length === 0) return null

        return (
          <div key={groupName}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-olive-400 mb-3 pl-1">
              {groupName}
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <FeedItemCard
                  key={item.journey.journey_id}
                  item={item}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual feed item card
// ---------------------------------------------------------------------------

function FeedItemCard({ item }: { item: FeedItem }) {
  const { journey, startTime } = item
  const config = TYPE_CONFIG[journey.journey_type] || TYPE_CONFIG.session
  const TypeIcon = config.icon
  const isCourseOrPackage =
    journey.journey_type === "course" || journey.journey_type === "package"

  return (
    <Link
      href={`/dashboard/user/journeys/${journey.journey_id}`}
      className="block group"
    >
      <div className="flex gap-4 p-4 bg-white border border-sage-200/60 rounded-xl hover:border-sage-300 hover:shadow-md transition-all">
        {/* Image */}
        <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 ${config.iconBg}`}>
          {journey.service_image_url ? (
            <img
              src={journey.service_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${config.iconColor}`}>
              <TypeIcon className="h-6 w-6" />
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
          {journey.practitioner?.name && (
            <div className="flex items-center gap-1.5 mt-1">
              {journey.practitioner.profile_image_url ? (
                <img
                  src={journey.practitioner.profile_image_url}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-sage-200 flex items-center justify-center">
                  <span className="text-[8px] text-olive-600">{journey.practitioner.name?.charAt(0)}</span>
                </div>
              )}
              <span className="text-[12px] text-olive-400">with {journey.practitioner.name}</span>
            </div>
          )}

          {/* Line 3: Date + meta */}
          <div className="flex items-center gap-2 mt-2 text-[12px] text-olive-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(startTime, "EEE, MMM d")}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(startTime, "h:mm a")}
            </span>
            {isCourseOrPackage && (
              <>
                <span>·</span>
                <span className="text-olive-400">
                  {journey.next_session_title && (
                    <>{journey.next_session_title} · </>
                  )}
                  {journey.completed_sessions + 1}/{journey.total_sessions}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: type badge + chevron */}
        <div className="flex flex-col items-end justify-between shrink-0">
          <span className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}>
            {config.label}
          </span>
          <ChevronRight className="h-4 w-4 text-olive-300 group-hover:text-sage-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
