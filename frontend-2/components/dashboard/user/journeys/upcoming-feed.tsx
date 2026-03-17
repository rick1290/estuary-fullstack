"use client"

import type { JourneyListItem } from "./use-journeys"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  ChevronRight,
  CalendarPlus,
} from "lucide-react"
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isThisWeek,
} from "date-fns"
import Link from "next/link"

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

export default function UpcomingFeed({ journeys }: UpcomingFeedProps) {
  // Build feed items from journeys that have a next_session_time
  const feedItems: FeedItem[] = []

  for (const journey of journeys) {
    if (!journey.next_session_time) continue
    const parsed = parseISO(String(journey.next_session_time))

    feedItems.push({
      journey,
      startTime: parsed,
    })
  }

  // Sort chronologically
  feedItems.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  if (feedItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarPlus className="h-12 w-12 text-sage-300 mb-3" />
          <h3 className="text-lg font-medium text-olive-900">Nothing coming up</h3>
          <p className="text-sm text-olive-500 mt-1 max-w-sm text-center">
            You don&apos;t have any upcoming sessions. Browse the marketplace to find your next experience.
          </p>
          <Button asChild className="mt-4">
            <Link href="/marketplace">Explore Services</Link>
          </Button>
        </CardContent>
      </Card>
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
    <div className="space-y-6">
      {groupOrder.map((groupName) => {
        const items = grouped.get(groupName)
        if (!items || items.length === 0) return null

        return (
          <div key={groupName}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-olive-400 mb-3">
              {groupName}
            </h3>
            <div className="space-y-3">
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
  const isCourseOrPackage = journey.journey_type === "course" || journey.journey_type === "package"

  // Badge color by type
  const typeBadgeClass = {
    course: "text-sage-600 border-sage-300",
    package: "text-olive-600 border-olive-300",
    workshop: "text-terracotta-600 border-terracotta-200",
    session: "text-olive-500 border-sage-200",
    bundle: "text-olive-600 border-olive-300",
  }[journey.journey_type] ?? "text-olive-500 border-sage-200"

  return (
    <Card className="border border-sage-200/60 hover:shadow-sm transition-all">
      <CardContent className="p-4">
        {/* Time header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-olive-700">
            {format(startTime, "EEEE, h:mm a")}
          </span>
        </div>

        {/* Title + context */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-olive-900 line-clamp-1">
                {journey.service_name ?? "Session"}
              </h4>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase tracking-wider font-medium ${typeBadgeClass}`}
              >
                {journey.journey_type}
              </Badge>
            </div>

            {journey.practitioner?.name && (
              <p className="text-sm text-olive-500 mt-0.5">
                with {journey.practitioner.name}
              </p>
            )}

            {/* Course/package progress context */}
            {isCourseOrPackage && (
              <p className="text-xs text-olive-400 mt-1">
                {journey.next_session_title && (
                  <span>&ldquo;{journey.next_session_title}&rdquo; &middot; </span>
                )}
                Session {journey.completed_sessions + 1} of {journey.total_sessions}
              </p>
            )}
          </div>

          {/* Action */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/user/journeys/${journey.journey_id}`}>
                Details
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
