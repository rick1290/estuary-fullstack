"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Users,
  Calendar as CalendarIcon,
  MoreVertical,
  PlayCircle,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronRight,
} from "lucide-react"
import { format, isPast } from "date-fns"
import { cn } from "@/lib/utils"

// Session status styling
const SESSION_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Draft", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default", className: "bg-blue-600" },
  completed: { label: "Completed", variant: "default", className: "bg-green-600" },
  canceled: { label: "Canceled", variant: "destructive" },
}

type ServiceType = 'session' | 'workshop' | 'course' | 'bundle' | 'package'

interface SessionsTableProps {
  sessions: any[]
  serviceId: number
  serviceType: ServiceType
  isAnyMutating: boolean
  onMarkInProgress: (sessionId: number) => void
  onMarkCompleted: (sessionId: number) => void
  onReschedule?: (sessionId: number, startTime: string, endTime: string) => void
}

export function SessionsTable({
  sessions,
  serviceId,
  serviceType,
  isAnyMutating,
  onMarkInProgress,
  onMarkCompleted,
  onReschedule,
}: SessionsTableProps) {
  const isCourse = serviceType === 'course'
  const isIndividual = serviceType === 'session'
  const router = useRouter()
  const [reschedulingSessionId, setReschedulingSessionId] = useState<number | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>()
  const [rescheduleTime, setRescheduleTime] = useState("09:00")

  const handleRowClick = (sessionId: number, e: React.MouseEvent) => {
    // Don't navigate if clicking on a button or dropdown
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-no-navigate]')) {
      return
    }
    router.push(`/dashboard/practitioner/services/${serviceId}/sessions/${sessionId}`)
  }

  const handleRescheduleSubmit = (sessionId: number, session: any) => {
    if (!rescheduleDate || !rescheduleTime || !onReschedule) return
    const [hours, minutes] = rescheduleTime.split(':').map(Number)
    const startTime = new Date(rescheduleDate)
    startTime.setHours(hours, minutes, 0, 0)
    const originalDuration = (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000
    const endTime = new Date(startTime.getTime() + originalDuration * 60000)

    onReschedule(sessionId, startTime.toISOString(), endTime.toISOString())
    setReschedulingSessionId(null)
    setRescheduleDate(undefined)
    setRescheduleTime("09:00")
  }

  // Column layout differs by service type
  // Individual: wider date column, no #/enrolled/waitlist columns — simpler
  // Last column is a narrow chevron for click affordance
  const gridCols = isIndividual
    ? "grid-cols-[1fr_1.2fr_6rem_3rem_1.5rem]"
    : "grid-cols-[3rem_1fr_1fr_6rem_5rem_4rem_3rem_1.5rem]"

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Table header */}
      {isIndividual ? (
        <div className={`hidden md:grid ${gridCols} gap-2 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
          <div>Date & Time</div>
          <div>Details</div>
          <div>Status</div>
          <div></div>
          <div></div>
        </div>
      ) : (
        <div className={`hidden md:grid ${gridCols} gap-2 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
          <div>#</div>
          <div>Title</div>
          <div>Date & Time</div>
          <div>Status</div>
          <div>Enrolled</div>
          <div>Waitlist</div>
          <div></div>
          <div></div>
        </div>
      )}

      {/* Table rows */}
      <div className="divide-y">
        {sessions.map((session: any, index: number) => {
          const bookingCount = parseInt(session.booking_count || '0')
          const sessionStatus = session.status || 'scheduled'
          const statusConfig = SESSION_STATUS_CONFIG[sessionStatus] || SESSION_STATUS_CONFIG.scheduled
          const sessionIsPast = session.start_time && isPast(new Date(session.end_time || session.start_time))
          const canMarkInProgress = sessionStatus === 'scheduled' || sessionStatus === 'draft'
          const canMarkCompleted = sessionStatus === 'in_progress' || (sessionStatus === 'scheduled' && sessionIsPast)
          const hasBookings = bookingCount > 0
          const canReschedule = hasBookings && (sessionStatus === 'scheduled' || sessionStatus === 'draft')
          const waitlistCount = parseInt(session.waitlist_count || '0')
          const isRescheduling = reschedulingSessionId === session.id

          return (
            <div key={session.id}>
              {/* Desktop row */}
              {isIndividual ? (
                /* Individual 1:1 session layout */
                <div
                  onClick={(e) => handleRowClick(session.id, e)}
                  className={cn(
                    `hidden md:grid ${gridCols} gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-muted/30`,
                    sessionStatus === 'completed' && "opacity-70",
                    sessionStatus === 'canceled' && "opacity-50",
                  )}
                >
                  {/* Date & Time */}
                  <div className="text-sm">
                    {session.start_time ? (
                      <span className={cn(
                        sessionIsPast && sessionStatus === 'scheduled' && "text-terracotta-600"
                      )}>
                        {format(new Date(session.start_time), "EEE, MMM d, yyyy")}
                        <span className="text-muted-foreground ml-1.5">
                          {format(new Date(session.start_time), "h:mm a")}
                          {session.end_time && ` - ${format(new Date(session.end_time), "h:mm a")}`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </div>

                  {/* Details — title or booking info */}
                  <div className="text-sm truncate">
                    {session.title ? (
                      <span>{session.title}</span>
                    ) : bookingCount > 0 ? (
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        {bookingCount} client{bookingCount !== 1 ? 's' : ''} booked
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                    {sessionIsPast && sessionStatus === 'scheduled' && (
                      <span className="text-terracotta-600 text-xs ml-2 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Past due
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <Badge
                      variant={statusConfig.variant}
                      className={cn("text-xs px-1.5 py-0 h-5", statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div data-no-navigate>
                    {sessionStatus !== 'canceled' && sessionStatus !== 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isAnyMutating}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canMarkInProgress && (
                            <DropdownMenuItem onClick={() => onMarkInProgress(session.id)}>
                              <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                              Mark In Progress
                            </DropdownMenuItem>
                          )}
                          {canMarkCompleted && (
                            <DropdownMenuItem onClick={() => onMarkCompleted(session.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          {(canMarkInProgress || canMarkCompleted) && canReschedule && (
                            <DropdownMenuSeparator />
                          )}
                          {canReschedule && (
                            <DropdownMenuItem onClick={() => {
                              setReschedulingSessionId(session.id)
                              setRescheduleDate(session.start_time ? new Date(session.start_time) : undefined)
                              setRescheduleTime(session.start_time ? format(new Date(session.start_time), "HH:mm") : "09:00")
                            }}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Reschedule
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Click affordance */}
                  <div className="flex items-center justify-center">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </div>
              ) : (
                /* Workshop/Course layout */
                <div
                  onClick={(e) => handleRowClick(session.id, e)}
                  className={cn(
                    `hidden md:grid ${gridCols} gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-muted/30`,
                    sessionStatus === 'completed' && "opacity-70",
                    sessionStatus === 'canceled' && "opacity-50",
                  )}
                >
                  {/* # column */}
                  <div className="text-xs text-muted-foreground">
                    {isCourse ? `M${index + 1}` : `S${index + 1}`}
                  </div>

                  {/* Title */}
                  <div className="truncate text-sm">
                    {session.title || <span className="text-muted-foreground">&mdash;</span>}
                  </div>

                  {/* Date & Time */}
                  <div className="text-sm">
                    {session.start_time ? (
                      <span className={cn(
                        sessionIsPast && sessionStatus === 'scheduled' && "text-terracotta-600"
                      )}>
                        {format(new Date(session.start_time), "MMM d, yyyy")}
                        <span className="text-muted-foreground ml-1.5">
                          {format(new Date(session.start_time), "h:mm a")}
                          {session.end_time && ` - ${format(new Date(session.end_time), "h:mm a")}`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <Badge
                      variant={statusConfig.variant}
                      className={cn("text-xs px-1.5 py-0 h-5", statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Enrolled */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm tabular-nums">
                      {bookingCount}{session.max_participants ? `/${session.max_participants}` : ''}
                    </span>
                    {session.max_participants && session.max_participants > 0 && (
                      <Progress
                        value={Math.min((bookingCount / session.max_participants) * 100, 100)}
                        className="h-1 w-10"
                      />
                    )}
                  </div>

                  {/* Waitlist */}
                  <div className="text-sm">
                    {waitlistCount > 0 ? (
                      <span className="text-terracotta-600">{waitlistCount}</span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </div>

                  {/* Actions dropdown */}
                  <div data-no-navigate>
                    {sessionStatus !== 'canceled' && sessionStatus !== 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isAnyMutating}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canMarkInProgress && (
                            <DropdownMenuItem onClick={() => onMarkInProgress(session.id)}>
                              <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                              Mark In Progress
                            </DropdownMenuItem>
                          )}
                          {canMarkCompleted && (
                            <DropdownMenuItem onClick={() => onMarkCompleted(session.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          {(canMarkInProgress || canMarkCompleted) && canReschedule && (
                            <DropdownMenuSeparator />
                          )}
                          {canReschedule && (
                            <DropdownMenuItem onClick={() => {
                              setReschedulingSessionId(session.id)
                              setRescheduleDate(session.start_time ? new Date(session.start_time) : undefined)
                              setRescheduleTime(session.start_time ? format(new Date(session.start_time), "HH:mm") : "09:00")
                            }}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Reschedule
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Click affordance */}
                  <div className="flex items-center justify-center">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </div>
              )}

              {/* Mobile card */}
              <div
                onClick={(e) => handleRowClick(session.id, e)}
                className={cn(
                  "md:hidden p-4 cursor-pointer transition-colors hover:bg-muted/30 space-y-2",
                  sessionStatus === 'completed' && "opacity-70",
                  sessionStatus === 'canceled' && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!isIndividual && (
                      <Badge variant="outline" className="text-xs">
                        {isCourse ? `Module ${index + 1}` : `Session ${index + 1}`}
                      </Badge>
                    )}
                    <Badge
                      variant={statusConfig.variant}
                      className={cn("text-xs", statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div data-no-navigate>
                    {sessionStatus !== 'canceled' && sessionStatus !== 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isAnyMutating}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canMarkInProgress && (
                            <DropdownMenuItem onClick={() => onMarkInProgress(session.id)}>
                              <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                              Mark In Progress
                            </DropdownMenuItem>
                          )}
                          {canMarkCompleted && (
                            <DropdownMenuItem onClick={() => onMarkCompleted(session.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          {canReschedule && (
                            <DropdownMenuItem onClick={() => {
                              setReschedulingSessionId(session.id)
                              setRescheduleDate(session.start_time ? new Date(session.start_time) : undefined)
                              setRescheduleTime(session.start_time ? format(new Date(session.start_time), "HH:mm") : "09:00")
                            }}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Reschedule
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                {session.title && <p className="text-sm font-medium">{session.title}</p>}
                {session.start_time && (
                  <p className={cn(
                    "text-xs text-muted-foreground",
                    sessionIsPast && sessionStatus === 'scheduled' && "text-terracotta-600"
                  )}>
                    {format(new Date(session.start_time), "MMM d, yyyy 'at' h:mm a")}
                    {session.end_time && ` - ${format(new Date(session.end_time), "h:mm a")}`}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {isIndividual
                      ? `${bookingCount} client${bookingCount !== 1 ? 's' : ''} booked`
                      : `${bookingCount}${session.max_participants ? `/${session.max_participants}` : ''} enrolled`
                    }
                  </span>
                  {!isIndividual && waitlistCount > 0 && (
                    <span className="text-terracotta-600">+{waitlistCount} waitlisted</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  {sessionIsPast && sessionStatus === 'scheduled' ? (
                    <p className="text-xs text-terracotta-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Session date has passed
                    </p>
                  ) : <div />}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </div>

              {/* Inline reschedule form */}
              {isRescheduling && (
                <div className="px-4 pb-4" data-no-navigate>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-terracotta-700 bg-blush-50 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Rescheduling will notify {bookingCount} enrolled participant{bookingCount !== 1 ? 's' : ''}.</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn("w-full justify-start text-left font-normal", !rescheduleDate && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {rescheduleDate ? format(rescheduleDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={rescheduleDate}
                              onSelect={setRescheduleDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRescheduleSubmit(session.id, session)}
                        disabled={isAnyMutating || !rescheduleDate || !rescheduleTime}
                      >
                        {isAnyMutating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Reschedule & Notify
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReschedulingSessionId(null)
                          setRescheduleDate(undefined)
                          setRescheduleTime("09:00")
                        }}
                        disabled={isAnyMutating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
