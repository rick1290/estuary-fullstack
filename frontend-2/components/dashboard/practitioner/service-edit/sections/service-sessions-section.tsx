"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, addWeeks, setHours, setMinutes } from "date-fns"
import { CalendarIcon, Clock, Plus, X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ServiceReadable } from "@/src/client/types.gen"

interface ServiceSession {
  id?: string | number
  title?: string
  description?: string
  start_time: string
  end_time: string
  sequence_number: number
  max_participants?: number
}

interface ServiceSessionsSectionProps {
  service: ServiceReadable
  data: {
    sessions?: ServiceSession[]
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function ServiceSessionsSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: ServiceSessionsSectionProps) {
  const [localData, setLocalData] = useState(data)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [duration, setDuration] = useState(service.duration_minutes || 60)
  const [sessionTitle, setSessionTitle] = useState("")
  const [sessionDescription, setSessionDescription] = useState("")

  const isWorkshop = service.service_type_code === 'workshop'
  const isCourse = service.service_type_code === 'course'

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const addSession = () => {
    if (!selectedDate || !selectedTime) return

    const [hours, minutes] = selectedTime.split(':').map(Number)
    const startTime = setMinutes(setHours(selectedDate, hours), minutes)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    const currentSessions = localData.sessions || []
    const newSession: ServiceSession = {
      id: `temp_${Date.now()}`,
      title: sessionTitle || (isCourse ? `Module ${currentSessions.length + 1}` : undefined),
      description: sessionDescription || undefined,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      sequence_number: currentSessions.length + 1,
      max_participants: service.max_participants
    }

    handleChange('sessions', [...currentSessions, newSession])
    
    // Reset form
    setSessionTitle("")
    setSessionDescription("")
    if (isCourse) {
      // For courses, default to next week same time
      setSelectedDate(addWeeks(selectedDate, 1))
    }
  }

  const removeSession = (index: number) => {
    const currentSessions = localData.sessions || []
    const updatedSessions = currentSessions.filter((_, i) => i !== index)
    // Resequence remaining sessions
    updatedSessions.forEach((session, i) => {
      session.sequence_number = i + 1
    })
    handleChange('sessions', updatedSessions)
  }

  const generateWeeklySessions = (weeks: number) => {
    if (!selectedDate || !selectedTime) return

    const sessions: ServiceSession[] = []
    const [hours, minutes] = selectedTime.split(':').map(Number)

    for (let i = 0; i < weeks; i++) {
      const sessionDate = addWeeks(selectedDate, i)
      const startTime = setMinutes(setHours(sessionDate, hours), minutes)
      const endTime = new Date(startTime.getTime() + duration * 60000)

      sessions.push({
        id: `temp_${Date.now()}_${i}`,
        title: `Week ${i + 1}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        sequence_number: i + 1,
        max_participants: service.max_participants
      })
    }

    handleChange('sessions', sessions)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Label>{isWorkshop ? 'Workshop Sessions' : 'Course Modules'}</Label>
        <p className="text-sm text-muted-foreground mt-1">
          {isWorkshop 
            ? 'Add the dates and times for your workshop sessions'
            : 'Define the modules and schedule for your course'
          }
        </p>
      </div>

      {/* Quick Actions for Courses */}
      {isCourse && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generateWeeklySessions(4)}
          >
            Generate 4 Week Course
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generateWeeklySessions(8)}
          >
            Generate 8 Week Course
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generateWeeklySessions(12)}
          >
            Generate 12 Week Course
          </Button>
        </div>
      )}

      {/* Existing Sessions */}
      <div className="space-y-3">
        {(localData.sessions || []).map((session, index) => (
          <Card key={session.id || index} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{isCourse ? `Module ${session.sequence_number}` : `Session ${index + 1}`}</Badge>
                  {session.title && (
                    <span className="font-medium">{session.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(session.start_time), 'PPP')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(session.start_time), 'p')} - {format(new Date(session.end_time), 'p')}
                  </span>
                </div>
                {session.description && (
                  <p className="text-sm text-muted-foreground">{session.description}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSession(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Session Form */}
      <Card className="p-4 border-dashed">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              min={15}
              step={15}
              className="max-w-[200px]"
            />
          </div>

          {/* Session Title (optional) */}
          <div className="space-y-2">
            <Label>{isCourse ? 'Module Title' : 'Session Title'} (optional)</Label>
            <Input
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={isCourse ? "e.g., Introduction to Mindfulness" : "e.g., Morning Session"}
            />
          </div>

          {/* Session Description (optional) */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              placeholder="What will be covered in this session?"
              rows={3}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSession}
            disabled={!selectedDate || !selectedTime}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {isCourse ? 'Module' : 'Session'}
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !localData.sessions?.length}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
      
    </div>
  )
}