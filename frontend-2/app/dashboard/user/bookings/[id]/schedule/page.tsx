"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, User, Clock, MapPin, CalendarDays, CheckCircle2, Info } from "lucide-react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"

// Helper function to generate dates excluding weekends
const generateAvailableDates = (startDate: Date, days: number) => {
  const dates: Date[] = []
  let currentDate = new Date(startDate)

  while (dates.length < days) {
    const dayOfWeek = currentDate.getDay()
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(currentDate))
    }
    currentDate = addDays(currentDate, 1)
  }

  return dates
}

// Helper function to generate time slots
const generateTimeSlots = (date: string) => {
  // Base time slots
  const baseSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]

  // Randomly remove 1-3 slots to create variation
  const slotsToRemove = Math.floor(Math.random() * 3) + 1
  const availableSlots = [...baseSlots]

  for (let i = 0; i < slotsToRemove; i++) {
    const indexToRemove = Math.floor(Math.random() * availableSlots.length)
    availableSlots.splice(indexToRemove, 1)
  }

  return availableSlots.sort()
}

// Mock data for unscheduled bookings
const unscheduledBookings = [
  {
    id: 8,
    serviceName: "Personal Wellness Consultation",
    practitionerName: "Dr. Emily Parker",
    practitionerImage: "/practitioner-3.jpg",
    status: "unscheduled",
    description: "A personalized wellness consultation to help you create a balanced lifestyle plan.",
    price: "$95.00",
    bookingDate: "2023-06-08",
    bookingReference: "EST-WEL-4321",
    expiryDate: "2023-09-08", // 3 months from purchase
    duration: "60 min",
    location: "Virtual",
    purchaseType: "Single Session",
  },
  {
    id: 9,
    serviceName: "Yoga Therapy Package",
    practitionerName: "James Wilson",
    practitionerImage: "/practitioner-4.jpg",
    status: "unscheduled",
    description: "A series of 5 personalized yoga therapy sessions to address specific health concerns.",
    price: "$275.00",
    bookingDate: "2023-06-05",
    bookingReference: "EST-YOG-8765",
    expiryDate: "2024-06-05", // 1 year from purchase
    duration: "60 min per session",
    location: "Virtual",
    purchaseType: "Package (5 sessions)",
    sessionsRemaining: 5,
    sessionsTotal: 5,
  },
]

export default function ScheduleBookingPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [booking, setBooking] = useState<(typeof unscheduledBookings)[0] | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [timeSlotsByDate, setTimeSlotsByDate] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const bookingId = Number.parseInt(params.id)
    const foundBooking = unscheduledBookings.find((b) => b.id === bookingId)

    if (foundBooking) {
      setBooking(foundBooking)

      // Generate available dates (next 14 weekdays)
      const today = new Date()
      const dates = generateAvailableDates(today, 14)
      setAvailableDates(dates)

      // Generate time slots for each date
      const slots: Record<string, string[]> = {}
      dates.forEach((date) => {
        const dateString = format(date, "yyyy-MM-dd")
        slots[dateString] = generateTimeSlots(dateString)
      })
      setTimeSlotsByDate(slots)
    } else {
      // Booking not found, redirect back to bookings list
      router.push("/dashboard/user/bookings")
    }
  }, [params.id, router])

  // Update available times when date changes
  useEffect(() => {
    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd")
      setAvailableTimes(timeSlotsByDate[dateString] || [])
      setSelectedTime(null)
    } else {
      setAvailableTimes([])
      setSelectedTime(null)
    }
  }, [selectedDate, timeSlotsByDate])

  const handleScheduleBooking = () => {
    if (!selectedDate || !selectedTime) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)

      // Redirect after success message
      setTimeout(() => {
        router.push("/dashboard/user/bookings")
      }, 2000)
    }, 1500)
  }

  if (!booking) {
    return (
      <UserDashboardLayout title="Schedule Booking">
        <div className="flex justify-center items-center h-64">
          <p>Loading booking details...</p>
        </div>
      </UserDashboardLayout>
    )
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy")
  }

  return (
    <UserDashboardLayout title="Schedule Booking">
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

        {isSuccess ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-semibold text-green-800">Booking Scheduled!</h2>
                <p className="text-green-700 mt-2 mb-6">
                  Your session has been successfully scheduled for {selectedDate && formatDate(selectedDate)} at{" "}
                  {selectedTime}.
                </p>
                <Button onClick={() => router.push("/dashboard/user/bookings")}>Return to Bookings</Button>
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
                      <CardTitle className="text-2xl">{booking.serviceName}</CardTitle>
                      <CardDescription className="text-base mt-1">with {booking.practitionerName}</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-amber-400 text-amber-600">
                      Needs Scheduling
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-border">
                    <div className="flex max-sm:flex-col">
                      {/* Calendar */}
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={[
                          { before: new Date() },
                          (date) => {
                            // Disable dates that aren't in the available dates array
                            return !availableDates.some(
                              (availableDate) =>
                                availableDate.getDate() === date.getDate() &&
                                availableDate.getMonth() === date.getMonth() &&
                                availableDate.getFullYear() === date.getFullYear(),
                            )
                          },
                        ]}
                        className="p-2 sm:pe-5 bg-background"
                      />

                      {/* Time slots */}
                      <div className="relative w-full max-sm:h-48 sm:w-40">
                        <div className="absolute inset-0 border-border py-4 max-sm:border-t">
                          <ScrollArea className="h-full border-border sm:border-s">
                            <div className="space-y-3">
                              <div className="flex h-5 shrink-0 items-center px-5">
                                {selectedDate ? (
                                  <p className="text-sm font-medium">{format(selectedDate, "EEEE, d")}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Select a date</p>
                                )}
                              </div>

                              {selectedDate ? (
                                availableTimes.length > 0 ? (
                                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                    {availableTimes.map((timeSlot) => (
                                      <Button
                                        key={timeSlot}
                                        variant={selectedTime === timeSlot ? "default" : "outline"}
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setSelectedTime(timeSlot)}
                                      >
                                        {timeSlot}
                                      </Button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-5 py-2">
                                    <p className="text-sm text-muted-foreground">No available times</p>
                                  </div>
                                )
                              ) : (
                                <div className="px-5 py-2">
                                  <p className="text-sm text-muted-foreground">Please select a date first</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timezone note */}
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mr-1" />
                    All times shown in your local time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-6">
                  <div>
                    {selectedDate && selectedTime && (
                      <div className="text-sm">
                        <span className="font-medium">Selected:</span> {formatDate(selectedDate)} at {selectedTime}
                      </div>
                    )}
                  </div>
                  <Button disabled={!selectedDate || !selectedTime || isSubmitting} onClick={handleScheduleBooking}>
                    {isSubmitting ? "Scheduling..." : "Confirm Booking"}
                  </Button>
                </CardFooter>
              </Card>
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
                      </div>
                    </div>

                    {booking.purchaseType && (
                      <div className="flex items-start gap-3">
                        <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Purchase Type</p>
                          <p className="text-sm text-muted-foreground">{booking.purchaseType}</p>
                          {booking.sessionsRemaining && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {booking.sessionsRemaining} of {booking.sessionsTotal} sessions remaining
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {booking.expiryDate && (
                      <div className="flex items-start gap-3">
                        <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Expires On</p>
                          <p className="text-sm text-muted-foreground">{booking.expiryDate}</p>
                        </div>
                      </div>
                    )}
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
