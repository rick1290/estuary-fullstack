"use client"

import type { JourneyListItem } from "./use-journeys"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Clock, ChevronRight } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"

interface JourneyCardWorkshopProps {
  journey: JourneyListItem
}

export default function JourneyCardWorkshop({ journey }: JourneyCardWorkshopProps) {
  const practitioner = journey.practitioner
  const nextSessionTime = journey.next_session_time
    ? parseISO(String(journey.next_session_time))
    : null
  const isCompleted = journey.status === "completed"

  return (
    <Card className="border border-sage-200/60 hover:shadow-sm transition-all">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Practitioner avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-terracotta-100 text-terracotta-700">
              {practitioner?.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge
                  variant="outline"
                  className="mb-1.5 text-[10px] uppercase tracking-wider font-medium text-terracotta-600 border-terracotta-200"
                >
                  Workshop
                </Badge>
                <h3 className="font-medium text-olive-900 line-clamp-1">
                  {journey.service_name ?? "Workshop"}
                </h3>
                {practitioner?.name && (
                  <p className="text-sm text-olive-500 mt-0.5">
                    with {practitioner.name}
                  </p>
                )}
              </div>

              {isCompleted && (
                <Badge variant="outline" className="text-olive-500 flex-shrink-0">
                  Completed
                </Badge>
              )}
            </div>

            {/* Details row */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-olive-600">
              {nextSessionTime && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(nextSessionTime, "EEE, MMM d")}
                </span>
              )}
              {nextSessionTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {format(nextSessionTime, "h:mm a")}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/user/journeys/${journey.journey_id}`}>
                  View Details
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
