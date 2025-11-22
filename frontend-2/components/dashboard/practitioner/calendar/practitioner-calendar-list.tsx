"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { MoreVertical, Calendar, Clock, User, Users, Video, MapPin, Loader2, Search, Filter, Play, BookOpen, SpadeIcon as Spa } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calendarListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { format, parseISO, isPast, isFuture } from "date-fns"
import Link from "next/link"

// Service type configuration (matching bookings list)
const serviceTypeConfig = {
  session: { label: "Session", icon: User, color: "primary" },
  workshop: { label: "Workshop", icon: Users, color: "secondary" },
  course: { label: "Course", icon: BookOpen, color: "success" },
}

// Status badge variant mapping
const statusVariants = {
  confirmed: "success" as const,
  pending: "secondary" as const,
  pending_payment: "warning" as const,
  cancelled: "destructive" as const,
  canceled: "destructive" as const,
  completed: "outline" as const,
  in_progress: "default" as const,
}

// Check if a session can be joined (matching bookings list logic)
const isSessionJoinable = (booking: any) => {
  if (!booking.service_session?.start_time || (booking.status !== "confirmed" && booking.status !== "in_progress")) return false

  const now = new Date()
  const startTime = parseISO(booking.service_session?.start_time)
  const endTime = booking.service_session?.end_time ? parseISO(booking.service_session?.end_time) : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)

  // Allow joining 15 minutes before start and until the session ends
  const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000)

  return now >= joinWindowStart && now < endTime
}

export default function PractitionerCalendarList() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Build query params for calendar events API
  const getQueryParams = () => {
    const params: any = {}

    // Service type filter
    if (serviceTypeFilter !== "all") {
      params.service_type = serviceTypeFilter
    }

    // Status filter (only apply if not filtered by tab)
    if (statusFilter !== "all" && !["upcoming", "canceled", "past"].includes(selectedTab)) {
      params.status = statusFilter
    }

    return params
  }

  // Fetch calendar events from API
  const { data: calendarEvents, isLoading, error } = useQuery(
    calendarListOptions({
      query: getQueryParams()
    })
  )

  const events = calendarEvents || []

  // Filter events based on selected tab and search term
  const filteredEvents = events.filter((event: any) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const serviceName = event.service?.name?.toLowerCase() || ''

      // For service sessions, search in attendees
      if (event.event_type === 'service_session') {
        const attendeeMatch = event.attendees?.some((attendee: any) =>
          attendee.full_name?.toLowerCase().includes(searchLower) ||
          attendee.email?.toLowerCase().includes(searchLower)
        )
        if (!serviceName.includes(searchLower) && !attendeeMatch) return false
      }
      // For individual bookings, search in client
      else if (event.event_type === 'individual_booking') {
        const clientName = event.client?.full_name?.toLowerCase() || ''
        const clientEmail = event.client?.email?.toLowerCase() || ''
        if (!serviceName.includes(searchLower) && !clientName.includes(searchLower) && !clientEmail.includes(searchLower)) {
          return false
        }
      }
    }

    // Tab filter
    if (selectedTab === "all") return true

    if (selectedTab === "upcoming") {
      return event.status === "confirmed" && event.start_time && isFuture(parseISO(event.start_time))
    } else if (selectedTab === "past") {
      return event.status === "completed" || (event.start_time && isPast(parseISO(event.start_time)))
    } else if (selectedTab === "canceled") {
      return event.status === "cancelled" || event.status === "canceled"
    }

    return true
  })

  // Transform calendar event data to match the component's expected format
  const transformedSchedule = filteredEvents.map((event: any) => {
    const isGroupedEvent = event.event_type === 'service_session' || event.event_type === 'grouped_booking'

    return {
      id: isGroupedEvent
        ? (event.service_session_id?.toString() || event.attendees?.[0]?.booking_id?.toString())
        : event.booking_id?.toString(),
      title: event.service?.name || 'Unknown Service',
      clientName: isGroupedEvent
        ? `Multiple Attendees (${event.attendee_count})`
        : (event.client?.full_name || event.client?.email || 'Unknown Client'),
      clientAvatar: isGroupedEvent ? null : event.client?.avatar_url,
      date: event.start_time ? new Date(event.start_time).toISOString().split('T')[0] : '',
      startTime: event.start_time ? new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      endTime: event.end_time ? new Date(event.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      type: event.service?.service_type_code || 'session',
      location: event.service?.location_type === 'virtual' ? 'Virtual' : 'In-Person',
      status: event.status || 'unknown',
      event: event, // Keep full event data for detail view and join functionality
      event_type: event.event_type
    }
  })

  const handleViewDetails = (eventId: string) => {
    router.push(`/dashboard/practitioner/bookings/${eventId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load calendar events</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-sage-100 p-1 rounded-lg">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Past
            </TabsTrigger>
            <TabsTrigger value="canceled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Canceled
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>

            {/* Service Type Filter */}
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="session">Sessions</SelectItem>
                <SelectItem value="workshop">Workshops</SelectItem>
                <SelectItem value="course">Courses</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            {!["upcoming", "canceled", "past"].includes(selectedTab) && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Table Content */}
        <TabsContent value={selectedTab} className="mt-4">
          {transformedSchedule.length === 0 ? (
            <div className="rounded-md border p-8 text-center">
              <p className="text-muted-foreground">
                {selectedTab === "upcoming" && "No upcoming events"}
                {selectedTab === "past" && "No past events"}
                {selectedTab === "canceled" && "No canceled events"}
                {selectedTab === "all" && "No calendar events found"}
              </p>
            </div>
          ) : (
            <ScheduleTable events={transformedSchedule} onViewDetails={handleViewDetails} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ScheduleEvent {
  id: string
  title: string
  clientName: string
  clientAvatar?: string | null
  date: string
  startTime: string
  endTime: string
  type: string
  location: string
  status: string
  event?: any // Full calendar event data
  event_type?: string // 'service_session' or 'individual_booking'
}

function ScheduleTable({
  events,
  onViewDetails,
}: { events: ScheduleEvent[]; onViewDetails: (id: string) => void }) {
  const router = useRouter()

  const getServiceTypeIcon = (type: string) => {
    const config = serviceTypeConfig[type as keyof typeof serviceTypeConfig]
    const Icon = config?.icon || Spa
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((scheduleEvent) => {
            const calendarEvent = scheduleEvent.event
            const isServiceSession = scheduleEvent.event_type === 'service_session'
            const hasRecordings = calendarEvent?.recordings && calendarEvent.recordings.length > 0
            const isVirtual = calendarEvent?.service?.location_type === 'virtual'
            const attendeeName = isServiceSession
              ? calendarEvent?.attendees?.[0]?.full_name
              : calendarEvent?.client?.full_name
            const attendeeCount = calendarEvent?.attendee_count || 1

            const detailsUrl = isServiceSession
              ? `/dashboard/practitioner/sessions/${scheduleEvent.id}`
              : `/dashboard/practitioner/bookings/${scheduleEvent.id}`

            return (
              <TableRow
                key={scheduleEvent.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(detailsUrl)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isVirtual ? (
                        <Video className="h-4 w-4 text-sage-600" />
                      ) : (
                        <MapPin className="h-4 w-4 text-terracotta-600" />
                      )}
                      {getServiceTypeIcon(scheduleEvent.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{scheduleEvent.title}</p>
                        {hasRecordings && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            <Play className="h-2.5 w-2.5 mr-0.5" />
                            Recording
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                          {scheduleEvent.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {attendeeName ? (
                            <>with {attendeeName}</>
                          ) : attendeeCount > 1 ? (
                            <>{attendeeCount} attendees</>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p>
                        {scheduleEvent.date && format(parseISO(scheduleEvent.date), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scheduleEvent.startTime} - {scheduleEvent.endTime}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[scheduleEvent.status as keyof typeof statusVariants] || "secondary"}>
                    {scheduleEvent.status?.charAt(0).toUpperCase() + scheduleEvent.status?.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Inline Join Button for virtual sessions */}
                    {scheduleEvent.location === "Virtual" &&
                     calendarEvent?.room?.public_uuid &&
                     (scheduleEvent.status === "confirmed" || scheduleEvent.status === "in_progress") && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button
                                variant={isSessionJoinable(calendarEvent) ? "default" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isSessionJoinable(calendarEvent)) {
                                    router.push(`/room/${calendarEvent.room.public_uuid}/lobby`)
                                  }
                                }}
                                disabled={!isSessionJoinable(calendarEvent)}
                                className={isSessionJoinable(calendarEvent) ? "bg-sage-600 hover:bg-sage-700" : ""}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Join
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSessionJoinable(calendarEvent)
                              ? "Click to join the session"
                              : "Join will be available 15 minutes before session start"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          {isServiceSession ? (
                            <Link href={`/dashboard/practitioner/sessions/${scheduleEvent.id}`}>
                              View Details
                            </Link>
                          ) : (
                            <Link href={`/dashboard/practitioner/bookings/${scheduleEvent.id}`}>
                              View Details
                            </Link>
                          )}
                        </DropdownMenuItem>
                        {scheduleEvent.status === "confirmed" && !isServiceSession && (
                          <>
                            <DropdownMenuItem>Reschedule</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Cancel Booking</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
