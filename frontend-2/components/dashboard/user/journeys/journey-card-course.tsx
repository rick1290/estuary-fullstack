"use client"

import type { JourneyListItem } from "./use-journeys"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, ChevronRight } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"

interface JourneyCardCourseProps {
  journey: JourneyListItem
}

export default function JourneyCardCourse({ journey }: JourneyCardCourseProps) {
  const practitioner = journey.practitioner
  const { completed_sessions, total_sessions, progress_percentage } = journey

  const nextSessionTime = journey.next_session_time
    ? parseISO(String(journey.next_session_time))
    : null
  const nextTitle = journey.next_session_title

  return (
    <Card className="border border-sage-200/60 hover:shadow-sm transition-all">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Practitioner avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-sage-100 text-sage-700">
              {practitioner?.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge
                  variant="outline"
                  className="mb-1.5 text-[10px] uppercase tracking-wider font-medium text-sage-600 border-sage-300"
                >
                  Course
                </Badge>
                <h3 className="font-medium text-olive-900 line-clamp-1">
                  {journey.service_name ?? "Course"}
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

            {/* Progress bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-olive-500">
                <span>
                  {completed_sessions} of {total_sessions} complete
                </span>
                <span>{progress_percentage}%</span>
              </div>
              <Progress
                value={progress_percentage}
                className="h-2 bg-sage-100"
              />
            </div>

            {/* Next session info */}
            {nextSessionTime && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-olive-600">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Next: {format(nextSessionTime, "EEE MMM d")}
                  {nextTitle && (
                    <span className="text-olive-400"> &middot; &ldquo;{nextTitle}&rdquo;</span>
                  )}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/user/journeys/${journey.journey_id}`}>
                  View Journey
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
