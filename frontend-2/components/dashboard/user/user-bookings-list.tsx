"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  MapPin,
  Clock,
  Video,
  Info,
  ChevronRight,
  User,
  Users,
  CalendarPlus,
  AlertCircle,
  Search,
  Filter,
  X,
  ChevronDown,
  Play,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parseISO, isPast, isFuture } from "date-fns"
import Link from "next/link"

type BookingStatus = "all" | "upcoming" | "unscheduled" | "past" | "canceled"
type ServiceType = "all" | "session" | "workshop" | "course" | "package"

export default function UserBookingsList() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<BookingStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<ServiceType[]>(["all"])
  const [page, setPage] = useState(1)
  const limit = 10 // Number of bookings per page

  // Fetch bookings from API - for now fetching all bookings and paginating client-side
  // TODO: Move filtering to server-side for better performance
  const { data, isLoading, error } = useQuery({
    ...bookingsListOptions({
      query: {
        ordering: "-created_at",
        limit: 100 // Fetch more bookings to allow client-side filtering
      }
    }),
  })

  const bookings = data?.results || []

  // Filter bookings based on status
  const filteredBookings = useMemo(() => {
    let filtered = bookings

    // Filter by status
    if (activeTab !== "all") {
      filtered = filtered.filter((booking: any) => {
        if (activeTab === "upcoming") {
          return booking.status === "confirmed" && isFuture(parseISO(booking.start_time))
        } else if (activeTab === "past") {
          return booking.status === "completed" || isPast(parseISO(booking.start_time))
        } else if (activeTab === "canceled") {
          return booking.status === "canceled"
        } else if (activeTab === "unscheduled") {
          return booking.status === "pending" || !booking.start_time
        }
        return true
      })
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((booking: any) => {
        const service = booking.service
        const practitioner = service?.practitioner || service?.primary_practitioner
        const searchLower = searchQuery.toLowerCase()
        
        return (
          service?.name?.toLowerCase().includes(searchLower) ||
          practitioner?.display_name?.toLowerCase().includes(searchLower) ||
          booking.booking_reference?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Filter by service type
    if (!selectedServiceTypes.includes("all") && selectedServiceTypes.length > 0) {
      filtered = filtered.filter((booking: any) => {
        const serviceType = booking.service?.service_type || "session"
        return selectedServiceTypes.includes(serviceType)
      })
    }

    return filtered
  }, [bookings, activeTab, searchQuery, selectedServiceTypes])

  // Paginate the filtered results
  const paginatedBookings = useMemo(() => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredBookings.slice(startIndex, endIndex)
  }, [filteredBookings, page, limit])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [activeTab, searchQuery, selectedServiceTypes])

  const getStatusBadge = (booking: any) => {
    if (booking.status === "canceled") {
      return <Badge variant="destructive">Canceled</Badge>
    } else if (booking.status === "completed") {
      return <Badge variant="outline">Completed</Badge>
    } else if (booking.status === "confirmed" && booking.start_time) {
      if (isFuture(parseISO(booking.start_time))) {
        return <Badge variant="default">Upcoming</Badge>
      } else {
        return <Badge variant="outline">Past</Badge>
      }
    } else if (booking.status === "pending" || !booking.start_time) {
      return <Badge variant="secondary">Unscheduled</Badge>
    }
    return <Badge variant="outline">{booking.status}</Badge>
  }

  const handleServiceTypeChange = (type: ServiceType) => {
    if (type === "all") {
      setSelectedServiceTypes(["all"])
    } else {
      const newTypes = selectedServiceTypes.filter((t) => t !== "all")
      if (newTypes.includes(type)) {
        const filtered = newTypes.filter((t) => t !== type)
        setSelectedServiceTypes(filtered.length === 0 ? ["all"] : filtered)
      } else {
        setSelectedServiceTypes([...newTypes, type])
      }
    }
  }

  const isSessionJoinable = (booking: any) => {
    if (!booking.start_time || booking.status !== "confirmed") return false
    
    const now = new Date()
    const startTime = parseISO(booking.start_time)
    const endTime = booking.end_time ? parseISO(booking.end_time) : new Date(startTime.getTime() + 60 * 60 * 1000)
    
    // Allow joining 15 minutes before start and up to 30 minutes after start
    const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000)
    const joinWindowEnd = new Date(startTime.getTime() + 30 * 60 * 1000)
    
    return now >= joinWindowStart && now <= joinWindowEnd && now < endTime
  }

  const isSessionStartingSoon = (booking: any) => {
    if (!booking.start_time || booking.status !== "confirmed") return false
    
    const now = new Date()
    const startTime = parseISO(booking.start_time)
    const timeUntilStart = startTime.getTime() - now.getTime()
    
    // Session starts within 15 minutes
    return timeUntilStart > 0 && timeUntilStart <= 15 * 60 * 1000
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search and Filters Skeleton */}
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Tabs Skeleton */}
        <Skeleton className="h-10 w-full max-w-md" />

        {/* Bookings Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-10 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load bookings. Please try again later.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px] justify-between">
              <Filter className="h-4 w-4 mr-2" />
              Service Type
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Service Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedServiceTypes.includes("all")}
              onCheckedChange={() => handleServiceTypeChange("all")}
            >
              All Types
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedServiceTypes.includes("session")}
              onCheckedChange={() => handleServiceTypeChange("session")}
            >
              Sessions
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedServiceTypes.includes("workshop")}
              onCheckedChange={() => handleServiceTypeChange("workshop")}
            >
              Workshops
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedServiceTypes.includes("course")}
              onCheckedChange={() => handleServiceTypeChange("course")}
            >
              Courses
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedServiceTypes.includes("package")}
              onCheckedChange={() => handleServiceTypeChange("package")}
            >
              Packages
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BookingStatus)}>
        <TabsList className="grid w-full grid-cols-5 max-w-[600px]">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="unscheduled">Unscheduled</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="canceled">Canceled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {filteredBookings.length} {filteredBookings.length === 1 ? "booking" : "bookings"} found
      </p>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-3">
              <CalendarPlus className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="text-lg font-medium">No bookings found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {activeTab === "upcoming"
                  ? "You don't have any upcoming bookings."
                  : activeTab === "unscheduled"
                  ? "You don't have any unscheduled services to book."
                  : activeTab === "past"
                  ? "You don't have any past bookings."
                  : activeTab === "canceled"
                  ? "You don't have any canceled bookings."
                  : "You haven't made any bookings yet."}
              </p>
              {(activeTab === "all" || activeTab === "upcoming") && (
                <Button asChild className="mt-4">
                  <Link href="/marketplace">Explore Services</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedBookings.map((booking: any) => {
            const service = booking.service
            const practitioner = service?.practitioner || service?.primary_practitioner
            const isUnscheduled = booking.status === "pending" || !booking.start_time

            return (
              <Card
                key={booking.id}
                className={`overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                  isSessionStartingSoon(booking) && booking.location_type === "virtual" 
                    ? "ring-2 ring-sage-500 ring-opacity-50" 
                    : ""
                }`}
                onClick={() => router.push(`/dashboard/user/bookings/${booking.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Service Image/Icon */}
                    <div className="flex-shrink-0">
                      <div className="h-24 w-24 rounded-lg bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                        {service?.service_type === "workshop" ? (
                          <Users className="h-10 w-10 text-sage-600" />
                        ) : service?.service_type === "course" ? (
                          <Calendar className="h-10 w-10 text-terracotta-600" />
                        ) : (
                          <User className="h-10 w-10 text-olive-600" />
                        )}
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-lg text-gray-900 line-clamp-1">
                            {service?.name || "Service"}
                          </h3>
                          {practitioner && (
                            <div className="flex items-center mt-1">
                              <Avatar className="h-5 w-5 mr-2">
                                <AvatarImage
                                  src={practitioner.profile_image_url}
                                  alt={practitioner.display_name}
                                />
                                <AvatarFallback>
                                  {practitioner.display_name?.charAt(0) || "P"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600">
                                {practitioner.display_name}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(booking)}
                          {isSessionStartingSoon(booking) && booking.location_type === "virtual" && (
                            <Badge variant="default" className="bg-sage-600 animate-pulse">
                              Starting soon
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        {isUnscheduled ? (
                          <>
                            <div className="flex items-center">
                              <Info className="h-4 w-4 mr-2 text-amber-500" />
                              <span className="text-amber-700">
                                Needs scheduling - expires{" "}
                                {booking.expires_at
                                  ? format(parseISO(booking.expires_at), "MMM d, yyyy")
                                  : "soon"}
                              </span>
                            </div>
                            {booking.booking_reference && (
                              <div className="flex items-center">
                                <span className="font-medium">Reference:</span>
                                <span className="ml-2">{booking.booking_reference}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {booking.start_time && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {format(parseISO(booking.start_time), "EEEE, MMMM d, yyyy")}
                              </div>
                            )}
                            {booking.start_time && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {format(parseISO(booking.start_time), "h:mm a")}
                                {booking.duration_minutes && ` (${booking.duration_minutes} min)`}
                              </div>
                            )}
                            <div className="flex items-center">
                              {booking.location_type === "virtual" ? (
                                <>
                                  <Video className="h-4 w-4 mr-2" />
                                  Virtual Session
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4 mr-2" />
                                  {booking.location || "In-person"}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {/* Join Button for virtual sessions */}
                      {booking.location_type === "virtual" && 
                       booking.room?.public_uuid && 
                       isSessionJoinable(booking) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/room/${booking.room.public_uuid}/lobby`)
                                }}
                                className="bg-sage-600 hover:bg-sage-700"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Join
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Join video session</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* View Details Button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/user/bookings/${booking.id}`)
                              }}
                            >
                              View Details
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View booking details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {/* Pagination controls */}
          {filteredBookings.length > limit && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button 
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                variant="outline"
                size="default"
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(filteredBookings.length / limit)}
              </span>
              <Button 
                onClick={() => setPage(prev => prev + 1)}
                variant="outline"
                size="default"
                disabled={page >= Math.ceil(filteredBookings.length / limit) || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}