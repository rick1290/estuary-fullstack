"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Calendar, 
  Clock, 
  Info,
  CalendarDays
} from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"

interface ScheduleSelectionSectionProps {
  service: ServiceReadable
  data: {
    scheduleId?: string
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function ScheduleSelectionSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: ScheduleSelectionSectionProps) {
  const { user } = useAuth()
  const [localData, setLocalData] = useState(data)

  // TODO: Replace with actual API call once endpoint is available
  // For now, using mock data
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['practitioner', 'schedules', user?.practitioner_profile?.id],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return {
        results: [
          {
            id: "1",
            name: "Regular Hours",
            description: "My standard weekly availability",
            is_default: true,
            timezone: "America/New_York",
            time_slots: [
              { day: 1, start_time: "09:00", end_time: "17:00" },
              { day: 2, start_time: "09:00", end_time: "17:00" },
              { day: 3, start_time: "09:00", end_time: "17:00" },
              { day: 4, start_time: "09:00", end_time: "17:00" },
              { day: 5, start_time: "09:00", end_time: "15:00" },
            ]
          },
          {
            id: "2",
            name: "Weekend Hours",
            description: "Limited weekend availability",
            is_default: false,
            timezone: "America/New_York",
            time_slots: [
              { day: 6, start_time: "10:00", end_time: "14:00" },
            ]
          },
          {
            id: "3",
            name: "Evening Sessions",
            description: "Weekday evening appointments",
            is_default: false,
            timezone: "America/New_York",
            time_slots: [
              { day: 1, start_time: "18:00", end_time: "21:00" },
              { day: 2, start_time: "18:00", end_time: "21:00" },
              { day: 3, start_time: "18:00", end_time: "21:00" },
              { day: 4, start_time: "18:00", end_time: "21:00" },
            ]
          }
        ]
      }
    },
    enabled: !!user?.practitioner_profile?.id
  })

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const selectedSchedule = schedules?.results?.find(s => s.id === localData.scheduleId)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="space-y-6">
      {/* Schedule Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="schedule">Availability Schedule</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Select which schedule to use for this service. Clients will only be able to book during these times.
          </p>
        </div>

        <Select 
          value={localData.scheduleId || ""} 
          onValueChange={(value) => handleChange('scheduleId', value)}
        >
          <SelectTrigger id="schedule">
            <SelectValue placeholder="Choose a schedule" />
          </SelectTrigger>
          <SelectContent>
            {schedules?.results?.map((schedule) => (
              <SelectItem key={schedule.id} value={schedule.id}>
                <div className="flex items-center gap-2">
                  <span>{schedule.name}</span>
                  {schedule.is_default && (
                    <span className="text-xs text-muted-foreground">(Default)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Schedule Preview */}
      {selectedSchedule && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {selectedSchedule.name}
                </h4>
                {selectedSchedule.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedSchedule.description}
                  </p>
                )}
              </div>
              <Link 
                href="/dashboard/practitioner/availability" 
                className="text-sm text-primary hover:underline"
              >
                Edit Schedule
              </Link>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Weekly Availability:</p>
                <div className="space-y-1.5">
                  {selectedSchedule.time_slots?.map((slot, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm p-2 bg-muted/50 rounded-md">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium w-24">{dayNames[slot.day]}:</span>
                      <span className="text-muted-foreground">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                  ))}
                  {!selectedSchedule.time_slots?.length && (
                    <p className="text-sm text-muted-foreground italic">
                      No availability set for this schedule
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">Timezone:</span>
                <span className="text-muted-foreground">{selectedSchedule.timezone}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No Schedules Alert */}
      {!schedules?.results?.length && !isLoading && (
        <Alert variant="destructive">
          <AlertDescription>
            You haven't created any availability schedules yet. Please{" "}
            <Link href="/dashboard/practitioner/availability" className="underline">
              create a schedule
            </Link>{" "}
            before setting up services.
          </AlertDescription>
        </Alert>
      )}

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Need to modify your availability?</p>
            <p>
              You can create and manage your schedules in your{" "}
              <Link href="/dashboard/practitioner/availability" className="text-primary hover:underline">
                availability settings
              </Link>.
            </p>
            <ul className="text-sm list-disc list-inside mt-2 space-y-1">
              <li>Create multiple schedules for different services</li>
              <li>Set specific hours for each day of the week</li>
              <li>Block out time for holidays and personal time</li>
              <li>Configure buffer time between appointments</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !localData.scheduleId}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}