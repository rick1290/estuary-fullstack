"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ScheduleReadable, ScheduleWritable, ScheduleTimeSlotWritable } from "@/src/client/types.gen"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  schedulesAddTimeSlotCreateMutation,
  schedulesRemoveTimeSlotDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"

interface ScheduleFormProps {
  schedule: ScheduleReadable | null
  isCreating: boolean
  onSave: (schedule: Partial<ScheduleWritable>, timeSlots?: ScheduleTimeSlotWritable[]) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
]

const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
]

// Generate time options (15-minute intervals)
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
})

// Format time to 12-hour format
const formatTime12Hour = (time24: string) => {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function ScheduleForm({ schedule, isCreating, onSave, onCancel, isLoading }: ScheduleFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [timezone, setTimezone] = useState("America/New_York")
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [timeSlots, setTimeSlots] = useState<ScheduleTimeSlotWritable[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Track active days for UI
  const [activeDays, setActiveDays] = useState<Record<number, boolean>>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false,
  })

  // Mutations for time slots (only used when editing existing schedule)
  const addTimeSlotMutation = useMutation({
    ...schedulesAddTimeSlotCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  const removeTimeSlotMutation = useMutation({
    ...schedulesRemoveTimeSlotDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  // Initialize form with schedule data if editing
  useEffect(() => {
    if (schedule) {
      setName(schedule.name)
      setDescription(schedule.description || "")
      setTimezone(schedule.timezone)
      setIsDefault(schedule.is_default)
      setIsActive(schedule.is_active)
      
      // Convert readonly time slots to writable format
      const writableSlots: ScheduleTimeSlotWritable[] = (schedule.time_slots || []).map(slot => ({
        day: slot.day,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active
      }))
      setTimeSlots(writableSlots)

      // Update active days
      const days = (schedule.time_slots || []).reduce((acc, slot) => {
        acc[slot.day] = true
        return acc
      }, {} as Record<number, boolean>)
      setActiveDays({ ...activeDays, ...days })
    }
  }, [schedule])

  const handleDayToggle = (day: number) => {
    const newActiveDays = { ...activeDays, [day]: !activeDays[day] }
    setActiveDays(newActiveDays)

    if (newActiveDays[day]) {
      // Add default time slot for this day
      const newSlot: ScheduleTimeSlotWritable = {
        day,
        start_time: "09:00:00",
        end_time: "17:00:00",
        is_active: true,
      }
      setTimeSlots([...timeSlots, newSlot])
    } else {
      // Remove all time slots for this day
      setTimeSlots(timeSlots.filter((slot) => slot.day !== day))
    }
  }

  const handleAddTimeSlot = (day: number) => {
    const newSlot: ScheduleTimeSlotWritable = {
      day,
      start_time: "09:00:00",
      end_time: "17:00:00",
      is_active: true,
    }
    setTimeSlots([...timeSlots, newSlot])
  }

  const handleRemoveTimeSlot = (index: number) => {
    const updatedSlots = timeSlots.filter((_, i) => i !== index)
    setTimeSlots(updatedSlots)

    // Check if we need to update active days
    const slot = timeSlots[index]
    const hasOtherSlotsForDay = updatedSlots.some((s) => s.day === slot.day)
    if (!hasOtherSlotsForDay) {
      setActiveDays({ ...activeDays, [slot.day]: false })
    }
  }

  const handleTimeSlotChange = (index: number, field: keyof ScheduleTimeSlotWritable, value: any) => {
    const updatedSlots = [...timeSlots]
    updatedSlots[index] = { ...updatedSlots[index], [field]: value }
    setTimeSlots(updatedSlots)
  }

  const handleCopyToAllDays = () => {
    const firstDaySlots = timeSlots.filter((slot) => slot.day === Math.min(...timeSlots.map((s) => s.day)))
    
    if (firstDaySlots.length === 0) {
      toast({
        title: "No time slots to copy",
        description: "Please add at least one time slot first.",
        variant: "destructive",
      })
      return
    }

    const newSlots: ScheduleTimeSlotWritable[] = []
    DAYS_OF_WEEK.forEach((day) => {
      firstDaySlots.forEach((slot) => {
        newSlots.push({
          ...slot,
          day: day.value,
        })
      })
    })

    setTimeSlots(newSlots)
    setActiveDays(DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day.value]: true }), {}))
    
    toast({
      title: "Schedule copied",
      description: "Time slots have been copied to all days.",
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Schedule name is required"
    }

    if (timeSlots.length === 0) {
      newErrors.timeSlots = "At least one time slot is required"
    }

    // Validate time slots
    timeSlots.forEach((slot, index) => {
      if (slot.start_time >= slot.end_time) {
        newErrors[`slot_${index}`] = "End time must be after start time"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    const scheduleData: Partial<ScheduleWritable> = {
      name: name.trim(),
      description: description.trim(),
      timezone,
      is_default: isDefault,
      is_active: isActive,
    }

    try {
      // Pass time slots separately to parent
      await onSave(scheduleData, timeSlots)
    } catch (error) {
      // Error handling is done in the parent component
      throw error
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isCreating ? "Create New Schedule" : "Edit Schedule"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Schedule Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Regular Hours, Summer Schedule"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this schedule"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Switch id="default" checked={isDefault} onCheckedChange={setIsDefault} />
              <Label htmlFor="default">Set as default schedule</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
        </div>

        {/* Day Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label>Select Days</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyToAllDays}>
              <Copy className="mr-2 h-4 w-4" />
              Copy to All Days
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayToggle(day.value)}
                className={`p-2 text-sm font-medium rounded-md transition-colors ${
                  activeDays[day.value]
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {day.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <Label>Time Slots</Label>
          {errors.timeSlots && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.timeSlots}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4 mt-4">
            {DAYS_OF_WEEK.filter((day) => activeDays[day.value]).map((day) => {
              const daySlots = timeSlots.filter((slot) => slot.day === day.value)
              
              return (
                <div key={day.value} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{day.label}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTimeSlot(day.value)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Time Slot
                    </Button>
                  </div>
                  
                  {daySlots.map((slot, slotIndex) => {
                    const globalIndex = timeSlots.findIndex(
                      (s) => s.day === slot.day && s.start_time === slot.start_time && s.end_time === slot.end_time
                    )
                    
                    return (
                      <div key={slotIndex} className="flex items-center gap-2">
                        <Select
                          value={slot.start_time}
                          onValueChange={(value) => handleTimeSlotChange(globalIndex, "start_time", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {formatTime12Hour(time)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span>to</span>

                        <Select
                          value={slot.end_time}
                          onValueChange={(value) => handleTimeSlotChange(globalIndex, "end_time", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {formatTime12Hour(time)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTimeSlot(globalIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        {errors[`slot_${globalIndex}`] && (
                          <p className="text-sm text-destructive">{errors[`slot_${globalIndex}`]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isCreating ? "Create Schedule" : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}