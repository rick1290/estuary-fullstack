"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Calendar, Clock, Video, MapPin, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { format, isToday, isTomorrow, parseISO } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

// Check if a session can be joined
const isSessionJoinable = (booking: any) => {
  if (!booking.service_session?.start_time || (booking.status !== "confirmed" && booking.status !== "in_progress")) return false
  
  const now = new Date()
  const startTime = parseISO(booking.service_session?.start_time)
  const endTime = booking.service_session?.end_time ? parseISO(booking.service_session?.end_time) : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)
  
  // Allow joining 15 minutes before start and until the session ends
  const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000)
  
  return now >= joinWindowStart && now < endTime
}
export default function PractitionerUpcomingBookings() {
  const [tabValue, setTabValue] = useState("upcoming")
  const router = useRouter()
  
  // Fetch upcoming bookings - include in_progress status
  const { data: bookingsResponse, isLoading } = useQuery(
    bookingsListOptions({
      query: {
        status: tabValue === "pending" ? "pending_payment" : undefined, // Remove status filter to get all statuses
        ordering: "start_time",
        page_size: 5,
        is_upcoming: true  // Add filter for upcoming bookings only
      }
    })
  )

  // Debug logging
  console.log('Bookings Response:', bookingsResponse)

  const bookings = useMemo(() => {
    if (!bookingsResponse?.results) return []
    
    const now = new Date()
    
    return bookingsResponse.results
      .filter(booking => {
        const startTime = parseISO(booking.service_session?.start_time)
        
        // Include confirmed and in_progress bookings in all tabs except pending
        const validStatuses = ["confirmed", "in_progress"]
        
        if (tabValue === "today") {
          return isToday(startTime) && (validStatuses.includes(booking.status) || booking.status === "in_progress")
        } else if (tabValue === "upcoming") {
          // Include in_progress bookings that haven't ended yet
          if (booking.status === "in_progress") {
            const endTime = booking.service_session?.end_time ? parseISO(booking.service_session?.end_time) : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)
            return endTime > now
          }
          return startTime > now && validStatuses.includes(booking.status)
        } else if (tabValue === "pending") {
          return booking.payment_status === "pending" || booking.status === "pending" || booking.status === "pending_payment"
        }
        return true
      })
      .map(booking => {
        const startTime = parseISO(booking.service_session?.start_time)
        const endTime = parseISO(booking.service_session?.end_time)
        
        let dateDisplay = format(startTime, "MMM d, yyyy")
        if (isToday(startTime)) {
          dateDisplay = "Today"
        } else if (isTomorrow(startTime)) {
          dateDisplay = "Tomorrow"
        }
        
        return {
          id: booking.id,
          client: {
            name: booking.user?.full_name || booking.user?.email || "Unknown Client",
            avatar: booking.user?.avatar_url
          },
          service: booking.service?.name || booking.service?.title || "Service",
          date: dateDisplay,
          time: `${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}`,
          type: booking.service?.location_type === "virtual" ? "Virtual" : "In-Person",
          status: booking.status,
          livekit_room: booking.livekit_room,
          location_type: booking.service?.location_type,
          start_time: booking.service_session?.start_time,
          end_time: booking.service_session?.end_time,
          duration_minutes: booking.duration_minutes
        }
      })
  }, [bookingsResponse, tabValue])

  return (
    <div className="space-y-4">
      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-start space-x-4 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-start space-x-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={booking.client.avatar || "/placeholder.svg"} alt={booking.client.name} />
                <AvatarFallback>{booking.client.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{booking.service}</div>
                  <Badge variant={booking.status === "confirmed" ? "success" : booking.status === "in_progress" ? "default" : "outline"}>
                    {booking.status === "in_progress" ? "In Progress" : booking.status}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{booking.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.type === "Virtual" ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5" />
                    )}
                    <span>{booking.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>with {booking.client.name}</span>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/practitioner/bookings/${booking.id}`}>
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  {/* Join button for virtual sessions */}
                  {service.location_type === "virtual" && booking.livekit_room && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (isSessionJoinable(booking)) {
                          router.push(`/room/${booking.livekit_room.public_uuid}/lobby`)
                        }
                      }}
                      className={isSessionJoinable(booking) ? "text-primary" : "opacity-50"}
                      disabled={!isSessionJoinable(booking)}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Session
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>Send Message</DropdownMenuItem>
                  <DropdownMenuItem>Reschedule</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Cancel Session</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">No upcoming bookings</p>
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard/practitioner/bookings" className="flex items-center gap-1">
            View All Bookings
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
