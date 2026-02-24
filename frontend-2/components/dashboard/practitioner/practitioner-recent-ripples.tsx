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

  const RippleItem = ({ booking }: { booking: BookingListReadable }) => {
    const clientName = booking.user?.full_name || booking.user?.email || "Someone"
    const clientInitial = clientName.charAt(0).toUpperCase()
    const activityLabel = getActivityLabel(booking)
    const timeAgo = formatDistanceToNow(parseISO(booking.created_at), { addSuffix: true })

    return (
      <div
        className="flex items-center gap-3 py-3 px-4 border-b border-sage-200/40 last:border-b-0 hover:bg-cream-50 transition-colors cursor-pointer"
        onClick={() => handleViewBooking(booking.id)}
      >
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={booking.user?.avatar_url || ""} alt={clientName} />
          <AvatarFallback className="bg-gradient-to-br from-terracotta-200 to-sage-200 text-olive-700 text-sm font-medium">
            {clientInitial}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-olive-900">{clientName}</p>
          <p className="text-[12px] font-light text-olive-500">
            {activityLabel.split(/(session|Workshop|Course|Stream)/i).map((part, i) =>
              /session|workshop|course|stream/i.test(part) ? (
                <em key={i} className="italic text-terracotta-600">{part}</em>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </div>

        <span className="text-[11px] font-light text-olive-400 flex-shrink-0 whitespace-nowrap">{timeAgo}</span>
        <span className="text-olive-300 text-sm flex-shrink-0">&rsaquo;</span>
      </div>
    )
  }

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
    <div>
      <ScrollArea className="h-[400px]">
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