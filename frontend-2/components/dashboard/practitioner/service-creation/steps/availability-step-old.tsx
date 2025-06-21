"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServiceForm } from "@/hooks/use-service-form"
import { Trash2, Plus, Clock } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// Time slots for selection
const TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
]

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface AvailabilityBlock {
  id: string
  day: string
  startTime: string
  endTime: string
  recurring: boolean
}

export default function AvailabilityStep() {
  const { formState, updateFormField } = useServiceForm()
  const [availabilityType, setAvailabilityType] = useState("manual")
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([
    { id: "1", day: "Monday", startTime: "09:00", endTime: "17:00", recurring: true },
    { id: "2", day: "Wednesday", startTime: "09:00", endTime: "17:00", recurring: true },
    { id: "3", day: "Friday", startTime: "09:00", endTime: "17:00", recurring: true },
  ])
  const [openDialog, setOpenDialog] = useState(false)
  const [currentBlock, setCurrentBlock] = useState<AvailabilityBlock | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [bufferTime, setBufferTime] = useState(formState?.bufferTime || "15")

  // New state for the dialog form
  const [newDay, setNewDay] = useState("Monday")
  const [newStartTime, setNewStartTime] = useState("09:00")
  const [newEndTime, setNewEndTime] = useState("17:00")
  const [newRecurring, setNewRecurring] = useState(true)

  const handleAvailabilityTypeChange = (value: string) => {
    setAvailabilityType(value)
  }

  const handleBufferTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBufferTime(e.target.value)
    updateFormField("bufferTime", e.target.value)
  }

  const handleOpenDialog = () => {
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleSaveBlock = () => {
    const newBlock = {
      id: Date.now().toString(),
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      recurring: newRecurring,
    }

    const updatedBlocks = [...availabilityBlocks, newBlock]
    setAvailabilityBlocks(updatedBlocks)
    updateFormField("availabilityBlocks", updatedBlocks)
    handleCloseDialog()
  }

  const handleDeleteBlock = (index: number) => {
    const updatedBlocks = availabilityBlocks.filter((_, i) => i !== index)
    setAvailabilityBlocks(updatedBlocks)
    updateFormField("availabilityBlocks", updatedBlocks)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Availability Settings</h2>
        <p className="text-muted-foreground">
          Set your availability for this service to help clients book sessions with you.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">How would you like to manage your availability?</h3>
              <RadioGroup value={availabilityType} onValueChange={handleAvailabilityTypeChange} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual">Set availability manually</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="calendar" id="calendar" />
                  <Label htmlFor="calendar">Sync with my calendar</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {availabilityType === "manual" ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Availability Blocks</h3>
            <Button onClick={handleOpenDialog} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Availability
            </Button>
          </div>

          {availabilityBlocks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availabilityBlocks.map((block, index) => (
                <Card key={block.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{block.day}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(index)} className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>
                        {block.startTime} - {block.endTime}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">{block.recurring ? "Recurring weekly" : "One-time only"}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No availability blocks added yet. Click the button above to add your availability.
                </p>
              </CardContent>
            </Card>
          )}

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-medium mb-4">Buffer Time</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a buffer time between sessions to prepare for your next client.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
                <Input
                  id="bufferTime"
                  type="number"
                  value={bufferTime}
                  onChange={handleBufferTimeChange}
                  min={0}
                  max={120}
                  className="mt-1"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                This will add {bufferTime} minutes between each session to give you time to prepare.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium mb-2">Calendar Sync</h3>
            <p className="text-muted-foreground mb-4">Connect your calendar to automatically sync your availability.</p>
            <Button>Connect Calendar</Button>
          </CardContent>
        </Card>
      )}

      {/* Add Availability Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Add Availability</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="day">Day of Week</Label>
                  <Select value={newDay} onValueChange={setNewDay}>
                    <SelectTrigger id="day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Select value={newStartTime} onValueChange={setNewStartTime}>
                      <SelectTrigger id="startTime">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={`start-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Select value={newEndTime} onValueChange={setNewEndTime}>
                      <SelectTrigger id="endTime">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={`end-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={newRecurring}
                    onCheckedChange={(checked) => setNewRecurring(checked === true)}
                  />
                  <Label htmlFor="recurring">Recurring weekly</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBlock}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
