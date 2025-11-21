"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { bookingsRetrieveOptions, bookingsRescheduleCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { bookingsCheckAvailabilityCreate } from "@/src/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, User, Clock, MapPin, CalendarDays, CheckCircle2, AlertCircle, CalendarIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, startOfDay, parseISO, isBefore, isAfter } from "date-fns"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"

export default function RescheduleBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [availableTimes, setAvailableTimes] = useState<{ start_time: string }[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showAllTimes, setShowAllTimes] = useState(false)

  // Date carousel state
  const [visibleDates, setVisibleDates] = useState<Array<{ day: string; date: string; dateObj: Date }>>([])
  const [allDates, setAllDates] = useState<Array<{ day: string; date: string; dateObj: Date }>>([])
  const [currentDateIndex, setCurrentDateIndex] = useState(0)

  // Fetch booking details from API
  const { data: booking, isLoading, error } = useQuery({
    ...bookingsRetrieveOptions({ path: { id } }),
  })

  // Reschedule mutation
  const { mutate: rescheduleBooking, isPending: isSubmitting } = useMutation({
    ...bookingsRescheduleCreateMutation(),
    onSuccess: () => {
      setIsSuccess(true)
      toast.success("Booking rescheduled successfully!")
      setTimeout(() => {
        router.push(`/dashboard/user/bookings/${id}`)
      }, 2000)
    },
    onError: (error: any) => {
      console.error('Reschedule error:', error)
      toast.error(error?.response?.data?.message || error?.response?.data?.detail || "Failed to reschedule booking")
    },
  })

  // Check if booking is reschedulable (more than 24 hours before start time)
  const isReschedulable = React.useMemo(() => {
    if (!booking) return false
    
    const bookingDate = new Date(booking.service_session?.start_time)
    const now = new Date()
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return hoursUntilBooking > 24 && booking.status === 'confirmed'
  }, [booking])

  // Initialize dates
  useEffect(() => {
    const dates = []
    const startDate = addDays(new Date(), 2) // Start from 2 days later
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(startDate, i)
      dates.push({
        day: format(date, 'EEE'),
        date: format(date, 'MMM d'),
        dateObj: date
      })
    }
    
    setAllDates(dates)
    updateVisibleDates(0, dates)
  }, [])

  const updateVisibleDates = (startIndex: number, dates = allDates) => {
    const visibleCount = 3 // Show 3 dates at a time
    const endIndex = Math.min(startIndex + visibleCount, dates.length)
    setVisibleDates(dates.slice(startIndex, endIndex))
    setCurrentDateIndex(startIndex)
  }

  const handlePrevDates = () => {
    if (currentDateIndex > 0) {
      updateVisibleDates(currentDateIndex - 1)
    }
  }

  const handleNextDates = () => {
    if (currentDateIndex + 3 < allDates.length) {
      updateVisibleDates(currentDateIndex + 1)
    }
  }

  // Redirect if booking not found or not reschedulable
  useEffect(() => {
    if (!isLoading && !booking) {
      toast.error("Booking not found")
      router.push("/dashboard/user/bookings")
    } else if (!isLoading && booking && !isReschedulable) {
      toast.error("This booking cannot be rescheduled less than 24 hours before the session")
      setTimeout(() => {
        router.push(`/dashboard/user/bookings/${id}`)
      }, 3000)
    }
  }, [booking, isLoading, isReschedulable, id, router])

  // Fetch available times when date changes
  const fetchAvailability = async (date: Date) => {
    if (!booking || !booking.service) return
    
    setIsLoadingSlots(true)
    setSelectedTime(null)
    setSelectedTimeSlot(null)
    
    try {
      const response = await bookingsCheckAvailabilityCreate({
        body: {
          practitioner_id: booking.service.primary_practitioner?.id || booking.practitioner?.id,
          service_id: booking.service.id,
          date: format(date, 'yyyy-MM-dd'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      
      if (response.data && 'available_slots' in response.data) {
        setAvailableTimes((response.data as any).available_slots || [])
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      toast.error('Failed to load available time slots')
      setAvailableTimes([])
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: { dateObj: Date }) => {
    setSelectedDate(date.dateObj)
    fetchAvailability(date.dateObj)
  }

  const handleTimeSelect = (slot: { start_time: string }) => {
    const startTime = new Date(slot.start_time)
    const formattedTime = format(startTime, 'h:mm a')
    setSelectedTime(formattedTime)
    
    // Calculate end time based on service duration
    const duration = booking?.service?.duration || 60
    const endTime = new Date(startTime.getTime() + duration * 60000)
    
    setSelectedTimeSlot({
      start: startTime,
      end: endTime
    })
  }

  const handleReschedule = async () => {
    if (!selectedTimeSlot) return

    rescheduleBooking({
      path: { id },
      body: {
        start_time: selectedTimeSlot.start,
        end_time: selectedTimeSlot.end,
        reason: "Customer requested reschedule"
      }
    })
  }

  // Determine visible time slots
  const visibleTimeSlots = showAllTimes ? availableTimes : availableTimes.slice(0, 6)

  if (isLoading) {
    return (
      <UserDashboardLayout title="Reschedule Booking">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-60 w-full" />
            </CardContent>
          </Card>
        </div>
      </UserDashboardLayout>
    )
  }

  if (error || !booking) {
    return null // Will redirect
  }

  return (
    <UserDashboardLayout title="Reschedule Booking">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/user/bookings/${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Booking Details
        </Button>

        {!isReschedulable && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This booking cannot be rescheduled less than 24 hours before the session. Redirecting back...
            </AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Your booking has been successfully rescheduled! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div>
            {/* Current Booking Info */}
            <Card className="mb-6">
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Current Booking
                </h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-lg">{booking.service?.name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      with {booking.service?.primary_practitioner?.display_name || booking.practitioner?.display_name}
                    </p>
                    <p className="text-sm">
                      {booking.service_session?.start_time ? format(parseISO(booking.service_session?.start_time), 'EEEE, MMMM d, yyyy') : 'N/A'}
                    </p>
                    <p className="text-sm font-medium">
                      {booking.service_session?.start_time ? format(parseISO(booking.service_session?.start_time), 'h:mm a') : 'N/A'} ({booking.service?.duration || 60} min)
                    </p>
                  </div>
                  <Badge variant="secondary">Current</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Select New Date & Time</CardTitle>
                <CardDescription>Choose an available slot for your session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Picker Carousel */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Available Dates</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handlePrevDates}
                        disabled={currentDateIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleNextDates}
                        disabled={currentDateIndex + 3 >= allDates.length}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {visibleDates.map((date) => (
                      <button
                        key={date.dateObj.toISOString()}
                        onClick={() => handleDateSelect(date)}
                        className={`
                          p-4 rounded-lg border text-center transition-all
                          ${selectedDate?.toDateString() === date.dateObj.toDateString()
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <div className="text-sm font-medium">{date.day}</div>
                        <div className="text-lg font-semibold mt-1">{date.date}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <h3 className="font-semibold mb-4">Available Times</h3>
                    {isLoadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableTimes.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {visibleTimeSlots.map((slot, index) => {
                            const time = format(new Date(slot.start_time), 'h:mm a')
                            return (
                              <Button
                                key={index}
                                variant={selectedTime === time ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTimeSelect(slot)}
                                className="w-full"
                              >
                                {time}
                              </Button>
                            )
                          })}
                        </div>
                        {availableTimes.length > 6 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllTimes(!showAllTimes)}
                            className="w-full mt-2"
                          >
                            {showAllTimes ? 'Show less' : `Show ${availableTimes.length - 6} more time slots`}
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No available times for this date
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Summary */}
                {selectedDate && selectedTime && (
                  <Alert className="border-primary/20 bg-primary/5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <span className="font-medium">New appointment:</span>{' '}
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/user/bookings/${id}`)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReschedule}
                  disabled={!selectedDate || !selectedTime || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rescheduling...
                    </>
                  ) : (
                    'Confirm Reschedule'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* New Time Summary */}
            {selectedDate && selectedTime && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <h3 className="font-semibold">New Appointment</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm">{selectedTime} ({booking.service?.duration || 60} min)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Practitioner Info */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Practitioner</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={booking.service?.primary_practitioner?.profile_image || booking.practitioner?.profile_image} 
                      alt={booking.service?.primary_practitioner?.display_name || booking.practitioner?.display_name}
                    />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {booking.service?.primary_practitioner?.display_name || booking.practitioner?.display_name || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.service?.primary_practitioner?.specialization || 'Wellness Practitioner'}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3 text-sm">
                  {booking.service?.location_type === 'virtual' ? (
                    <div className="flex items-start gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Virtual Session</p>
                        <p className="text-muted-foreground">Join link will be provided</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">In-Person Session</p>
                        <p className="text-muted-foreground">{booking.location?.address || 'Address will be provided'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Duration</p>
                      <p className="text-muted-foreground">{booking.service?.duration || 60} minutes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Policy */}
            <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Rescheduling Policy:</strong> You can reschedule up to 24 hours before your session. 
                  Please select a time at least 48 hours in advance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}