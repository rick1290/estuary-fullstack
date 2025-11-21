"use client"

import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, Video, Loader2, User, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { format, parseISO } from "date-fns"

export default function UserUpcomingBookings() {
  // Fetch upcoming bookings
  const { data, isLoading, error } = useQuery({
    ...bookingsListOptions({
      query: {
        status: "confirmed",
        ordering: "service_session__start_time",
        page_size: 4
      }
    }),
  })

  const bookings = data?.results || []
  const totalCount = data?.count || 0
  const hasMore = totalCount > 4

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
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-32" />
                    <Separator />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
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
            const practitioner = booking.practitioner

            return (
              <Card key={booking.id} className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Practitioner Image */}
                    <div className="flex-shrink-0 relative">
                      {practitioner?.profile_image_url ? (
                        <div className="relative">
                          <Avatar className="h-24 w-24 rounded-lg">
                            <AvatarImage
                              src={practitioner.profile_image_url}
                              alt={practitioner.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-lg bg-gradient-to-br from-sage-100 to-terracotta-100 text-2xl">
                              {practitioner.name?.charAt(0) || "P"}
                            </AvatarFallback>
                          </Avatar>
                          {/* Service type badge */}
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-200">
                            {service?.service_type === "Workshop" ? (
                              <Users className="h-4 w-4 text-sage-600" />
                            ) : service?.service_type === "Course" ? (
                              <Calendar className="h-4 w-4 text-terracotta-600" />
                            ) : (
                              <User className="h-4 w-4 text-olive-600" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-lg bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                          {service?.service_type === "Workshop" ? (
                            <Users className="h-10 w-10 text-sage-600" />
                          ) : service?.service_type === "Course" ? (
                            <Calendar className="h-10 w-10 text-terracotta-600" />
                          ) : (
                            <User className="h-10 w-10 text-olive-600" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg text-olive-900">
                            {service?.name || booking.service_name || "Service"}
                          </h3>
                          {practitioner && (
                            <p className="text-sm text-olive-700 mt-1">
                              with {practitioner.name}
                            </p>
                          )}
                        </div>
                        <Badge variant={status.variant} className="ml-4">
                          {status.label}
                        </Badge>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex items-start gap-6">
                        <div className="flex-1 space-y-2">
                          {booking.service_session?.start_time && (
                            <>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-sage-600" />
                                <span className="text-sm text-olive-700">
                                  {formatDate(booking.service_session.start_time)}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-sage-600" />
                                <span className="text-sm text-olive-700">
                                  {formatTime(booking.service_session.start_time)}
                                  {booking.duration_minutes && ` (${booking.duration_minutes} min)`}
                                </span>
                              </div>
                            </>
                          )}

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
                                  In-person
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[140px]">
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
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {hasMore && (
            <div className="text-center mt-4">
              <Button variant="link" asChild className="text-sage-700">
                <Link href="/dashboard/user/bookings">
                  Show More ({totalCount - 4} more bookings)
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}