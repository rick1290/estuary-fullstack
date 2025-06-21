"use client"

import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, Video, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { format, parseISO } from "date-fns"

export default function UserUpcomingBookings() {
  // Fetch upcoming bookings
  const { data, isLoading, error } = useQuery({
    ...bookingsListOptions({
      query: {
        status: "confirmed",
        ordering: "start_time",
        limit: 4
      }
    }),
  })

  const bookings = data?.results || []

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "EEEE, MMMM d")
    } catch {
      return dateString
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "h:mm a")
    } catch {
      return dateString
    }
  }

  const getBookingStatus = (status: string) => {
    switch (status) {
      case "confirmed":
        return { label: "Confirmed", variant: "default" as const }
      case "pending":
        return { label: "Pending", variant: "secondary" as const }
      case "completed":
        return { label: "Completed", variant: "outline" as const }
      case "cancelled":
        return { label: "Cancelled", variant: "destructive" as const }
      default:
        return { label: status, variant: "outline" as const }
    }
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-medium mb-6 text-olive-900">Upcoming Bookings</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-2 border-sage-200">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
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
      <div>
        <h2 className="text-2xl font-medium mb-6 text-olive-900">Upcoming Bookings</h2>
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-800">Failed to load bookings. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-medium mb-6 text-olive-900">Upcoming Bookings</h2>

      {bookings.length === 0 ? (
        <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-sage-300 mb-4" />
            <p className="text-olive-600 mb-4">You have no upcoming bookings</p>
            <Button asChild className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800">
              <Link href="/marketplace">Explore Services</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const status = getBookingStatus(booking.status)
            const service = booking.service
            const practitioner = service?.practitioner || service?.primary_practitioner
            
            return (
              <Card key={booking.id} className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <h3 className="font-medium text-lg text-olive-900">
                        {service?.name || booking.service_name || "Service"}
                      </h3>

                      {practitioner && (
                        <div className="flex items-center mt-2 mb-3">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage
                              src={practitioner.profile_image_url}
                              alt={practitioner.display_name}
                            />
                            <AvatarFallback>
                              {practitioner.display_name?.charAt(0) || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-olive-700">
                            with {practitioner.display_name}
                          </span>
                        </div>
                      )}

                      <Separator className="my-3" />

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-sage-600" />
                          <span className="text-sm text-olive-700">
                            {formatDate(booking.start_time)}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-sage-600" />
                          <span className="text-sm text-olive-700">
                            {formatTime(booking.start_time)}
                            {booking.duration_minutes && ` (${booking.duration_minutes} min)`}
                          </span>
                        </div>

                        <div className="flex items-center">
                          {booking.location_type === "virtual" ? (
                            <>
                              <Video className="h-4 w-4 mr-2 text-sage-600" />
                              <span className="text-sm text-olive-700">Virtual Session</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 mr-2 text-sage-600" />
                              <span className="text-sm text-olive-700">
                                {booking.location || "In-person"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between md:items-end">
                      <Badge variant={status.variant} className="mb-4 self-start md:self-end">
                        {status.label}
                      </Badge>

                      <div className="flex flex-col gap-2 w-full">
                        <Button variant="outline" size="sm" asChild className="w-full border-sage-300 text-sage-700 hover:bg-sage-50">
                          <Link href={`/dashboard/user/bookings/${booking.id}`}>
                            View Details
                          </Link>
                        </Button>
                        {booking.status === "confirmed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-terracotta-600 border-terracotta-300 hover:bg-terracotta-50"
                          >
                            Reschedule
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <div className="text-center mt-6">
            <Button variant="outline" asChild className="border-sage-300 text-sage-700 hover:bg-sage-50">
              <Link href="/dashboard/user/bookings">View All Bookings</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}