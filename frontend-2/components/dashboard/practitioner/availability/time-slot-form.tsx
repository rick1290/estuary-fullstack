"use client"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { type TimeSlot, DAYS_OF_WEEK, TIME_OPTIONS } from "@/types/availability"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"

interface TimeSlotFormProps {
  day: number
  onAdd: (timeSlot: TimeSlot) => void
  onRemove: (slotId: string) => void
  slots: TimeSlot[]
}

export function TimeSlotForm({ day, onAdd, onRemove, slots }: TimeSlotFormProps) {
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")

  const handleAddTimeSlot = () => {
    const newTimeSlot: TimeSlot = {
      id: `slot-${uuidv4()}`,
      day,
      day_name: DAYS_OF_WEEK[day],
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      is_active: true,
    }

    onAdd(newTimeSlot)
    // Reset form
    setStartTime("09:00")
    setEndTime("17:00")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center gap-2">
            <Select value={slot.start_time.substring(0, 5)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={`start-${time}`} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span>-</span>

            <Select value={slot.end_time.substring(0, 5)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={`end-${time}`} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={() => onRemove(slot.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Select value={startTime} onValueChange={setStartTime}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((time) => (
              <SelectItem key={`new-start-${time}`} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span>-</span>

        <Select value={endTime} onValueChange={setEndTime}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((time) => (
              <SelectItem key={`new-end-${time}`} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleAddTimeSlot}>Add</Button>
      </div>
    </div>
  )
}
