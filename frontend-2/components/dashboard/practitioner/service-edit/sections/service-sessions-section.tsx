"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  serviceSessionsListOptions,
  serviceSessionsCreateMutation,
  serviceSessionsPartialUpdateMutation,
  serviceSessionsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, addWeeks, setHours, setMinutes } from "date-fns"
import { CalendarIcon, Clock, Plus, X, GripVertical, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ServiceReadable } from "@/src/client/types.gen"

interface ServiceSessionsSectionProps {
  service: ServiceReadable
  data: any // Not used anymore, keeping for compatibility
  onChange: (data: any) => void // Not used anymore
  onSave: () => void // Not used anymore
  hasChanges: boolean // Not used anymore
  isSaving: boolean // Not used anymore
}

export function ServiceSessionsSection({ 
  service
}: ServiceSessionsSectionProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for new session form
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [duration, setDuration] = useState(service.duration_minutes || 60)
  const [sessionTitle, setSessionTitle] = useState("")
  const [sessionDescription, setSessionDescription] = useState("")
  
  const isWorkshop = service.service_type_code === 'workshop'
  const isCourse = service.service_type_code === 'course'

  // Fetch existing sessions
  const { data: sessionsData, isLoading } = useQuery({
    ...serviceSessionsListOptions({
      query: { service_id: service.id }
    }),
    enabled: !!service.id
  })

  const sessions = sessionsData?.results || []

  // Mutations
  const createMutation = useMutation({
    ...serviceSessionsCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Session added",
        description: "The session has been added successfully."
      })
      queryClient.invalidateQueries({ 
        queryKey: serviceSessionsListOptions({ query: { service_id: service.id } }).queryKey 
      })
      // Reset form
      setSelectedDate(undefined)
      setSelectedTime("09:00")
      setSessionTitle("")
      setSessionDescription("")
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add session",
        description: error.message || "Something went wrong",
        variant: "destructive"
      })
    }
  })

  const updateMutation = useMutation({
    ...serviceSessionsPartialUpdateMutation(),
    onSuccess: () => {
      toast({
        title: "Session updated",
        description: "The session has been updated successfully."
      })
      queryClient.invalidateQueries({ 
        queryKey: serviceSessionsListOptions({ query: { service_id: service.id } }).queryKey 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update session",
        description: error.message || "Something went wrong",
        variant: "destructive"
      })
    }
  })

  const deleteMutation = useMutation({
    ...serviceSessionsDestroyMutation(),
    onSuccess: () => {
      toast({
        title: "Session removed",
        description: "The session has been removed successfully."
      })
      queryClient.invalidateQueries({ 
        queryKey: serviceSessionsListOptions({ query: { service_id: service.id } }).queryKey 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove session",
        description: error.message || "Something went wrong",
        variant: "destructive"
      })
    }
  })

  const addSession = async () => {
    if (!selectedDate || !selectedTime) return

    const [hours, minutes] = selectedTime.split(':').map(Number)
    const startTime = setMinutes(setHours(selectedDate, hours), minutes)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    await createMutation.mutateAsync({
      body: {
        service: service.id,
        title: sessionTitle || undefined,
        description: sessionDescription || undefined,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        max_participants: service.max_participants,
        sequence_number: sessions.length
      }
    })
  }

  const removeSession = async (sessionId: number) => {
    await deleteMutation.mutateAsync({
      path: { id: sessionId }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Existing Sessions */}
      <div className="space-y-2">
        {sessions.map((session: any, index: number) => (
          <Card key={session.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {isCourse ? `Module ${index + 1}` : `Session ${index + 1}`}
                  </Badge>
                  {session.title && (
                    <h4 className="font-medium">{session.title}</h4>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(session.start_time), "PPP")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(session.start_time), "p")} - {format(new Date(session.end_time), "p")}
                  </div>
                </div>
                {session.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {session.description}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSession(session.id)}
                disabled={deleteMutation.isPending}
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
            disabled={!selectedDate || !selectedTime || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add {isCourse ? 'Module' : 'Session'}
          </Button>
        </div>
      </Card>

      {isWorkshop && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Workshop Tip:</strong> For workshops, you typically need just one session with the workshop date and time.
          </p>
        </div>
      )}

      {isCourse && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Course Tip:</strong> Add all your course modules here. Participants will attend all sessions in sequence.
          </p>
        </div>
      )}
    </div>
  )
}