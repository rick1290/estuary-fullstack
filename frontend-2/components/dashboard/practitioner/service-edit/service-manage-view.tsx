"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  serviceSessionsListOptions,
  serviceSessionsMarkCompletedCreateMutation,
  serviceSessionsMarkInProgressCreateMutation,
  serviceSessionsRescheduleCreateMutation,
  servicesPartialUpdateMutation,
  servicesRetrieveOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Users, Star, Calendar as CalendarIcon, DollarSign, Eye, Clock,
  TrendingUp, CheckCircle2, PlayCircle, CalendarClock,
  ExternalLink, ArrowRight, Loader2, MoreVertical,
  AlertTriangle, CalendarPlus, Archive, Package, Settings,
} from "lucide-react"
import { format, formatDistanceToNow, isPast, isFuture, setHours, setMinutes } from "date-fns"
import { cn } from "@/lib/utils"
import { getServiceDetailUrl } from "@/lib/service-utils"
import type { ServiceDetailReadable as ServiceReadable } from "@/src/client/types.gen"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Session status styling (shared with ServiceSessionsSection)
const SESSION_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Draft", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default", className: "bg-blue-600" },
  completed: { label: "Completed", variant: "default", className: "bg-green-600" },
  canceled: { label: "Canceled", variant: "destructive" },
}

interface ServiceManageViewProps {
  service: ServiceReadable
  onNavigateToSettings: (sectionId?: string) => void
}

export function ServiceManageView({ service, onNavigateToSettings }: ServiceManageViewProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const isWorkshop = service.service_type_code === 'workshop'
  const isCourse = service.service_type_code === 'course'
  const isSession = service.service_type_code === 'session'
  const isBundle = service.service_type_code === 'bundle'
  const isPackage = service.service_type_code === 'package'
  const hasScheduledSessions = isWorkshop || isCourse

  // Reschedule state
  const [reschedulingSessionId, setReschedulingSessionId] = useState<number | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>()
  const [rescheduleTime, setRescheduleTime] = useState("09:00")

  // Fetch sessions for courses/workshops
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    ...serviceSessionsListOptions({ query: { service_id: service.id } }),
    enabled: hasScheduledSessions && !!service.id,
  })

  const sessions = sessionsData?.results || []

  // Session stats
  const completedSessions = sessions.filter((s: any) => s.status === 'completed').length
  const inProgressSessions = sessions.filter((s: any) => s.status === 'in_progress').length
  const scheduledSessions = sessions.filter((s: any) => s.status === 'scheduled' || s.status === 'draft').length
  const totalSessions = sessions.length

  // Next upcoming session
  const upcomingSessions = sessions
    .filter((s: any) => s.start_time && isFuture(new Date(s.start_time)))
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const nextSession = upcomingSessions[0]

  // Capacity across all sessions
  const totalBooked = sessions.reduce((sum: number, s: any) => sum + parseInt(s.booking_count || '0'), 0)
  const totalCapacity = sessions.reduce((sum: number, s: any) => sum + (s.max_participants || 0), 0)
  const capacityPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0

  // Service-level stats
  const totalBookings = parseInt(String(service.total_bookings || '0'))
  const avgRating = parseFloat(String(service.average_rating || '0'))
  const totalReviews = parseInt(String(service.total_reviews || '0'))
  const waitlistCount = parseInt(String(service.waitlist_count || '0'))
  const price = parseFloat(String(service.price || '0'))

  // Mutations
  const invalidateSessions = () => {
    queryClient.invalidateQueries({
      queryKey: serviceSessionsListOptions({ query: { service_id: service.id } }).queryKey
    })
  }

  const invalidateService = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] })
    queryClient.invalidateQueries({
      queryKey: servicesRetrieveOptions({ path: { id: service.id! } }).queryKey
    })
  }

  const markCompletedMutation = useMutation({
    ...serviceSessionsMarkCompletedCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session completed", description: "Session has been marked as completed." })
      invalidateSessions()
      invalidateService()
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
      invalidateService()
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
      invalidateService()
      setReschedulingSessionId(null)
      setRescheduleDate(undefined)
      setRescheduleTime("09:00")
    },
    onError: (error: any) => {
      toast({ title: "Reschedule failed", description: error?.body?.detail || error?.message || "Could not reschedule session", variant: "destructive" })
    }
  })

  const archiveMutation = useMutation({
    ...servicesPartialUpdateMutation(),
    onSuccess: () => {
      toast({ title: "Service archived", description: "This service has been archived." })
      invalidateService()
    },
    onError: (error: any) => {
      toast({ title: "Archive failed", description: error?.message || "Could not archive service", variant: "destructive" })
    }
  })

  const isAnyMutating = markCompletedMutation.isPending || markInProgressMutation.isPending || rescheduleMutation.isPending

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

  const handleReschedule = (sessionId: number, session: any) => {
    if (!rescheduleDate || !rescheduleTime) return
    const [hours, minutes] = rescheduleTime.split(':').map(Number)
    const startTime = setMinutes(setHours(rescheduleDate, hours), minutes)
    const originalDuration = (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000
    const endTime = new Date(startTime.getTime() + originalDuration * 60000)

    rescheduleMutation.mutate({
      path: { id: String(sessionId) },
      body: {
        service: service.id!,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 space-y-6">

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Bookings */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {isSession ? 'Bookings' : 'Enrolled'}
            </span>
          </div>
          <p className="font-serif text-2xl text-olive-900">{totalBookings}</p>
          {waitlistCount > 0 && (
            <p className="text-[11px] text-amber-600 mt-0.5">
              +{waitlistCount} waitlisted
            </p>
          )}
        </Card>

        {/* Rating */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Rating</span>
          </div>
          {avgRating > 0 ? (
            <>
              <p className="font-serif text-2xl text-olive-900">{avgRating.toFixed(1)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          )}
        </Card>

        {/* Revenue estimate */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Est. Revenue</span>
          </div>
          <p className="font-serif text-2xl text-olive-900">
            ${(totalBookings * price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ${price} x {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
          </p>
        </Card>

        {/* Capacity / Duration / Sold */}
        {hasScheduledSessions ? (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Capacity</span>
            </div>
            {totalCapacity > 0 ? (
              <>
                <p className="font-serif text-2xl text-olive-900">{capacityPercent}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalBooked}/{totalCapacity} spots filled
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No limit set</p>
            )}
          </Card>
        ) : (isBundle || isPackage) ? (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Sold</span>
            </div>
            <p className="font-serif text-2xl text-olive-900">{totalBookings}</p>
            {isBundle && service.sessions_included && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {service.sessions_included} sessions included
              </p>
            )}
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Duration</span>
            </div>
            <p className="font-serif text-2xl text-olive-900">
              {service.duration_minutes || '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">minutes per session</p>
          </Card>
        )}
      </div>

      {/* Workshop/Course — Session Operations */}
      {hasScheduledSessions && (
        <>
          {/* Progress bar */}
          {totalSessions > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-olive-600" />
                  {isCourse ? 'Course Progress' : 'Session Delivery'}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {completedSessions}/{totalSessions} {isCourse ? 'modules' : 'sessions'} complete
                </span>
              </div>
              <Progress
                value={totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}
                className="h-2 mb-3"
              />
              <div className="flex items-center gap-4 text-xs">
                {completedSessions > 0 && (
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {completedSessions} completed
                  </span>
                )}
                {inProgressSessions > 0 && (
                  <span className="flex items-center gap-1 text-blue-700">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {inProgressSessions} in progress
                  </span>
                )}
                {scheduledSessions > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {scheduledSessions} upcoming
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Session Cards */}
          {sessionsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : totalSessions > 0 ? (
            <div className="space-y-2">
              {sessions.map((session: any, index: number) => {
                const bookingCount = parseInt(session.booking_count || '0')
                const sessionStatus = session.status || 'scheduled'
                const statusConfig = SESSION_STATUS_CONFIG[sessionStatus] || SESSION_STATUS_CONFIG.scheduled
                const sessionIsPast = session.start_time && isPast(new Date(session.end_time || session.start_time))
                const canMarkInProgress = sessionStatus === 'scheduled' || sessionStatus === 'draft'
                const canMarkCompleted = sessionStatus === 'in_progress' || (sessionStatus === 'scheduled' && sessionIsPast)
                const hasBookings = bookingCount > 0
                const canReschedule = hasBookings && (sessionStatus === 'scheduled' || sessionStatus === 'draft')
                const isRescheduling = reschedulingSessionId === session.id

                return (
                  <Card key={session.id} className={cn(
                    "p-4",
                    sessionStatus === 'completed' && "opacity-75",
                    sessionStatus === 'canceled' && "opacity-50",
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Header */}
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
                            <span className="font-medium text-sm">{session.title}</span>
                          )}
                        </div>

                        {/* Date/time */}
                        {session.start_time && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(session.start_time), "PPP")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(session.start_time), "p")}
                              {session.end_time && ` - ${format(new Date(session.end_time), "p")}`}
                            </div>
                          </div>
                        )}

                        {/* Enrollment bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {bookingCount}{session.max_participants ? `/${session.max_participants}` : ''} enrolled
                          </div>
                          {session.max_participants && session.max_participants > 0 && (
                            <Progress
                              value={Math.min((bookingCount / session.max_participants) * 100, 100)}
                              className="h-1.5 w-24"
                            />
                          )}
                          {session.waitlist_count && parseInt(session.waitlist_count) > 0 && (
                            <span className="text-xs text-amber-600">
                              +{session.waitlist_count} waitlisted
                            </span>
                          )}
                        </div>

                        {/* Past session hint */}
                        {sessionIsPast && sessionStatus === 'scheduled' && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            This session&apos;s date has passed
                          </p>
                        )}

                        {/* Inline reschedule form */}
                        {isRescheduling && (
                          <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>Rescheduling will notify {bookingCount} enrolled participant{bookingCount !== 1 ? 's' : ''}.</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
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
                                onClick={() => handleReschedule(session.id, session)}
                                disabled={rescheduleMutation.isPending || !rescheduleDate || !rescheduleTime}
                              >
                                {rescheduleMutation.isPending ? (
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
                                disabled={rescheduleMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action dropdown */}
                      {sessionStatus !== 'canceled' && sessionStatus !== 'completed' && !isRescheduling && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isAnyMutating}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canMarkInProgress && (
                              <DropdownMenuItem onClick={() => handleMarkInProgress(session.id)}>
                                <PlayCircle className="mr-2 h-4 w-4 text-blue-600" />
                                Mark In Progress
                              </DropdownMenuItem>
                            )}
                            {canMarkCompleted && (
                              <DropdownMenuItem onClick={() => handleMarkCompleted(session.id)}>
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
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="p-6 border-dashed text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No sessions have been added yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToSettings("service-sessions")}
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Add Sessions in Settings
              </Button>
            </Card>
          )}

          {/* Link to add more sessions */}
          {totalSessions > 0 && (
            <button
              onClick={() => onNavigateToSettings("service-sessions")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Add or edit sessions in Settings
            </button>
          )}
        </>
      )}

      {/* Session (1:1) — Simple info */}
      {isSession && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100">
              <CalendarIcon className="h-4 w-4 text-sage-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">1:1 Session Service</h4>
              <p className="text-sm text-muted-foreground">
                Clients book from your availability schedule. Sessions are booked individually based on your open time slots.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Badge variant={service.is_purchasable ? "default" : "secondary"}>
                  {service.is_purchasable ? "Bookable" : "Not bookable"}
                </Badge>
                {service.schedule?.name && (
                  <span className="text-xs text-muted-foreground">
                    Schedule: {service.schedule.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bundle/Package — Sold summary */}
      {(isBundle || isPackage) && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100">
              <Package className="h-4 w-4 text-sage-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{isBundle ? 'Session Bundle' : 'Service Package'}</h4>
              <p className="text-sm text-muted-foreground">
                {isBundle
                  ? `This bundle includes ${service.sessions_included || '—'} sessions. ${totalBookings} sold so far.`
                  : `This package combines multiple services. ${totalBookings} sold so far.`
                }
              </p>
              <Badge variant={service.is_purchasable ? "default" : "secondary"} className="mt-1">
                {service.is_purchasable ? "Purchasable" : "Not purchasable"}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Ended Service Alert */}
      {service.has_ended && service.status === 'active' && hasScheduledSessions && (
        <Card className="border-2 border-terracotta-200 bg-terracotta-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100">
                <AlertTriangle className="h-5 w-5 text-terracotta-600" />
              </div>
              <div>
                <h3 className="font-semibold text-terracotta-900">All sessions have ended</h3>
                <p className="text-sm text-terracotta-700">
                  Add new dates to continue offering this service, or archive it.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="border-terracotta-300 text-terracotta-700 hover:bg-terracotta-100"
                onClick={() => onNavigateToSettings("service-sessions")}
              >
                <CalendarPlus className="h-4 w-4 mr-1.5" />
                Add Dates in Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-terracotta-300 text-terracotta-700 hover:bg-terracotta-100"
                onClick={() => {
                  archiveMutation.mutate({
                    path: { id: service.id! },
                    body: { status: 'archived', is_active: false, is_public: false },
                  })
                }}
                disabled={archiveMutation.isPending}
              >
                {archiveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4 mr-1.5" />
                )}
                Archive
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start h-9" asChild>
            <Link href={getServiceDetailUrl(service)} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5 mr-2" />
              View Public Page
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="justify-start h-9" asChild>
            <Link href={`/dashboard/practitioner/bookings?search=${encodeURIComponent(service.name || '')}`}>
              <Users className="h-3.5 w-3.5 mr-2" />
              View Bookings
              <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
            </Link>
          </Button>
          {hasScheduledSessions && (
            <Button variant="outline" size="sm" className="justify-start h-9" asChild>
              <Link href={`/dashboard/practitioner/schedule?search=${encodeURIComponent(service.name || '')}`}>
                <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                View in Schedule
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
              </Link>
            </Button>
          )}
          {service.status === 'active' && (
            <Button variant="outline" size="sm" className="justify-start h-9" asChild>
              <Link href={`/dashboard/practitioner/finances/transactions?search=${encodeURIComponent(service.name || '')}`}>
                <DollarSign className="h-3.5 w-3.5 mr-2" />
                View Transactions
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
              </Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
