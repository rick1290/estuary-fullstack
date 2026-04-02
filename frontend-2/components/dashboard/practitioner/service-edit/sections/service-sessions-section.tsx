"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  serviceSessionsListOptions,
  serviceSessionsCreateMutation,
  serviceSessionsPartialUpdateMutation,
  serviceSessionsDestroyMutation,
  serviceSessionsMarkCompletedCreateMutation,
  serviceSessionsMarkInProgressCreateMutation,
  serviceSessionsRescheduleCreateMutation,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { format, addWeeks, setHours, setMinutes, isPast } from "date-fns"
import {
  CalendarIcon, Clock, Plus, X, Loader2, Edit, Check, Repeat,
  MoreVertical, CheckCircle2, PlayCircle, AlertTriangle, CalendarClock, Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ServiceDetailReadable as ServiceReadable } from "@/src/client/types.gen"

// Session status styling
const SESSION_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Draft", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default", className: "bg-blue-600" },
  completed: { label: "Completed", variant: "default", className: "bg-green-600" },
  canceled: { label: "Canceled", variant: "destructive" },
}

interface ServiceSessionsSectionProps {
  service: ServiceReadable
  data: any
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
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

  // State for editing/rescheduling existing sessions
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState<Date | undefined>()
  const [editTime, setEditTime] = useState("09:00")
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editMode, setEditMode] = useState<"edit" | "reschedule">("edit")

  // State for bulk recurring sessions
  const [bulkStartDate, setBulkStartDate] = useState<Date | undefined>()
  const [bulkTime, setBulkTime] = useState("09:00")
  const [bulkWeeks, setBulkWeeks] = useState(4)
  const [bulkCreating, setBulkCreating] = useState(false)

  const isWorkshop = service.service_type_code === 'workshop'
  const isCourse = service.service_type_code === 'course'

  const invalidateSessions = () => {
    queryClient.invalidateQueries({
      queryKey: serviceSessionsListOptions({ query: { service_id: service.id } }).queryKey
    })
  }

  // Fetch existing sessions
  const { data: sessionsData, isLoading } = useQuery({
    ...serviceSessionsListOptions({
      query: { service_id: service.id }
    }),
    enabled: !!service.id
  })

  const sessions = sessionsData?.results || []

  // Count sessions by status for the summary
  const completedCount = sessions.filter((s: any) => s.status === 'completed').length
  const scheduledCount = sessions.filter((s: any) => s.status === 'scheduled' || s.status === 'draft').length
  const inProgressCount = sessions.filter((s: any) => s.status === 'in_progress').length

  // --- Mutations ---

  const createMutation = useMutation({
    ...serviceSessionsCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session added", description: "The session has been added successfully." })
      invalidateSessions()
      setSelectedDate(undefined)
      setSelectedTime("09:00")
      setSessionTitle("")
      setSessionDescription("")
    },
    onError: (error: any) => {
      toast({ title: "Failed to add session", description: error.message || "Something went wrong", variant: "destructive" })
    }
  })

  const updateMutation = useMutation({
    ...serviceSessionsPartialUpdateMutation(),
    onSuccess: () => {
      toast({ title: "Session updated", description: "The session has been updated successfully." })
      invalidateSessions()
    },
    onError: (error: any) => {
      toast({ title: "Cannot update session", description: error?.body?.detail || error?.message || "Something went wrong", variant: "destructive" })
    }
  })

  const deleteMutation = useMutation({
    ...serviceSessionsDestroyMutation(),
    onSuccess: () => {
      toast({ title: "Session removed", description: "The session has been removed successfully." })
      invalidateSessions()
    },
    onError: (error: any) => {
      toast({ title: "Cannot remove session", description: error?.body?.detail || error?.message || "Something went wrong", variant: "destructive" })
    }
  })

  const markCompletedMutation = useMutation({
    ...serviceSessionsMarkCompletedCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session completed", description: "Session has been marked as completed." })
      invalidateSessions()
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.body?.detail || error?.message || "Could not mark session as completed", variant: "destructive" })
    }
  })

  const markInProgressMutation = useMutation({
    ...serviceSessionsMarkInProgressCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session started", description: "Session has been marked as in progress." })
      invalidateSessions()
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.body?.detail || error?.message || "Could not mark session as in progress", variant: "destructive" })
    }
  })

  const rescheduleMutation = useMutation({
    ...serviceSessionsRescheduleCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session rescheduled", description: "Session has been rescheduled. Enrolled participants will be notified." })
      invalidateSessions()
      setEditingSessionId(null)
      setEditDate(undefined)
      setEditTime("09:00")
    },
    onError: (error: any) => {
      toast({ title: "Reschedule failed", description: error?.body?.detail || error?.message || "Could not reschedule session", variant: "destructive" })
    }
  })

  const isAnyMutating = updateMutation.isPending || deleteMutation.isPending ||
    markCompletedMutation.isPending || markInProgressMutation.isPending || rescheduleMutation.isPending

  // --- Handlers ---

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
    await deleteMutation.mutateAsync({ path: { id: sessionId } })
  }

  const startEdit = (session: any, mode: "edit" | "reschedule") => {
    setEditingSessionId(session.id)
    setEditMode(mode)
    setEditDate(session.start_time ? new Date(session.start_time) : undefined)
    setEditTime(session.start_time ? format(new Date(session.start_time), "HH:mm") : "09:00")
    setEditTitle(session.title || "")
    setEditDescription(session.description || "")
  }

  const cancelEdit = () => {
    setEditingSessionId(null)
    setEditDate(undefined)
    setEditTime("09:00")
    setEditTitle("")
    setEditDescription("")
  }

  const saveEdit = async (sessionId: number, session: any) => {
    if (!editDate || !editTime) return

    const [hours, minutes] = editTime.split(':').map(Number)
    const startTime = setMinutes(setHours(editDate, hours), minutes)
    const originalDuration = (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000
    const endTime = new Date(startTime.getTime() + originalDuration * 60000)

    if (editMode === "reschedule") {
      // Use reschedule endpoint (notifies enrolled participants)
      await rescheduleMutation.mutateAsync({
        path: { id: String(sessionId) },
        body: {
          service: service.id!,
          title: editTitle || null,
          description: editDescription || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        }
      })
    } else {
      // Direct update (no bookings, safe to edit)
      await updateMutation.mutateAsync({
        path: { id: sessionId },
        body: {
          title: editTitle || null,
          description: editDescription || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        }
      })
      setEditingSessionId(null)
      setEditDate(undefined)
      setEditTime("09:00")
      setEditTitle("")
      setEditDescription("")
    }
  }

  const handleMarkCompleted = (sessionId: number) => {
    markCompletedMutation.mutate({
      path: { id: String(sessionId) },
      body: { service: service.id! },
    })
  }

  const handleMarkInProgress = (sessionId: number) => {
    markInProgressMutation.mutate({
      path: { id: String(sessionId) },
      body: { service: service.id! },
    })
  }

  // Bulk create recurring weekly sessions
  const addRecurringSessions = async () => {
    if (!bulkStartDate || !bulkTime || bulkWeeks < 2) return
    setBulkCreating(true)
    try {
      const [hours, minutes] = bulkTime.split(':').map(Number)
      const sessionDuration = service.duration_minutes || 60
      for (let i = 0; i < bulkWeeks; i++) {
        const weekDate = addWeeks(bulkStartDate, i)
        const startTime = setMinutes(setHours(weekDate, hours), minutes)
        const endTime = new Date(startTime.getTime() + sessionDuration * 60000)
        await createMutation.mutateAsync({
          body: {
            service: service.id,
            title: isCourse ? `Module ${sessions.length + i + 1}` : undefined,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_participants: service.max_participants,
            sequence_number: sessions.length + i,
          }
        })
      }
      toast({ title: "Sessions created", description: `${bulkWeeks} weekly sessions have been added.` })
      setBulkStartDate(undefined)
      setBulkTime("09:00")
      setBulkWeeks(4)
    } catch (error: any) {
      toast({ title: "Bulk creation failed", description: error.message || "Some sessions may not have been created.", variant: "destructive" })
    } finally {
      setBulkCreating(false)
    }
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
      {/* Progress summary for courses */}
      {isCourse && sessions.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground font-medium">Course Progress:</span>
          <div className="flex items-center gap-3">
            {completedCount > 0 && (
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completedCount} completed
              </span>
            )}
            {inProgressCount > 0 && (
              <span className="flex items-center gap-1 text-blue-700">
                <PlayCircle className="h-3.5 w-3.5" />
                {inProgressCount} in progress
              </span>
            )}
            {scheduledCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {scheduledCount} upcoming
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Add: Recurring Sessions — at top for visibility */}
      {(isCourse || isWorkshop) && (
        <Card className="p-4 border-dashed border-sage-300 bg-cream-50/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-olive-600" />
              <h4 className="font-medium text-sm text-olive-900">Quick Add: Recurring Sessions</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate weekly sessions automatically. Each will be titled sequentially ({isCourse ? '"Module 1", "Module 2"...' : '"Session 1", "Session 2"...'}).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("w-full justify-start text-left font-normal", !bulkStartDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {bulkStartDate ? format(bulkStartDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkStartDate}
                      onSelect={setBulkStartDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  value={bulkTime}
                  onChange={(e) => setBulkTime(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Number of Weeks</Label>
                <Input
                  type="number"
                  value={bulkWeeks}
                  onChange={(e) => setBulkWeeks(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))}
                  min={2}
                  max={52}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addRecurringSessions}
              disabled={!bulkStartDate || !bulkTime || bulkWeeks < 2 || bulkCreating}
              className="w-full border-olive-300 text-olive-700 hover:bg-olive-50"
            >
              {bulkCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Repeat className="h-4 w-4 mr-2" />
              )}
              Generate {bulkWeeks} Weekly {isCourse ? 'Modules' : 'Sessions'}
            </Button>
          </div>
        </Card>
      )}

      {/* Existing Sessions */}
      <div className="space-y-2">
        {sessions.map((session: any, index: number) => {
          const hasBookings = parseInt(session.booking_count || '0') > 0
          const bookingCount = parseInt(session.booking_count || '0')
          const isEditing = editingSessionId === session.id
          const sessionStatus = session.status || 'scheduled'
          const statusConfig = SESSION_STATUS_CONFIG[sessionStatus] || SESSION_STATUS_CONFIG.scheduled
          const sessionIsPast = session.start_time && isPast(new Date(session.end_time || session.start_time))
          const canMarkInProgress = sessionStatus === 'scheduled' || sessionStatus === 'draft'
          const canMarkCompleted = sessionStatus === 'in_progress' || (sessionStatus === 'scheduled' && sessionIsPast)
          const canReschedule = hasBookings && (sessionStatus === 'scheduled' || sessionStatus === 'draft')
          const canDirectEdit = !hasBookings && sessionStatus !== 'completed' && sessionStatus !== 'canceled'
          const canDelete = !hasBookings && sessionStatus !== 'completed'

          return (
            <Card key={session.id} className={cn(
              "p-4",
              sessionStatus === 'completed' && "opacity-75",
              sessionStatus === 'canceled' && "opacity-50",
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      {isCourse ? `Module ${index + 1}` : `Session ${index + 1}`}
                    </Badge>
                    <Badge
                      variant={statusConfig.variant}
                      className={statusConfig.className}
                    >
                      {statusConfig.label}
                    </Badge>
                    {session.title && (
                      <h4 className="font-medium">{session.title}</h4>
                    )}
                    {bookingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {bookingCount} booked{session.max_participants ? `/${session.max_participants}` : ''}
                      </span>
                    )}
                    {session.waitlist_count && parseInt(session.waitlist_count) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        +{session.waitlist_count} waitlisted
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    /* Edit / Reschedule Mode */
                    <div className="space-y-3">
                      {editMode === "reschedule" && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Rescheduling will notify {bookingCount} enrolled participant{bookingCount !== 1 ? 's' : ''}.</span>
                        </div>
                      )}
                      {!isWorkshop && (
                        <div className="space-y-2">
                          <Label className="text-xs">{isCourse ? 'Module Title' : 'Session Title'}</Label>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder={isCourse ? "e.g., Introduction to Mindfulness" : "e.g., Morning Session"}
                            className="h-9"
                          />
                        </div>
                      )}
                      {!isWorkshop && (
                        <div className="space-y-2">
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="What will be covered in this session?"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn("w-full justify-start text-left font-normal", !editDate && "text-muted-foreground")}
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {editDate ? format(editDate, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editDate}
                                onSelect={setEditDate}
                                initialFocus
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(session.id, session)}
                          disabled={isAnyMutating || !editDate || !editTime}
                        >
                          {(updateMutation.isPending || rescheduleMutation.isPending) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {editMode === "reschedule" ? "Reschedule & Notify" : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isAnyMutating}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      {session.start_time && (
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
                      )}
                      {session.description && (
                        <p className="text-sm text-muted-foreground">{session.description}</p>
                      )}
                      {/* Contextual hints */}
                      {sessionIsPast && sessionStatus === 'scheduled' && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          This session&apos;s date has passed — mark it as completed or reschedule.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons — only show when not editing */}
                {!isEditing && sessionStatus !== 'canceled' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isAnyMutating}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Lifecycle actions */}
                      {canMarkInProgress && (
                        <DropdownMenuItem onClick={() => handleMarkInProgress(session.id)}>
                          <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                          <span>Mark In Progress</span>
                        </DropdownMenuItem>
                      )}
                      {canMarkCompleted && (
                        <DropdownMenuItem onClick={() => handleMarkCompleted(session.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                          <span>Mark Completed</span>
                        </DropdownMenuItem>
                      )}

                      {(canMarkInProgress || canMarkCompleted) && (canDirectEdit || canReschedule || canDelete) && (
                        <DropdownMenuSeparator />
                      )}

                      {/* Edit/Reschedule */}
                      {canDirectEdit && (
                        <DropdownMenuItem onClick={() => startEdit(session, "edit")}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit Session</span>
                        </DropdownMenuItem>
                      )}
                      {canReschedule && (
                        <DropdownMenuItem onClick={() => startEdit(session, "reschedule")}>
                          <CalendarClock className="mr-2 h-4 w-4" />
                          <span>Reschedule (Notify Participants)</span>
                        </DropdownMenuItem>
                      )}

                      {/* Delete */}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => removeSession(session.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Add New Session Form */}
      <Card className="p-4 border-dashed">
        <div className="space-y-4">
          {/* Timezone Indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Clock className="h-4 w-4" />
            <span>
              All times are in <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}</strong> (your local timezone)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
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

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
            </div>
          </div>

          {!isWorkshop && (
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
          )}

          {!isWorkshop && (
            <div className="space-y-2">
              <Label>{isCourse ? 'Module Title' : 'Session Title'} (optional)</Label>
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={isCourse ? "e.g., Introduction to Mindfulness" : "e.g., Morning Session"}
              />
            </div>
          )}

          {!isWorkshop && (
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                placeholder="What will be covered in this session?"
                rows={3}
              />
            </div>
          )}

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
            For workshops, you typically need just one session with the workshop date and time.
          </p>
        </div>
      )}

      {isCourse && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            Add all your course modules here. Participants will attend all sessions in sequence. Use the dropdown menu on each session to track delivery progress.
          </p>
        </div>
      )}
    </div>
  )
}
