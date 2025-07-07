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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, MoreVertical, User, Loader2, Search, Filter, Users, SpadeIcon as Spa, BookOpen, Video } from "lucide-react"
import { format, parseISO, startOfWeek, endOfWeek, isAfter } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

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
  if (!booking.start_time || (booking.status !== "confirmed" && booking.status !== "in_progress")) return false
  
  const now = new Date()
  const startTime = parseISO(booking.start_time)
  const endTime = booking.end_time ? parseISO(booking.end_time) : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)
  
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
      ordering: "-start_time",
      page_size: 50
    }

    // Tab filters
    const now = new Date()
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 })

    switch (selectedTab) {
      case "new_this_week":
        params.created_at__gte = startOfThisWeek.toISOString()
        params.created_at__lte = endOfThisWeek.toISOString()
        break
      case "upcoming":
        params.status = "confirmed"
        params.start_time__gte = now.toISOString()
        break
      case "canceled":
        params.status = "cancelled,canceled"
        break
      // 'all' has no additional filters
    }

    // Service type filter
    if (serviceTypeFilter !== "all") {
      params.service__service_type_code = serviceTypeFilter
    }

    // Status filter (only apply if not already filtered by tab)
    if (statusFilter !== "all" && !["upcoming", "canceled"].includes(selectedTab)) {
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

  // Filter bookings for "New This Week" tab locally if API doesn't support it
  const filteredBookings = useMemo(() => {
    if (selectedTab === "new_this_week") {
      const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
      return bookings.filter(booking => {
        const createdDate = parseISO(booking.created_at)
        return isAfter(createdDate, startOfThisWeek)
      })
    }
    return bookings
  }, [bookings, selectedTab])

  const formatTime = (startTime: string, duration?: number) => {
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
                <TableHead>Price</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
            <TabsTrigger value="new_this_week" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              New This Week
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Upcoming
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
            {!["upcoming", "canceled"].includes(selectedTab) && (
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
            <div className="rounded-md border p-8 text-center">
              <p className="text-muted-foreground">
                {selectedTab === "new_this_week" && "No new bookings this week"}
                {selectedTab === "upcoming" && "No upcoming bookings"}
                {selectedTab === "canceled" && "No canceled bookings"}
                {selectedTab === "all" && "No bookings found"}
              </p>
            </div>
          ) : (
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
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={booking.user?.avatar_url || ""} alt={booking.user?.full_name || ""} />
                            <AvatarFallback>
                              {(booking.user?.full_name || booking.user?.email || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{booking.user?.full_name || booking.user?.email || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
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
                            <p>{format(parseISO(booking.start_time), "MMM d, yyyy")}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(booking.start_time, booking.duration_minutes)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[booking.status as keyof typeof statusVariants] || "secondary"}>
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>${booking.total_amount || "0.00"}</TableCell>
                      <TableCell className="text-right">
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
                            {/* Join button for virtual sessions */}
                            {booking.service?.location_type === "virtual" && booking.livekit_room && (
                              <DropdownMenuItem asChild>
                                {isSessionJoinable(booking) ? (
                                  <Link 
                                    href={`/room/${booking.livekit_room.public_uuid}/lobby`}
                                    className="flex items-center gap-2 text-primary"
                                  >
                                    <Video className="h-4 w-4" />
                                    Join Session
                                  </Link>
                                ) : (
                                  <span className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                                    <Video className="h-4 w-4" />
                                    Join Session
                                  </span>
                                )}
                              </DropdownMenuItem>
                            )}
                            {booking.status === "confirmed" && (
                              <>
                                <DropdownMenuItem>Reschedule</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Cancel Booking</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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