"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { type Schedule, type TimeSlot, DAYS_OF_WEEK, TIMEZONE_OPTIONS } from "@/types/availability"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Plus, Trash2, AlertCircle } from "lucide-react"

interface ScheduleFormProps {
  schedule: Schedule | null
  isCreating: boolean
  onSave: (schedule: Schedule) => void
  onCancel: () => void
}

export function ScheduleForm({ schedule, isCreating, onSave, onCancel }: ScheduleFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [timezone, setTimezone] = useState("America/New_York")
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeDays, setActiveDays] = useState<Record<number, boolean>>({
    0: false, // Monday
    1: false, // Tuesday
    2: false, // Wednesday
    3: false, // Thursday
    4: false, // Friday
    5: false, // Saturday
    6: false, // Sunday
  })

  // Initialize form with schedule data if editing
  useEffect(() => {
    if (schedule) {
      setName(schedule.name)
      setDescription(schedule.description || "")
      setTimezone(schedule.timezone)
      setIsDefault(schedule.is_default)
      setIsActive(schedule.is_active)
      setTimeSlots(schedule.time_slots)

      // Set active days based on time slots
      const newActiveDays = { ...activeDays }
      schedule.time_slots.forEach((slot) => {
        if (slot.is_active) {
          newActiveDays[slot.day] = true
        }
      })
      setActiveDays(newActiveDays)
    } else {
      // Default values for new schedule
      setName("")
      setDescription("")
      setTimezone("America/New_York")
      setIsDefault(false)
      setIsActive(true)
      setTimeSlots([])
      setActiveDays({
        0: true, // Monday
        1: true, // Tuesday
        2: true, // Wednesday
        3: true, // Thursday
        4: true, // Friday
        5: false, // Saturday
        6: false, // Sunday
      })
    }
  }, [schedule])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Schedule name is required"
    }

    if (!timezone) {
      newErrors.timezone = "Timezone is required"
    }

    // Check if at least one day is active
    const hasActiveDay = Object.values(activeDays).some((isActive) => isActive)
    if (!hasActiveDay) {
      newErrors.days = "At least one day must be active"
    }

    // Check if active days have time slots
    const activeDaysList = Object.entries(activeDays)
      .filter(([_, isActive]) => isActive)
      .map(([day]) => Number(day))

    const hasTimeSlotsForActiveDays = activeDaysList.every((day) =>
      timeSlots.some((slot) => slot.day === day && slot.is_active),
    )

    if (!hasTimeSlotsForActiveDays && hasActiveDay) {
      newErrors.timeSlots = "Each active day must have at least one active time slot"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return

    const updatedSchedule: Schedule = {
      id: schedule?.id || `temp-${uuidv4()}`,
      name,
      description: description || undefined,
      timezone,
      is_default: isDefault,
      is_active: isActive,
      time_slots: timeSlots,
    }

    onSave(updatedSchedule)
  }

  const toggleDay = (day: number) => {
    const newActiveDays = { ...activeDays, [day]: !activeDays[day] }
    setActiveDays(newActiveDays)

    // If turning off a day, mark all its time slots as inactive
    if (!newActiveDays[day]) {
      setTimeSlots(timeSlots.map((slot) => (slot.day === day ? { ...slot, is_active: false } : slot)))
    } else {
      // If turning on a day and it has no time slots, add a default one
      const hasSlotsForDay = timeSlots.some((slot) => slot.day === day)
      if (!hasSlotsForDay) {
        addTimeSlot(day)
      } else {
        // If turning on a day and it has inactive slots, activate them
        setTimeSlots(timeSlots.map((slot) => (slot.day === day ? { ...slot, is_active: true } : slot)))
      }
    }
  }

  const addTimeSlot = (day: number) => {
    const newSlot: TimeSlot = {
      id: `slot-${uuidv4()}`,
      day,
      day_name: DAYS_OF_WEEK[day],
      start_time: "09:00:00",
      end_time: "17:00:00",
      is_active: true,
    }
    setTimeSlots([...timeSlots, newSlot])
  }

  const updateTimeSlot = (slotId: string, field: "start_time" | "end_time", value: string) => {
    setTimeSlots(timeSlots.map((slot) => (slot.id === slotId ? { ...slot, [field]: `${value}:00` } : slot)))
  }

  const removeTimeSlot = (slotId: string) => {
    setTimeSlots(timeSlots.filter((slot) => slot.id !== slotId))
  }

  const copyTimeSlots = (fromDay: number, toDay: number) => {
    // Get slots from source day
    const sourceDaySlots = timeSlots.filter((slot) => slot.day === fromDay)
    if (sourceDaySlots.length === 0) return

    // Remove existing slots for target day
    const remainingSlots = timeSlots.filter((slot) => slot.day !== toDay)

    // Create new slots for target day
    const newSlots = sourceDaySlots.map((slot) => ({
      ...slot,
      id: `slot-${uuidv4()}`,
      day: toDay,
      day_name: DAYS_OF_WEEK[toDay],
    }))

    setTimeSlots([...remainingSlots, ...newSlots])
  }

  const getTimeSlotsForDay = (day: number) => {
    return timeSlots.filter((slot) => slot.day === day && slot.is_active)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isCreating ? "Create New Schedule" : "Edit Schedule"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekday Schedule"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className={errors.timezone ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && <p className="text-sm text-destructive">{errors.timezone}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this schedule (e.g., Regular weekday hours)"
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="is-default" checked={isDefault} onCheckedChange={setIsDefault} />
              <Label htmlFor="is-default">Set as default schedule</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is-active">Schedule is active</Label>
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Weekly Hours</h3>

          {errors.days && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.days}</AlertDescription>
            </Alert>
          )}

          {errors.timeSlots && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.timeSlots}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={day} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Switch checked={activeDays[index]} onCheckedChange={() => toggleDay(index)} className="mr-2" />
                    <span className="font-medium">{day}</span>
                  </div>

                  {activeDays[index] && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => addTimeSlot(index)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Time Slot
                      </Button>

                      {index > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            copyTimeSlots(index - 1, index)
                            setActiveDays({ ...activeDays, [index]: true })
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Previous Day
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {activeDays[index] && (
                  <div className="space-y-3">
                    {getTimeSlotsForDay(index).length > 0 ? (
                      getTimeSlotsForDay(index).map((slot) => (
                        <div key={slot.id} className="flex items-center gap-2">
                          <Select
                            value={slot.start_time.substring(0, 5)}
                            onValueChange={(value) => updateTimeSlot(slot.id, "start_time", value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, hour) =>
                                [0, 30].map((minute) => {
                                  const timeValue = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                                  return (
                                    <SelectItem key={`${hour}-${minute}`} value={timeValue}>
                                      {timeValue}
                                    </SelectItem>
                                  )
                                }),
                              )}
                            </SelectContent>
                          </Select>

                          <span>-</span>

                          <Select
                            value={slot.end_time.substring(0, 5)}
                            onValueChange={(value) => updateTimeSlot(slot.id, "end_time", value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, hour) =>
                                [0, 30].map((minute) => {
                                  const timeValue = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                                  return (
                                    <SelectItem key={`${hour}-${minute}`} value={timeValue}>
                                      {timeValue}
                                    </SelectItem>
                                  )
                                }),
                              )}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTimeSlot(slot.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No time slots added yet.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>{isCreating ? "Create Schedule" : "Save Changes"}</Button>
      </CardFooter>
    </Card>
  )
}
