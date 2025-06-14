"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, User, Clock, MapPin, CalendarDays, CheckCircle2, AlertCircle, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"

// Get current date for testing
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const dayAfterTomorrow = new Date(today)
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

// Format date as YYYY-MM-DD
const formatDateForKey = (date) => {
  return date.toISOString().split("T")[0]
}

// Generate dates for the next 14 days
const generateAvailableDates = (startOffset = 3) => {
  const dates = []
  for (let i = startOffset; i < startOffset + 14; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    // Skip weekends
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      dates.push(date)
    }
  }
  return dates
}

// Generate time slots for each date
const generateTimeSlots = (dates) => {
  const slots = {}
  const morningSlots = ["9:00 AM", "10:00 AM", "11:00 AM"]
  const afternoonSlots = ["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]

  dates.forEach((date) => {
    const dateKey = formatDateForKey(date)
    // Randomly select 3-5 time slots for each date
    const allSlots = [...morningSlots, ...afternoonSlots]
    const numSlots = Math.floor(Math.random() * 3) + 3 // 3-5 slots
    const selectedSlots = []

    for (let i = 0; i < numSlots; i++) {
      const randomIndex = Math.floor(Math.random() * allSlots.length)
      selectedSlots.push(allSlots[randomIndex])
      allSlots.splice(randomIndex, 1)
    }

    slots[dateKey] = selectedSlots.sort((a, b) => {
      // Sort by AM/PM first, then by hour
      if (a.includes("AM") && b.includes("PM")) return -1
      if (a.includes("PM") && b.includes("AM")) return 1
      return a.localeCompare(b)
    })
  })

  return slots
}

// Mock data for bookings
const bookings = [
  {
    id: 1,
    serviceName: "Mindfulness Meditation Session",
    practitionerName: "Dr. Sarah Johnson",
    practitionerImage: "/practitioner-1.jpg",
    date: tomorrow.toLocaleDateString(), // Tomorrow (within 24 hours)
    time: "10:00 AM",
    duration: "60 min",
    location: "Virtual",
    status: "upcoming",
    description:
      "A guided meditation session focused on mindfulness techniques for stress reduction and improved focus.",
    price: "$75.00",
    bookingDate: "2023-06-01",
    bookingReference: "EST-MED-1234",
    specialInstructions:
      "Please find a quiet space where you won't be disturbed. Have a comfortable cushion or chair ready.",
    joinUrl: "https://estuary.com/video-room/123",
    availableDates: generateAvailableDates(),
    availableTimeSlots: generateTimeSlots(generateAvailableDates()),
  },
  {
    id: 2,
    serviceName: "Stress Management Workshop",
    practitionerName: "Michael Chen",
    practitionerImage: "/practitioner-2.jpg",
    date: dayAfterTomorrow.toLocaleDateString(), // Day after tomorrow (outside 24 hours)
    time: "2:00 PM",
    duration: "90 min",
    location: "In-person",
    address: "123 Wellness Center, Suite 200, San Francisco, CA",
    status: "upcoming",
    description: "Learn practical techniques to manage stress in your daily life and work environment.",
    price: "$120.00",
    bookingDate: "2023-06-02",
    bookingReference: "EST-WRK-5678",
    specialInstructions: "Please arrive 10 minutes early. Bring a notebook and pen for taking notes.",
    availableDates: generateAvailableDates(2),
    availableTimeSlots: generateTimeSlots(generateAvailableDates(2)),
  },
]

export default function RescheduleBookingPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [booking, setBooking] = useState<(typeof bookings)[0] | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isReschedulable, setIsReschedulable] = useState(true)

  useEffect(() => {
    const bookingId = Number.parseInt(params.id)
    const foundBooking = bookings.find((b) => b.id === bookingId)

    if (foundBooking) {
      setBooking(foundBooking)

      // Check if booking is reschedulable (more than 24 hours before start time)
      const bookingDate = new Date(`${foundBooking.date} ${foundBooking.time}`)
      const now = new Date()
      const timeDiff = bookingDate.getTime() - now.getTime()

      // For testing purposes:
      // Booking ID 1 is within 24 hours (not reschedulable)
      // Booking ID 2 is outside 24 hours (reschedulable)
      const canReschedule = bookingId === 1 ? false : true

      setIsReschedulable(canReschedule)

      if (!canReschedule) {
        // Redirect back if not reschedulable
        setTimeout(() => {
          router.push(`/dashboard/user/bookings/${bookingId}`)
        }, 3000)
      }
    } else {
      // Booking not found, redirect back to bookings list
      router.push("/dashboard/user/bookings")
    }
  }, [params.id, router])

  // Update available times when date changes
  useEffect(() => {
    if (selectedDate && booking) {
      const dateString = formatDateForKey(selectedDate)

      if (booking.availableTimeSlots[dateString]) {
        setAvailableTimes(booking.availableTimeSlots[dateString])
      } else {
        setAvailableTimes([])
      }

      // Reset selected time when date changes
      setSelectedTime(null)
    }
  }, [selectedDate, booking])

  const handleRescheduleBooking = () => {
    if (!selectedDate || !selectedTime) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)

      // Redirect after success message
      setTimeout(() => {
        router.push(`/dashboard/user/bookings/${booking?.id}`)
      }, 2000)
    }, 1500)
  }

  if (!booking) {
    return (
      <UserDashboardLayout title="Reschedule Booking">
        <div className="flex justify-center items-center h-64">
          <p>Loading booking details...</p>
        </div>
      </UserDashboardLayout>
    )
  }

  // Format date for display
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!isReschedulable) {
    return (
      <UserDashboardLayout title="Reschedule Booking">
        <div className="space-y-6">
          <Button
            variant="ghost"
            className="flex items-center gap-2 mb-4 pl-0 hover:pl-2 transition-all"
            onClick={() => router.push(`/dashboard/user/bookings/${booking.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Booking Details
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This booking cannot be rescheduled as it is less than 24 hours before the start time. You will be
              redirected back to the booking details page.
            </AlertDescription>
          </Alert>
        </div>
      </UserDashboardLayout>
    )
  }

  return (
    <UserDashboardLayout title="Reschedule Booking">
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 mb-4 pl-0 hover:pl-2 transition-all"
          onClick={() => router.push(`/dashboard/user/bookings/${booking.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking Details
        </Button>

        {isSuccess ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-semibold text-green-800">Booking Rescheduled!</h2>
                <p className="text-green-700 mt-2 mb-6">
                  Your session has been successfully rescheduled from {booking.date} at {booking.time} to{" "}
                  {selectedDate && formatDate(selectedDate)} at {selectedTime}.
                </p>
                <Button onClick={() => router.push(`/dashboard/user/bookings/${booking.id}`)}>
                  Return to Booking Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main scheduling area */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">Reschedule: {booking.serviceName}</CardTitle>
                      <CardDescription className="text-base mt-1">with {booking.practitionerName}</CardDescription>
                    </div>
                    <Badge variant="default">Upcoming</Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Current booking info */}
                  <div className="bg-muted p-4 rounded-md mb-6">
                    <h3 className="text-sm font-medium mb-2">Currently Scheduled For:</h3>
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {booking.date} at {booking.time}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mb-4">Select a New Date & Time</h3>

                  {/* Calendar and time slots side by side */}
                  <div className="rounded-lg border border-border">
                    <div className="flex max-sm:flex-col">
                      {/* Calendar */}
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          // Disable dates that aren't in the available dates array
                          return !booking.availableDates.some(
                            (availableDate) =>
                              availableDate.getDate() === date.getDate() &&
                              availableDate.getMonth() === date.getMonth() &&
                              availableDate.getFullYear() === date.getFullYear(),
                          )
                        }}
                        className="p-2 sm:pe-5 bg-background"
                      />

                      {/* Time slots */}
                      <div className="relative w-full max-sm:h-48 sm:w-40">
                        <div className="absolute inset-0 border-border py-4 max-sm:border-t">
                          <ScrollArea className="h-full border-border sm:border-s">
                            <div className="space-y-3">
                              <div className="flex h-5 shrink-0 items-center px-5">
                                <p className="text-sm font-medium">
                                  {selectedDate ? format(selectedDate, "EEEE, d") : "Select a date"}
                                </p>
                              </div>
                              <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                {selectedDate ? (
                                  availableTimes.length > 0 ? (
                                    availableTimes.map((time) => (
                                      <Button
                                        key={time}
                                        variant={selectedTime === time ? "default" : "outline"}
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setSelectedTime(time)}
                                      >
                                        {time}
                                      </Button>
                                    ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground px-2 py-4">
                                      No available times for this date
                                    </p>
                                  )
                                ) : (
                                  <p className="text-sm text-muted-foreground px-2 py-4">Please select a date first</p>
                                )}
                              </div>
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-6">
                  <div>
                    {selectedDate && selectedTime && (
                      <div className="text-sm">
                        <span className="font-medium">New appointment:</span> {formatDate(selectedDate)} at{" "}
                        {selectedTime}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/dashboard/user/bookings/${booking.id}`)}>
                      Cancel
                    </Button>
                    <Button disabled={!selectedDate || !selectedTime || isSubmitting} onClick={handleRescheduleBooking}>
                      {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* Rescheduling policy */}
              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Rescheduling is free up to 24 hours before your session. Your practitioner will be notified of this
                  change.
                </AlertDescription>
              </Alert>
            </div>

            {/* Sidebar with booking info */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Details</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={booking.practitionerImage || "/placeholder.svg"}
                        alt={booking.practitionerName}
                      />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h3 className="font-semibold text-lg">{booking.practitionerName}</h3>
                      <p className="text-sm text-muted-foreground">Wellness Practitioner</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">{booking.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{booking.location}</p>
                        {booking.address && <p className="text-xs text-muted-foreground">{booking.address}</p>}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Booking Reference</p>
                        <p className="text-sm font-mono text-muted-foreground">{booking.bookingReference}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">{booking.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  )
}
