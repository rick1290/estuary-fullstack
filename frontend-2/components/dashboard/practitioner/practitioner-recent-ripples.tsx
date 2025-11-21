"use client"

import { useQuery } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Calendar, 
  Clock, 
  User, 
  Users, 
  BookOpen,
  MessageSquare,
  Radio,
  Droplets,
  ExternalLink
} from "lucide-react"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import type { BookingListReadable } from "@/src/client/types.gen"

export default function PractitionerRecentRipples() {
  const { user } = useAuth()
  const router = useRouter()

  // Fetch recent bookings (ordered by creation date)
  const { data: bookingsData, isLoading } = useQuery({
    ...bookingsListOptions({
      query: {
        practitioner_id: user?.practitionerId,
        ordering: '-created_at',
        page_size: 20
      }
    }),
    enabled: !!user?.practitionerId
  })

  const recentBookings = (bookingsData?.results || []).slice(0, 10)

  const getActivityIcon = (type?: string) => {
    if (!type) return <User className="h-4 w-4" />
    if (type.includes('workshop')) return <Users className="h-4 w-4" />
    if (type.includes('course')) return <BookOpen className="h-4 w-4" />
    // In the future, add stream subscriptions
    if (type === 'stream') return <Radio className="h-4 w-4" />
    return <User className="h-4 w-4" />
  }

  const getActivityLabel = (booking: BookingListReadable) => {
    const type = booking.service?.service_type_code || 'session'
    const serviceName = booking.service?.name || 'Service'
    
    if (type.includes('workshop')) {
      return `signed up for ${serviceName} Workshop`
    }
    if (type.includes('course')) {
      return `enrolled in ${serviceName} Course`
    }
    return `booked a 1:1 session`
  }

  const getSessionDate = (booking: BookingListReadable) => {
    try {
      const timeField = booking.service_session?.start_time || booking.scheduled_start_time
      if (!timeField) return "Date TBD"
      const date = parseISO(timeField)
      return format(date, "MMM d @ h:mm a")
    } catch {
      return "Date TBD"
    }
  }

  const handleViewBooking = (bookingId: number) => {
    router.push(`/dashboard/practitioner/bookings/${bookingId}`)
  }

  const handleMessageClient = (booking: BookingListReadable) => {
    // In the future, this would open a message with the client
    router.push(`/dashboard/practitioner/messages`)
  }

  const EmptyState = () => (
    <div className="py-12 text-center">
      <Droplets className="h-12 w-12 mx-auto text-terracotta-300 mb-4" />
      <p className="text-muted-foreground italic">
        No new ripples yet. Share your offerings to invite new energy.
      </p>
    </div>
  )

  const RippleItem = ({ booking }: { booking: BookingListReadable }) => (
    <div className="group py-4 px-4 hover:bg-terracotta-50 rounded-lg transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={booking.user?.avatar_url || ""} alt={booking.user?.full_name || ""} />
          <AvatarFallback className="bg-terracotta-100 text-terracotta-700">
            {(booking.user?.full_name || booking.user?.email || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <p className="text-sm">
            <span className="font-medium">{booking.user?.full_name || booking.user?.email || "Someone"}</span>
            {" "}
            <span className="text-muted-foreground">{getActivityLabel(booking)}</span>
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {getSessionDate(booking)}
            </span>
            <span>•</span>
            <span className="italic">
              {formatDistanceToNow(parseISO(booking.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs"
              onClick={() => handleViewBooking(booking.id)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Booking
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs"
              onClick={() => handleMessageClient(booking)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </Button>
          </div>
        </div>
        
        <div className="p-2 bg-terracotta-100 rounded-lg">
          {getActivityIcon(booking.service?.service_type_code)}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">Who just booked or subscribed?</p>
      <ScrollArea className="h-[400px] pr-4">
        {recentBookings.length > 0 ? (
          <div className="space-y-1">
            {recentBookings.map(booking => (
              <RippleItem key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </ScrollArea>
    </div>
  )
}