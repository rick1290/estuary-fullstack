"use client"

import { type TimeSlot, DAYS_OF_WEEK, formatTime } from "@/types/availability"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface WeeklyScheduleGridProps {
  timeSlots: TimeSlot[]
  readOnly?: boolean
  onSlotClick?: (slot: TimeSlot) => void
}

export function WeeklyScheduleGrid({ timeSlots, readOnly = false, onSlotClick }: WeeklyScheduleGridProps) {
  // Group time slots by day
  const timeSlotsByDay = DAYS_OF_WEEK.map((day, index) => {
    return timeSlots.filter((slot) => slot.day === index)
  })

  return (
    <div className="mb-6">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="text-center text-sm font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {timeSlotsByDay.map((daySlots, dayIndex) => (
          <div key={dayIndex} className="min-h-[200px] border rounded-md p-2 bg-muted/20">
            {daySlots.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No time slots</div>
            ) : (
              <div className="space-y-2">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => !readOnly && onSlotClick?.(slot)}
                    className={`
                      p-2 rounded-md border text-sm
                      ${slot.is_active ? "bg-primary/10 border-primary/20" : "bg-muted border-muted-foreground/20 line-through"}
                      ${!readOnly ? "cursor-pointer hover:bg-primary/20" : ""}
                    `}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {calculateDuration(slot.start_time, slot.end_time)}
                      </span>

                      {!slot.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function to calculate duration between two times
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(`1970-01-01T${startTime}`)
  const end = new Date(`1970-01-01T${endTime}`)

  const diffMs = end.getTime() - start.getTime()
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHrs === 0) {
    return `${diffMins} min`
  } else if (diffMins === 0) {
    return `${diffHrs} hr`
  } else {
    return `${diffHrs} hr ${diffMins} min`
  }
}
