"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  User,
  Waves,
  Sunrise,
  CalendarRange
} from "lucide-react"
import { format, parseISO, startOfDay, endOfDay, addDays, isWithinInterval, startOfWeek, endOfWeek } from "date-fns"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import type { BookingListReadable } from "@/src/client/types.gen"

export default function PractitionerFlowTabs() {
  const [activeTab, setActiveTab] = useState("today")
  const { user } = useAuth()
  const router = useRouter()

  // Fetch all bookings (we'll filter client-side for now due to test data dates)
  const { data: bookingsData, isLoading } = useQuery({
    ...bookingsListOptions({
      query: {
        practitioner_id: user?.practitionerId,
        status: 'confirmed,completed',
        ordering: '-start_time',
        page_size: 100
      }
    }),
    enabled: !!user?.practitionerId
  })

  const bookings = bookingsData?.results || []

  // Filter bookings by tab
  const getFilteredBookings = () => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    // For development/testing: if all bookings are old (test data), show them anyway
    const hasCurrentBookings = bookings.some(booking => {
      const timeField = booking.service_session?.start_time || booking.scheduled_start_time
      if (!timeField) return false
      const bookingDate = parseISO(timeField)
      return bookingDate >= todayStart
    })

    if (!hasCurrentBookings && bookings.length > 0) {
      // Show test data distributed across tabs
      const perTab = Math.ceil(bookings.length / 3)
      switch (activeTab) {
        case "today":
          return bookings.slice(0, 5)
        case "week":
          return bookings.slice(5, 15)
        case "ahead":
          return bookings.slice(15, 25)
        default:
          return []
      }
    }

    // Normal filtering for real data
    switch (activeTab) {
      case "today":
        return bookings.filter(booking => {
          const timeField = booking.service_session?.start_time || booking.scheduled_start_time
          if (!timeField) return false
          const bookingDate = parseISO(timeField)
          return isWithinInterval(bookingDate, { start: todayStart, end: todayEnd })
        })
      case "week":
        return bookings.filter(booking => {
          const timeField = booking.service_session?.start_time || booking.scheduled_start_time
          if (!timeField) return false
          const bookingDate = parseISO(timeField)
          return isWithinInterval(bookingDate, { start: weekStart, end: weekEnd })
        })
      case "ahead":
        return bookings.filter(booking => {
          const timeField = booking.service_session?.start_time || booking.scheduled_start_time
          if (!timeField) return false
          const bookingDate = parseISO(timeField)
          return bookingDate > weekEnd
        })
      default:
        return []
    }
  }

  const filteredBookings = getFilteredBookings()

  const getServiceIcon = (type?: string) => {
    if (!type) return <User className="h-4 w-4" />
    if (type.includes('workshop')) return <Users className="h-4 w-4" />
    if (type.includes('course')) return <Users className="h-4 w-4" />
    return <User className="h-4 w-4" />
  }

  const getServiceLabel = (booking: BookingListReadable) => {
    const type = booking.service?.service_type_code || 'session'
    if (type.includes('workshop')) {
      return `Workshop: ${booking.service?.name || 'Workshop'} (${booking.attendee_count || 0} attendees)`
    }
    if (type.includes('course')) {
      return `Course: ${booking.service?.name || 'Course'} (${booking.attendee_count || 0} enrolled)`
    }
    return `1:1 w/ ${booking.user?.full_name || booking.user?.email || 'Client'}`
  }

  const handleJoinSession = (booking: BookingListReadable) => {
    // In the future, this could open a video call or redirect to session details
    router.push(`/dashboard/practitioner/bookings/${booking.public_uuid || booking.id}`)
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="py-12 text-center">
      <Waves className="h-12 w-12 mx-auto text-sage-300 mb-4" />
      <p className="text-muted-foreground italic">{message}</p>
    </div>
  )

  const BookingItem = ({ booking }: { booking: BookingListReadable }) => {
    const timeField = booking.service_session?.start_time || booking.scheduled_start_time
    const locationText = booking.service?.location_type === 'virtual' ? 'Virtual' : 'In-Person'
    const clientName = booking.user?.full_name || booking.user?.email || "Client"
    const clientInitial = clientName.charAt(0).toUpperCase()

    return (
      <div className="flex items-center gap-3 py-3 px-4 border-b border-sage-200/40 last:border-b-0 hover:bg-cream-50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-sage-700">{clientInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-olive-900">{getServiceLabel(booking)}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-light text-olive-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeField ? format(parseISO(timeField), "h:mm a") : 'Time TBD'}
            </span>
            <span className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${
              locationText === 'Virtual'
                ? 'bg-sage-100 text-sage-700'
                : 'bg-terracotta-100 text-terracotta-700'
            }`}>
              {locationText}
            </span>
          </div>
        </div>
        <button
          onClick={() => handleJoinSession(booking)}
          className="text-xs font-normal text-olive-700 bg-cream-50 border border-sage-200/60 px-3.5 py-1.5 rounded-full whitespace-nowrap hover:bg-terracotta-50 hover:border-terracotta-300 hover:text-terracotta-700 transition-colors flex-shrink-0"
        >
          View Details
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="inline-flex w-auto gap-1 bg-transparent p-0 mb-4">
        <TabsTrigger
          value="today"
          className="rounded-full border border-sage-200/60 bg-cream-50 px-4 py-1.5 text-xs font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800"
        >
          Today's Flow
        </TabsTrigger>
        <TabsTrigger
          value="week"
          className="rounded-full border border-sage-200/60 bg-cream-50 px-4 py-1.5 text-xs font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800"
        >
          This Week
        </TabsTrigger>
        <TabsTrigger
          value="ahead"
          className="rounded-full border border-sage-200/60 bg-cream-50 px-4 py-1.5 text-xs font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800"
        >
          Looking Downstream
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="mt-0">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">What's happening today?</p>
          <ScrollArea className="h-[340px] pr-4">
            {filteredBookings.length > 0 ? (
              <div className="space-y-2">
                {filteredBookings.map(booking => (
                  <BookingItem key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <EmptyState message="Your waters are calm today. Nothing scheduled — space to reset or welcome something new." />
            )}
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="week" className="mt-0">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">What's already scheduled in the days ahead?</p>
          <ScrollArea className="h-[340px] pr-4">
            {filteredBookings.length > 0 ? (
              <div className="space-y-2">
                {filteredBookings.map(booking => (
                  <div key={booking.id}>
                    <div className="flex items-center gap-2 py-2">
                      <Badge variant="outline" className="text-xs">
                        {format(parseISO(booking.service_session?.start_time), "EEE, MMM d")}
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                    <BookingItem booking={booking} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="The week ahead is wide open, space for new flow or simply rest." />
            )}
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="ahead" className="mt-0">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">What's coming further ahead?</p>
          <ScrollArea className="h-[340px] pr-4">
            {filteredBookings.length > 0 ? (
              <div className="space-y-2">
                {filteredBookings.map(booking => (
                  <div key={booking.id}>
                    <div className="flex items-center gap-2 py-2">
                      <Badge variant="outline" className="text-xs">
                        {format(parseISO(booking.service_session?.start_time), "EEE, MMM d")}
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                    <BookingItem booking={booking} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nothing on the horizon — time to pause, reflect, or invite something new." />
            )}
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  )
}