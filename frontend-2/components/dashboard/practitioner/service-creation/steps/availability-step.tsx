"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServiceForm } from "@/hooks/use-service-form"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Calendar, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"

export default function AvailabilityStep() {
  const { formState, updateFormField } = useServiceForm()
  const { user } = useAuth()
  const [selectedScheduleId, setSelectedScheduleId] = useState(formState?.scheduleId || "")

  // TODO: Replace with actual API call once endpoint is available
  // For now, using mock data
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['practitioner', 'schedules', user?.practitioner_profile?.id],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return {
        results: [
          {
            id: 1,
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
            id: 2,
            name: "Weekend Hours",
            description: "Limited weekend availability",
            is_default: false,
            timezone: "America/New_York",
            time_slots: [
              { day: 6, start_time: "10:00", end_time: "14:00" },
            ]
          }
        ]
      }
    },
    enabled: !!user?.practitioner_profile?.id
  })

  const selectedSchedule = schedules?.results?.find(s => s.id.toString() === selectedScheduleId)

  const handleScheduleChange = (value: string) => {
    setSelectedScheduleId(value)
    updateFormField("scheduleId", value)
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Availability Settings</h2>
        <p className="text-muted-foreground">
          Select which schedule to use for this service. Clients will only be able to book during your available times.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="schedule">Select Availability Schedule</Label>
              <Select value={selectedScheduleId} onValueChange={handleScheduleChange}>
                <SelectTrigger id="schedule" className="mt-1">
                  <SelectValue placeholder="Choose a schedule" />
                </SelectTrigger>
                <SelectContent>
                  {schedules?.results?.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id.toString()}>
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
              <p className="text-sm text-muted-foreground mt-1">
                Your schedules are managed in your availability settings
              </p>
            </div>

            {selectedSchedule && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">{selectedSchedule.name}</h4>
                </div>
                
                {selectedSchedule.description && (
                  <p className="text-sm text-muted-foreground">{selectedSchedule.description}</p>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Weekly Schedule:</p>
                  <div className="space-y-1">
                    {selectedSchedule.time_slots?.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium w-24">{dayNames[slot.day]}:</span>
                        <span>{slot.start_time} - {slot.end_time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Timezone:</span> {selectedSchedule.timezone}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Need to modify your availability?</p>
            <p>You can create and manage your schedules in your{" "}
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
    </div>
  )
}