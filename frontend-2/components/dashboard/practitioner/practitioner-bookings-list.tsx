"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, MoreVertical, User, Loader2, Search, Filter, Users, SpadeIcon as Spa, BookOpen, Video, Play, CalendarCheck, Sparkles } from "lucide-react"
import { format, parseISO, startOfWeek, endOfWeek, isAfter, isPast, isFuture } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import DashboardEmptyState from "@/components/dashboard/practitioner/empty-states/dashboard-empty-state"

// Status badge variant mapping
const statusVariants = {
  confirmed: "success" as const,
  pending: "secondary" as const,
  pending_payment: "warning" as const,
  cancelled: "destructive" as const,
  canceled: "destructive" as const,
  completed: "outline" as const,
}

// Service type configuration
const serviceTypeConfig = {
  session: { label: "Session", icon: User, color: "primary" },
  workshop: { label: "Workshop", icon: Users, color: "secondary" },
  course: { label: "Course", icon: BookOpen, color: "success" },
}

// Check if a session can be joined
const isSessionJoinable = (booking: any) => {
  const sessionStartTime = booking.service_session?.start_time
  const sessionEndTime = booking.service_session?.end_time
  if (!sessionStartTime || (booking.status !== "confirmed" && booking.status !== "in_progress")) return false

  const now = new Date()
  const startTime = parseISO(sessionStartTime)
  const endTime = sessionEndTime ? parseISO(sessionEndTime) : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)

  // Allow joining 15 minutes before start and until the session ends
  const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000)

  return now >= joinWindowStart && now < endTime
}

export default function PractitionerBookingsList() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Build query params based on filters
  const queryParams = useMemo(() => {
    const params: any = {
      practitioner_id: user?.practitionerId,
      ordering: "-created_at", // Most recent bookings first
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
  }, [selectedTab, serviceTypeFilter, statusFilter, searchTerm, user])
  
  // Fetch bookings from API
  const { data, isLoading, error } = useQuery({
    ...bookingsListOptions({
      query: queryParams
    }),
    enabled: !!user?.practitionerId
  })

  const bookings = data?.results || []

  // Filter bookings based on selected tab
  const filteredBookings = useMemo(() => {
    let filtered = bookings

    // Filter by tab
    if (selectedTab !== "all") {
      filtered = filtered.filter((booking: any) => {
        const sessionStartTime = booking.service_session?.start_time
        if (selectedTab === "upcoming") {
          return booking.status === "confirmed" && sessionStartTime && isFuture(parseISO(sessionStartTime))
        } else if (selectedTab === "past") {
          return booking.status === "completed" || (sessionStartTime && isPast(parseISO(sessionStartTime)))
        } else if (selectedTab === "canceled") {
          return booking.status === "cancelled" || booking.status === "canceled"
        }
        return true
      })
    }

    return filtered
  }, [bookings, selectedTab])

  const formatTime = (startTime: string | null | undefined, duration?: number) => {
    if (!startTime) return "Not scheduled"
    try {
      const start = parseISO(startTime)
      const startStr = format(start, "h:mm a")
      if (duration) {
        const end = new Date(start.getTime() + duration * 60000)
        const endStr = format(end, "h:mm a")
        return `${startStr} - ${endStr}`
      }
      return startStr
    } catch {
      return startTime
    }
  }

  const getServiceTypeIcon = (type: string) => {
    const config = serviceTypeConfig[type as keyof typeof serviceTypeConfig]
    const Icon = config?.icon || Spa
    return <Icon className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load bookings. Please try again later.
        </AlertDescription>
      </Alert>
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
          {filteredBookings.length === 0 ? (
            bookings.length === 0 && selectedTab === "all" ? (
              <DashboardEmptyState
                icon={CalendarCheck}
                title="No bookings yet"
                description="Once you create services and set your availability, clients will be able to book with you. Start by creating your first service."
                cta={{ label: "Create a Service", href: "/dashboard/practitioner/services/create" }}
                secondaryCta={{ label: "Set Availability", href: "/dashboard/practitioner/availability" }}
                iconColorClass="text-terracotta-600"
                iconBgClass="bg-terracotta-100"
              />
            ) : (
              <div className="rounded-md border p-8 text-center">
                <p className="text-muted-foreground">
                  {selectedTab === "upcoming" && "No upcoming bookings"}
                  {selectedTab === "past" && "No past bookings"}
                  {selectedTab === "canceled" && "No canceled bookings"}
                  {selectedTab === "all" && "No bookings match your filters"}
                </p>
              </div>
            )
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={booking.user?.avatar_url || ""} alt={booking.user?.full_name || ""} />
                            <AvatarFallback>
                              {(booking.user?.full_name || booking.user?.email || "U")
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{booking.user?.full_name || booking.user?.email || "Unknown"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getServiceTypeIcon(booking.service?.service_type_code || "session")}
                          <div>
                            <p className="font-medium">{booking.service?.name || "Unknown Service"}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {booking.service?.service_type_code?.replace(/_/g, " ") || "Session"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p>{booking.service_session?.start_time ? format(parseISO(booking.service_session.start_time), "MMM d, yyyy") : "Not scheduled"}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(booking.service_session?.start_time, booking.duration_minutes)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[booking.status as keyof typeof statusVariants] || "secondary"}>
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Inline Join Button for virtual sessions */}
                          {booking.service?.location_type === "virtual" &&
                           booking.room?.public_uuid &&
                           (booking.status === "confirmed" || booking.status === "in_progress") && (
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
                                <Link href={`/dashboard/practitioner/bookings/${booking.id}`}>
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {booking.status === "confirmed" && (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}