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
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import type { BookingListReadable } from "@/src/client/types.gen"
import { format, parseISO, isPast, isFuture } from "date-fns"
import Link from "next/link"

// Mock data for schedule
const mockSchedule = (() => {
  // Get current date
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentDate = today.getDate()

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  return [
    {
      id: "booking-123",
      title: "Mindfulness Meditation Session",
      clientName: "Emma Thompson",
      clientAvatar: "/extraterrestrial-encounter.png",
      date: formatDate(new Date(currentYear, currentMonth, currentDate)),
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      type: "session",
      location: "Virtual",
      status: "upcoming",
    },
    {
      id: "booking-456",
      title: "Career Coaching Session",
      clientName: "Michael Chen",
      clientAvatar: "/microphone-crowd.png",
      date: formatDate(new Date(currentYear, currentMonth, currentDate + 1)),
      startTime: "2:00 PM",
      endTime: "3:30 PM",
      type: "session",
      location: "In-Person",
      status: "upcoming",
    },
    {
      id: "booking-789",
      title: "Yoga for Stress Relief Workshop",
      clientName: "Multiple Attendees (8)",
      clientAvatar: null,
      date: formatDate(new Date(currentYear, currentMonth, currentDate + 2)),
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      type: "workshop",
      location: "Virtual",
      status: "upcoming",
    },
    {
      id: "booking-101",
      title: "Nutritional Consultation",
      clientName: "David Wilson",
      clientAvatar: "/abstract-dw.png",
      date: formatDate(new Date(currentYear, currentMonth, currentDate - 3)),
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      type: "session",
      location: "Virtual",
      status: "completed",
    },
    {
      id: "booking-102",
      title: "Life Coaching Course",
      clientName: "Multiple Attendees (12)",
      clientAvatar: null,
      date: formatDate(new Date(currentYear, currentMonth, currentDate - 4)),
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      type: "course",
      location: "Virtual",
      status: "completed",
    },
    {
      id: "booking-103",
      title: "Group Therapy Session",
      clientName: "Multiple Attendees (6)",
      clientAvatar: null,
      date: formatDate(new Date(currentYear, currentMonth, currentDate - 5)),
      startTime: "3:00 PM",
      endTime: "4:30 PM",
      type: "workshop",
      location: "In-Person",
      status: "canceled",
    },
  ]
})()

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
  if (!booking.start_time || (booking.status !== "confirmed" && booking.status !== "in_progress")) return false

  const now = new Date()
  const startTime = parseISO(booking.start_time)
  const endTime = booking.end_time ? parseISO(booking.end_time) : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)

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

  // Build query params (matching bookings list)
  const getQueryParams = () => {
    const params: any = {
      practitioner_id: user?.practitionerId,
      ordering: '-created_at', // Most recent bookings first
      page_size: 100
    }

    // Service type filter
    if (serviceTypeFilter !== "all") {
      params.service__service_type_code = serviceTypeFilter
    }

    // Status filter (only apply if not filtered by tab)
    if (statusFilter !== "all" && !["upcoming", "canceled", "past"].includes(selectedTab)) {
      params.status = statusFilter
    }

    // Search term
    if (searchTerm) {
      params.search = searchTerm
    }

    return params
  }

  // Fetch bookings from API
  const { data: bookingsData, isLoading, error } = useQuery(
    bookingsListOptions({
      query: getQueryParams()
    })
  )

  const bookings = bookingsData?.results || []

  // Filter bookings based on selected tab (matching bookings list)
  const filteredBookings = bookings.filter((booking: any) => {
    if (selectedTab === "all") return true

    if (selectedTab === "upcoming") {
      return booking.status === "confirmed" && booking.start_time && isFuture(parseISO(booking.start_time))
    } else if (selectedTab === "past") {
      return booking.status === "completed" || (booking.start_time && isPast(parseISO(booking.start_time)))
    } else if (selectedTab === "canceled") {
      return booking.status === "cancelled" || booking.status === "canceled"
    }

    return true
  })

  // Transform booking data to match the component's expected format
  const transformedSchedule = filteredBookings.map((booking: BookingListReadable) => ({
    id: booking.id?.toString() || '',
    title: booking.service?.name || 'Unknown Service',
    clientName: booking.user?.full_name || booking.user?.email || 'Unknown Client',
    clientAvatar: booking.user?.avatar_url,
    date: booking.start_time ? new Date(booking.start_time).toISOString().split('T')[0] : '',
    startTime: booking.start_time ? new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
    endTime: booking.end_time ? new Date(booking.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
    type: booking.service?.service_type_code || 'session',
    location: booking.service?.location_type === 'virtual' ? 'Virtual' : 'In-Person',
    status: booking.status || 'unknown',
    booking: booking // Keep full booking data for detail view
  }))

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
        <p className="text-muted-foreground">Failed to load bookings</p>
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
                placeholder="Search bookings..."
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
                {selectedTab === "upcoming" && "No upcoming bookings"}
                {selectedTab === "past" && "No past bookings"}
                {selectedTab === "canceled" && "No canceled bookings"}
                {selectedTab === "all" && "No bookings found"}
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
  booking?: any
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
            <TableHead>Client</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const booking = event.booking

            return (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={event.clientAvatar || ""} alt={event.clientName || ""} />
                      <AvatarFallback>
                        {(event.clientName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{event.clientName}</p>
                      <p className="text-sm text-muted-foreground">{booking?.user?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getServiceTypeIcon(event.type)}
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {event.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p>
                        {event.date && format(parseISO(event.date), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.startTime} - {event.endTime}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[event.status as keyof typeof statusVariants] || "secondary"}>
                    {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>${booking?.total_amount || "0.00"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Inline Join Button for virtual sessions */}
                    {event.location === "Virtual" &&
                     booking?.room?.public_uuid &&
                     (event.status === "confirmed" || event.status === "in_progress") && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button
                                variant={isSessionJoinable(booking) ? "default" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isSessionJoinable(booking)) {
                                    router.push(`/room/${booking.room.public_uuid}/lobby`)
                                  }
                                }}
                                disabled={!isSessionJoinable(booking)}
                                className={isSessionJoinable(booking) ? "bg-sage-600 hover:bg-sage-700" : ""}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Join
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isSessionJoinable(booking)
                              ? "Click to join the session"
                              : "Join will be available 15 minutes before session start"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/practitioner/bookings/${event.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {event.status === "confirmed" && (
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
