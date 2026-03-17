"use client"

import type { JourneyListItem } from "./use-journeys"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, CalendarPlus, ChevronRight } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"

interface JourneyCardPackageProps {
  journey: JourneyListItem
}

export default function JourneyCardPackage({ journey }: JourneyCardPackageProps) {
  const practitioner = journey.practitioner
  const { completed_sessions, total_sessions, needs_scheduling } = journey

  const nextSessionTime = journey.next_session_time
    ? parseISO(String(journey.next_session_time))
    : null

  return (
    <Card className="border border-sage-200/60 hover:shadow-sm transition-all">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Practitioner avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-cream-200 text-olive-700">
              {practitioner?.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge
                  variant="outline"
                  className="mb-1.5 text-[10px] uppercase tracking-wider font-medium text-olive-600 border-olive-300"
                >
                  Package
                </Badge>
                <h3 className="font-medium text-olive-900 line-clamp-1">
                  {journey.service_name ?? "Package"}
                </h3>
                {practitioner?.name && (
                  <p className="text-sm text-olive-500 mt-0.5">
                    with {practitioner.name}
                  </p>
                )}
              </div>

              {journey.status === "completed" && (
                <Badge variant="outline" className="text-olive-500 flex-shrink-0">
                  Completed
                </Badge>
              )}
            </div>

            {/* Dot progress indicator */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1" aria-label={`${completed_sessions} of ${total_sessions} complete`}>
                {Array.from({ length: total_sessions }).map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      i < completed_sessions
                        ? "bg-sage-500"
                        : "bg-sage-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-olive-500">
                {completed_sessions} of {total_sessions} complete
              </span>
            </div>

            {/* Next scheduled session */}
            {nextSessionTime && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-olive-600">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Next: {format(nextSessionTime, "EEE MMM d · h:mm a")}
                </span>
              </div>
            )}

            {/* Needs scheduling notice */}
            {needs_scheduling > 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                {needs_scheduling} session{needs_scheduling !== 1 ? "s" : ""} need
                {needs_scheduling === 1 ? "s" : ""} scheduling
              </p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/user/journeys/${journey.journey_id}`}>
                  View Journey
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
              {needs_scheduling > 0 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/user/journeys/${journey.journey_id}`}>
                    <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                    Schedule Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
