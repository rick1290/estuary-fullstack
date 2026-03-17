"use client"

import { useQuery } from "@tanstack/react-query"
import { journeysListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { JourneyListItem } from "@/src/client/types.gen"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Video, User, Users, BookOpen, Layers } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { format } from "date-fns"

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof User; color: string; badge: string }> = {
  session: { label: "Session", icon: User, color: "text-sage-600", badge: "bg-sage-100 text-sage-700" },
  workshop: { label: "Workshop", icon: Users, color: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  course: { label: "Course", icon: BookOpen, color: "text-teal-600", badge: "bg-teal-100 text-teal-700" },
  package: { label: "Package", icon: Layers, color: "text-sage-600", badge: "bg-sage-100 text-sage-700" },
  bundle: { label: "Bundle", icon: Layers, color: "text-sage-600", badge: "bg-sage-100 text-sage-700" },
}

export default function UserUpcomingBookings() {
  const { data, isLoading, error } = useQuery({
    ...journeysListOptions(),
  })

  // Extract journeys from nested response
  const allJourneys: JourneyListItem[] = (data as any)?.results || []

  // Filter to upcoming/active only, sort by next session time
  const upcoming = allJourneys
    .filter((j) => j.status === "upcoming" || j.status === "active")
    .filter((j) => j.next_session_time)
    .sort((a, b) => {
      const aTime = a.next_session_time ? toDate(a.next_session_time).getTime() : Infinity
      const bTime = b.next_session_time ? toDate(b.next_session_time).getTime() : Infinity
      return aTime - bTime
    })
    .slice(0, 4)

  const totalUpcoming = allJourneys.filter((j) => j.status === "upcoming" || j.status === "active").length
  const hasMore = totalUpcoming > 4

  if (isLoading) {
    return (
      <div>
        <h2 className="font-serif text-2xl font-light text-olive-900 mb-6">Upcoming</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-sage-200/60">
              <CardContent className="p-5">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="font-serif text-2xl font-light text-olive-900 mb-6">Upcoming</h2>
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-800">Failed to load upcoming sessions. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-light text-olive-900">Upcoming</h2>
        {allJourneys.length > 0 && (
          <Link
            href="/dashboard/user/journeys"
            className="text-sm text-sage-600 hover:text-sage-700 transition-colors"
          >
            View All
          </Link>
        )}
      </div>

      {upcoming.length === 0 ? (
        <Card className="border border-sage-200/60 bg-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-sage-300 mb-4" />
            <p className="text-olive-600 mb-4">No upcoming sessions</p>
            <Button asChild className="bg-sage-600 hover:bg-sage-700 text-white rounded-full">
              <Link href="/marketplace">Explore Services</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map((journey) => {
            const config = TYPE_CONFIG[journey.journey_type] || TYPE_CONFIG.session
            const TypeIcon = config.icon
            const nextTime = journey.next_session_time ? toDate(journey.next_session_time) : null

            return (
              <Link
                key={journey.journey_id}
                href={`/dashboard/user/journeys/${journey.journey_id}`}
                className="block"
              >
                <Card className="border border-sage-200/60 bg-white hover:border-sage-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex gap-4 items-center">
                      {/* Type icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-cream-50 ${config.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-medium text-olive-900 truncate">
                            {journey.service_name}
                          </h3>
                          <Badge className={`${config.badge} text-[10px] px-2 py-0 rounded-full shrink-0`}>
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[13px] text-olive-500">
                          {journey.practitioner?.name && (
                            <span>with {journey.practitioner.name}</span>
                          )}
                          {nextTime && (
                            <>
                              <span className="text-olive-300">·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(nextTime, "MMM d")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(nextTime, "h:mm a")}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Progress for courses/packages */}
                        {(journey.journey_type === "course" || journey.journey_type === "package") && journey.total_sessions > 1 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-sage-100 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-sage-500 rounded-full transition-all"
                                style={{ width: `${journey.progress_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-olive-400">
                              {journey.completed_sessions}/{journey.total_sessions}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Next session info */}
                      {journey.next_session_title && (
                        <div className="hidden md:block text-right shrink-0 max-w-[160px]">
                          <p className="text-[12px] text-olive-400 truncate">
                            Next: {journey.next_session_title}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {hasMore && (
            <div className="text-center mt-2">
              <Button variant="link" asChild className="text-sage-600 text-sm">
                <Link href="/dashboard/user/journeys">
                  View all journeys →
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
