"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Info } from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { schedulesListOptions } from "@/src/client/@tanstack/react-query.gen"

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

  // Fetch practitioner's schedules
  const { data: schedules, isLoading } = useQuery(
    schedulesListOptions({
      query: {
        practitioner: user?.practitioner_profile?.id
      }
    })
  )

  useEffect(() => {
    setLocalData(data)
    // Set default schedule if none selected and schedules are loaded
    if (!data.scheduleId && schedules?.data?.results?.length) {
      const defaultSchedule = schedules.data.results.find(s => s.is_default) || schedules.data.results[0]
      if (defaultSchedule) {
        handleChange('scheduleId', String(defaultSchedule.id))
      }
    }
  }, [data, schedules])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  return (
    <div className="space-y-6">
      {/* Schedule Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="schedule">Availability Schedule</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Select which schedule to use for this service
          </p>
        </div>

        <Select 
          value={localData.scheduleId || ""} 
          onValueChange={(value) => handleChange('scheduleId', value)}
          disabled={isLoading || !schedules?.data?.results?.length}
        >
          <SelectTrigger id="schedule" className="max-w-md">
            <SelectValue placeholder={isLoading ? "Loading schedules..." : "Choose a schedule"} />
          </SelectTrigger>
          <SelectContent>
            {schedules?.data?.results?.map((schedule) => (
              <SelectItem key={schedule.id} value={String(schedule.id)}>
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

        <p className="text-sm text-muted-foreground">
          Manage your schedules in{" "}
          <Link href="/dashboard/practitioner/availability" className="text-primary hover:underline">
            availability settings
          </Link>
        </p>
      </div>

      {/* No Schedules Alert */}
      {!schedules?.data?.results?.length && !isLoading && (
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