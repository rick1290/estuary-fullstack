"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Plus, 
  X,
  AlertCircle,
  CalendarDays
} from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface ScheduleAvailabilitySectionProps {
  service: ServiceReadable
  data: {
    availabilityBlocks?: Array<{
      id: string
      day: string
      startTime: string
      endTime: string
      recurring: boolean
    }>
    bufferTime?: number
    bookingLeadTime?: number
    cancellationWindow?: number
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

const daysOfWeek = [
  { value: "monday", label: "Monday", short: "Mon" },
  { value: "tuesday", label: "Tuesday", short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday", label: "Thursday", short: "Thu" },
  { value: "friday", label: "Friday", short: "Fri" },
  { value: "saturday", label: "Saturday", short: "Sat" },
  { value: "sunday", label: "Sunday", short: "Sun" },
]

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const time = `${hour.toString().padStart(2, '0')}:${minute}`
  const label = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return { value: time, label }
})

export function ScheduleAvailabilitySection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: ScheduleAvailabilitySectionProps) {
  const [localData, setLocalData] = useState(data)
  const [isAddingBlock, setIsAddingBlock] = useState(false)
  const [newBlock, setNewBlock] = useState({
    day: "monday",
    startTime: "09:00",
    endTime: "17:00",
    recurring: true
  })

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const addAvailabilityBlock = () => {
    const currentBlocks = localData.availabilityBlocks || []
    const block = {
      id: Date.now().toString(),
      ...newBlock
    }
    handleChange('availabilityBlocks', [...currentBlocks, block])
    setIsAddingBlock(false)
    setNewBlock({
      day: "monday",
      startTime: "09:00",
      endTime: "17:00",
      recurring: true
    })
  }

  const removeAvailabilityBlock = (id: string) => {
    const currentBlocks = localData.availabilityBlocks || []
    handleChange('availabilityBlocks', currentBlocks.filter(b => b.id !== id))
  }

  // Group availability blocks by day
  const blocksByDay = daysOfWeek.map(day => ({
    ...day,
    blocks: (localData.availabilityBlocks || []).filter(b => b.day === day.value)
  }))

  return (
    <div className="space-y-6">
      {/* Weekly Availability */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Weekly Availability
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Set your regular weekly schedule for this service
          </p>
        </div>

        <div className="space-y-3">
          {blocksByDay.map((day) => (
            <Card key={day.value} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{day.label}</h4>
                  {day.blocks.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {day.blocks.map((block) => (
                        <div key={block.id} className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-normal">
                            {timeSlots.find(t => t.value === block.startTime)?.label} - 
                            {timeSlots.find(t => t.value === block.endTime)?.label}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAvailabilityBlock(block.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Not available
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add Availability Block */}
        {isAddingBlock ? (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>Day of Week</Label>
                  <Select
                    value={newBlock.day}
                    onValueChange={(value) => setNewBlock({ ...newBlock, day: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Select
                      value={newBlock.startTime}
                      onValueChange={(value) => setNewBlock({ ...newBlock, startTime: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>End Time</Label>
                    <Select
                      value={newBlock.endTime}
                      onValueChange={(value) => setNewBlock({ ...newBlock, endTime: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots
                          .filter(slot => slot.value > newBlock.startTime)
                          .map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingBlock(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={addAvailabilityBlock}
                >
                  Add Time Block
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddingBlock(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Availability Block
          </Button>
        )}
      </div>

      {/* Booking Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h3 className="font-medium">Booking Settings</h3>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="buffer-time">Buffer Time Between Bookings</Label>
              <Select
                value={(localData.bufferTime || 0).toString()}
                onValueChange={(value) => handleChange('bufferTime', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Time needed between appointments for preparation
              </p>
            </div>

            <div>
              <Label htmlFor="lead-time">Minimum Booking Lead Time</Label>
              <Select
                value={(localData.bookingLeadTime || 24).toString()}
                onValueChange={(value) => handleChange('bookingLeadTime', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No lead time</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How far in advance bookings must be made
              </p>
            </div>

            <div>
              <Label htmlFor="cancellation-window">Cancellation Window</Label>
              <Select
                value={(localData.cancellationWindow || 24).toString()}
                onValueChange={(value) => handleChange('cancellationWindow', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No cancellations allowed</SelectItem>
                  <SelectItem value="6">6 hours before</SelectItem>
                  <SelectItem value="12">12 hours before</SelectItem>
                  <SelectItem value="24">24 hours before</SelectItem>
                  <SelectItem value="48">48 hours before</SelectItem>
                  <SelectItem value="72">3 days before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How close to appointment time cancellations are allowed
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Availability Notice */}
      {(!localData.availabilityBlocks || localData.availabilityBlocks.length === 0) && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              No availability set
            </p>
            <p className="text-amber-800 dark:text-amber-200 mt-1">
              Add availability blocks to allow customers to book this service
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}