"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import type { ScheduleReadable, ScheduleWritable, ScheduleTimeSlotWritable } from "@/src/client/types.gen"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Plus, Trash2, AlertCircle, Loader2, ChevronDown, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
  schedulesAddTimeSlotCreateMutation,
  schedulesRemoveTimeSlotDestroyMutation,
  timezonesRetrieveOptions
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

// Timezone type from API
interface TimezoneOption {
  value: string
  label: string
  full_label: string
  region: string
  offset_str: string
  offset_minutes: number
}

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

// Helper to convert time string to minutes for overlap checking
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Check if two time slots overlap
const slotsOverlap = (slot1Start: string, slot1End: string, slot2Start: string, slot2End: string): boolean => {
  const s1Start = timeToMinutes(slot1Start)
  const s1End = timeToMinutes(slot1End)
  const s2Start = timeToMinutes(slot2Start)
  const s2End = timeToMinutes(slot2End)
  return s1Start < s2End && s2Start < s1End
}

// Find a non-overlapping time slot for a day
const findNextAvailableSlot = (existingSlots: ScheduleTimeSlotWritable[], day: number): { start: string; end: string } | null => {
  const daySlots = existingSlots.filter(s => s.day === day).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

  if (daySlots.length === 0) {
    return { start: "09:00:00", end: "17:00:00" }
  }

  // Try to find a gap after the last slot
  const lastSlot = daySlots[daySlots.length - 1]
  const lastEndMinutes = timeToMinutes(lastSlot.end_time)

  if (lastEndMinutes < 23 * 60) { // Before 11 PM
    const newStartMinutes = lastEndMinutes
    const newEndMinutes = Math.min(newStartMinutes + 60, 24 * 60) // 1 hour or end of day
    const newStart = `${Math.floor(newStartMinutes / 60).toString().padStart(2, '0')}:${(newStartMinutes % 60).toString().padStart(2, '0')}:00`
    const newEnd = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}:00`
    return { start: newStart, end: newEnd }
  }

  // No room available
  return null
}

// Component for copying a day's slots to other days
function CopyDayDropdown({
  sourceDay,
  activeDays,
  onCopy,
}: {
  sourceDay: number
  activeDays: Record<number, boolean>
  onCopy: (sourceDay: number, targetDays: number[]) => void
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const otherDays = DAYS_OF_WEEK.filter((d) => d.value !== sourceDay)

  const handleToggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    )
  }

  const handleApply = () => {
    if (selectedDays.length > 0) {
      onCopy(sourceDay, selectedDays)
      setSelectedDays([])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="whitespace-nowrap">
          <Copy className="mr-1 h-4 w-4 flex-shrink-0" />
          Copy
          <ChevronDown className="ml-1 h-3 w-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Select days to copy to:
        </div>
        {otherDays.map((day) => (
          <DropdownMenuCheckboxItem
            key={day.value}
            checked={selectedDays.includes(day.value)}
            onCheckedChange={() => handleToggleDay(day.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {day.label}
            {activeDays[day.value] && (
              <span className="ml-auto text-xs text-muted-foreground">(has slots)</span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
        {selectedDays.length > 0 && (
          <div className="p-2 border-t">
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={handleApply}
            >
              Copy to {selectedDays.length} day{selectedDays.length > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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

  // Fetch timezones from API
  const { data: timezonesData, isLoading: timezonesLoading } = useQuery({
    ...timezonesRetrieveOptions(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
  const timezones: TimezoneOption[] = (timezonesData as any)?.timezones || []

  // Group timezones by region for better UX
  const groupedTimezones = timezones.reduce((acc, tz) => {
    const region = tz.region || 'Other'
    if (!acc[region]) acc[region] = []
    acc[region].push(tz)
    return acc
  }, {} as Record<string, TimezoneOption[]>)

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
    const nextSlot = findNextAvailableSlot(timeSlots, day)

    if (!nextSlot) {
      toast({
        title: "Cannot add time slot",
        description: "No available time remaining for this day.",
        variant: "destructive",
      })
      return
    }

    const newSlot: ScheduleTimeSlotWritable = {
      day,
      start_time: nextSlot.start,
      end_time: nextSlot.end,
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
    const updatedSlot = { ...updatedSlots[index], [field]: value }

    // Check for overlaps with other slots on the same day (excluding self)
    const otherDaySlots = updatedSlots.filter((s, i) => s.day === updatedSlot.day && i !== index)
    const hasOverlap = otherDaySlots.some(slot =>
      slotsOverlap(updatedSlot.start_time, updatedSlot.end_time, slot.start_time, slot.end_time)
    )

    if (hasOverlap) {
      toast({
        title: "Time slot overlap",
        description: "This time overlaps with another slot on this day.",
        variant: "destructive",
      })
      return
    }

    updatedSlots[index] = updatedSlot
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

  const handleCopyDayToOthers = (sourceDay: number, targetDays: number[]) => {
    const sourceDaySlots = timeSlots.filter((slot) => slot.day === sourceDay)

    if (sourceDaySlots.length === 0) {
      toast({
        title: "No time slots to copy",
        description: "This day has no time slots to copy.",
        variant: "destructive",
      })
      return
    }

    // Remove existing slots from target days and add copied slots
    const slotsToKeep = timeSlots.filter((slot) => !targetDays.includes(slot.day))
    const newSlots: ScheduleTimeSlotWritable[] = []

    targetDays.forEach((targetDay) => {
      sourceDaySlots.forEach((slot) => {
        newSlots.push({
          ...slot,
          day: targetDay,
        })
      })
    })

    setTimeSlots([...slotsToKeep, ...newSlots])

    // Update active days
    const newActiveDays = { ...activeDays }
    targetDays.forEach((day) => {
      newActiveDays[day] = true
    })
    setActiveDays(newActiveDays)

    const dayNames = targetDays.map((d) => DAYS_OF_WEEK[d].label).join(", ")
    toast({
      title: "Time slots copied",
      description: `Copied to ${dayNames}`,
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
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={timezonesLoading}>
              <SelectTrigger id="timezone" className="mt-1.5">
                {timezonesLoading ? (
                  <span className="text-muted-foreground">Loading timezones...</span>
                ) : (
                  <SelectValue placeholder="Select timezone" />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(groupedTimezones).map(([region, tzList]) => (
                  <div key={region}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                      {region}
                    </div>
                    {tzList.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <span className="flex items-center justify-between gap-2 w-full">
                          <span>{tz.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </div>
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
          <div className="flex items-center justify-between gap-2 mb-4">
            <Label>Select Days</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyToAllDays} className="whitespace-nowrap">
              <Copy className="mr-2 h-4 w-4 flex-shrink-0" />
              Copy All
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
                <div key={day.value} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{day.label}</h4>
                    <div className="flex items-center gap-2">
                      {daySlots.length > 0 && (
                        <CopyDayDropdown
                          sourceDay={day.value}
                          activeDays={activeDays}
                          onCopy={handleCopyDayToOthers}
                        />
                      )}
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