"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { bookingsRetrieveOptions, bookingsCancelCreateOptions } from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Calendar,
  MapPin,
  Clock,
  Video,
  ArrowLeft,
  User,
  MessageSquare,
  CalendarIcon,
  CalendarRange,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"
import { format, parseISO, differenceInHours, differenceInMinutes, isFuture } from "date-fns"
import Link from "next/link"

export default function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  // Fetch booking details
  const { data: booking, isLoading, error, refetch } = useQuery({
    ...bookingsRetrieveOptions({ path: { id } }),
  })

  // Cancel booking mutation
  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: () => bookingsCancelCreateOptions({ path: { id } }).queryFn({ queryKey: [{}] }),
    onSuccess: () => {
      toast.success("Booking cancelled successfully")
      setCancelDialogOpen(false)
      refetch()
    },
    onError: () => {
      toast.error("Failed to cancel booking. Please try again.")
    },
  })

  if (isLoading) {
    return (
      <UserDashboardLayout title="Booking Details">
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32 mt-4" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </UserDashboardLayout>
    )
  }

  if (error || !booking) {
    return (
      <UserDashboardLayout title="Booking Details">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load booking details. Please try again later.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/user/bookings")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </UserDashboardLayout>
    )
  }

  const service = booking.service
  const practitioner = service?.practitioner || service?.primary_practitioner

  // Check if session is joinable (within 15 minutes of start time)
  const isSessionJoinable = () => {
    if (booking.status !== "confirmed" || !booking.start_time) return false
    const startTime = parseISO(booking.start_time)
    const now = new Date()
    const minutesUntilStart = differenceInMinutes(startTime, now)
    return minutesUntilStart <= 15 && minutesUntilStart >= -30 // 15 min before to 30 min after
  }

  // Check if reschedulable/cancellable (more than 24 hours before start)
  const isModifiable = () => {
    if (booking.status !== "confirmed" || !booking.start_time) return false
    const startTime = parseISO(booking.start_time)
    const hoursUntilStart = differenceInHours(startTime, new Date())
    return hoursUntilStart >= 24
  }

  const getStatusBadge = () => {
    switch (booking.status) {
      case "confirmed":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>
      case "completed":
        return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{booking.status}</Badge>
    }
  }

  const joinable = isSessionJoinable()
  const modifiable = isModifiable()

  return (
    <UserDashboardLayout title="Booking Details">
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 mb-4 pl-0 hover:pl-2 transition-all"
          onClick={() => router.push("/dashboard/user/bookings")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main booking details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">
                      {service?.name || "Service"}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      with {practitioner?.display_name || "Practitioner"}
                    </CardDescription>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {booking.start_time && (
                      <>
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 mr-3 text-primary" />
                          <div>
                            <p className="font-medium">Date</p>
                            <p className="text-muted-foreground">
                              {format(parseISO(booking.start_time), "EEEE, MMMM d, yyyy")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Clock className="h-5 w-5 mr-3 text-primary" />
                          <div>
                            <p className="font-medium">Time</p>
                            <p className="text-muted-foreground">
                              {format(parseISO(booking.start_time), "h:mm a")}
                              {booking.duration_minutes && ` (${booking.duration_minutes} min)`}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-3 text-primary" />
                      <div>
                        <p className="font-medium">Total Amount</p>
                        <p className="text-muted-foreground">
                          ${booking.total_amount || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      {booking.location_type === "virtual" ? (
                        <>
                          <Video className="h-5 w-5 mr-3 text-primary" />
                          <div>
                            <p className="font-medium">Location</p>
                            <p className="text-muted-foreground">Virtual Session</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-5 w-5 mr-3 text-primary" />
                          <div>
                            <p className="font-medium">Location</p>
                            <p className="text-muted-foreground">
                              {booking.location || "In-person"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-3 text-primary" />
                      <div>
                        <p className="font-medium">Booked on</p>
                        <p className="text-muted-foreground">
                          {format(parseISO(booking.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    {booking.booking_reference && (
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-3 text-primary" />
                        <div>
                          <p className="font-medium">Reference</p>
                          <p className="text-muted-foreground font-mono text-sm">
                            {booking.booking_reference}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {service?.description && (
                  <div>
                    <h3 className="font-medium mb-2">About this Service</h3>
                    <p className="text-muted-foreground">{service.description}</p>
                  </div>
                )}

                {booking.notes && (
                  <div>
                    <h3 className="font-medium mb-2">Booking Notes</h3>
                    <p className="text-muted-foreground">{booking.notes}</p>
                  </div>
                )}

                {booking.cancellation_reason && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2 text-red-900">Cancellation Details</h3>
                    <p className="text-red-700">Reason: {booking.cancellation_reason}</p>
                    {booking.cancelled_at && (
                      <p className="text-red-700">
                        Cancelled on: {format(parseISO(booking.cancelled_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>

              {booking.status === "confirmed" && (
                <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
                  {booking.location_type === "virtual" && booking.video_url && (
                    <Button
                      className={`flex items-center gap-2 ${joinable ? "bg-green-600 hover:bg-green-700" : ""}`}
                      disabled={!joinable}
                      asChild={joinable}
                    >
                      {joinable ? (
                        <a href={booking.video_url} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4" />
                          Join Session Now
                        </a>
                      ) : (
                        <>
                          <Video className="h-4 w-4" />
                          Join Session
                        </>
                      )}
                    </Button>
                  )}

                  <Button variant="outline" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Add to Calendar
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            variant="secondary"
                            className="flex items-center gap-2"
                            disabled={!modifiable}
                          >
                            <CalendarRange className="h-4 w-4" />
                            Reschedule
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!modifiable && (
                        <TooltipContent>
                          <p>Rescheduling is only available up to 24 hours before your session</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="destructive" 
                            onClick={() => setCancelDialogOpen(true)} 
                            disabled={!modifiable}
                          >
                            Cancel Booking
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!modifiable && (
                        <TooltipContent>
                          <p>Cancellation is only available up to 24 hours before your session</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              )}
            </Card>

            {/* Policies */}
            {booking.status === "confirmed" && (
              <Card className="border-sage-100">
                <CardHeader>
                  <CardTitle className="text-lg">Booking Policies</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <span className="font-medium">Rescheduling:</span> You can reschedule up to 24 hours before your session.
                  </p>
                  <p>
                    <span className="font-medium">Cancellation:</span> Full refund if cancelled 24+ hours before. 50% refund if cancelled 12-24 hours before. No refund within 12 hours.
                  </p>
                  <p>
                    <span className="font-medium">No-show:</span> Missing your session without notice may result in forfeiting the session fee.
                  </p>
                </CardContent>
              </Card>
            )}

            {booking.status === "completed" && !booking.review_id && (
              <Card className="border-terracotta-100 bg-terracotta-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">How was your experience?</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share your feedback to help others
                      </p>
                    </div>
                    <Button variant="default">Leave Review</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Practitioner info */}
          <div className="space-y-6">
            {practitioner && (
              <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Your Practitioner</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={practitioner.profile_image_url} 
                        alt={practitioner.display_name} 
                      />
                      <AvatarFallback>
                        {practitioner.display_name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h3 className="font-semibold text-lg">{practitioner.display_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {practitioner.title || "Wellness Practitioner"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <Button variant="outline" className="flex items-center justify-center gap-2 w-full">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>

                    <Button variant="outline" asChild className="flex items-center justify-center gap-2 w-full">
                      <Link href={`/practitioners/${practitioner.slug || practitioner.id}`}>
                        <User className="h-4 w-4" />
                        View Profile
                      </Link>
                    </Button>

                    {booking.status === "completed" && (
                      <Button variant="outline" asChild className="flex items-center justify-center gap-2 w-full">
                        <Link href={`/practitioners/${practitioner.slug || practitioner.id}`}>
                          <Calendar className="h-4 w-4" />
                          Book Again
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="link" className="p-0 h-auto justify-start text-sm">
                  Contact Support
                </Button>
                <Button variant="link" className="p-0 h-auto justify-start text-sm">
                  Report an Issue
                </Button>
                <Button variant="link" className="p-0 h-auto justify-start text-sm">
                  View Cancellation Policy
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancellation Dialog */}
      <CancelBookingDialog
        bookingId={booking.id}
        serviceName={service?.name || "Service"}
        practitionerName={practitioner?.display_name || "Practitioner"}
        date={booking.start_time ? format(parseISO(booking.start_time), "MMMM d, yyyy") : ""}
        time={booking.start_time ? format(parseISO(booking.start_time), "h:mm a") : ""}
        price={`$${booking.total_amount || 0}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={() => cancelBooking()}
        isLoading={isCancelling}
      />
    </UserDashboardLayout>
  )
}