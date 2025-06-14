"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/toaster"
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
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import { CancelBookingDialog } from "@/components/dashboard/user/bookings/cancel-booking-dialog"

// Get current date for testing
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const dayAfterTomorrow = new Date(today)
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

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
  },
  {
    id: 3,
    serviceName: "Yoga for Beginners",
    practitionerName: "Emma Wilson",
    practitionerImage: "/practitioner-3.jpg",
    date: "2023-06-10",
    time: "9:00 AM",
    duration: "60 min",
    location: "Virtual",
    status: "completed",
    description: "An introduction to basic yoga poses and breathing techniques suitable for beginners.",
    price: "$60.00",
    bookingDate: "2023-05-25",
    bookingReference: "EST-YOG-9012",
    specialInstructions: "Wear comfortable clothing. Have a yoga mat ready if possible.",
    feedback: {
      rating: 5,
      comment:
        "Emma was fantastic! Very patient and clear with instructions. I feel much more confident to continue my yoga practice.",
    },
  },
  {
    id: 4,
    serviceName: "Nutritional Consultation",
    practitionerName: "Dr. Robert Smith",
    practitionerImage: "/practitioner-4.jpg",
    date: "2023-06-05",
    time: "3:30 PM",
    duration: "45 min",
    location: "In-person",
    address: "456 Health Center, Room 102, San Francisco, CA",
    status: "completed",
    description: "A personalized nutrition consultation to help you develop healthy eating habits.",
    price: "$90.00",
    bookingDate: "2023-05-20",
    bookingReference: "EST-NUT-3456",
    specialInstructions: "Please bring any recent medical records or lab results related to your nutrition.",
    feedback: {
      rating: 4,
      comment: "Dr. Smith provided valuable insights into my diet. The meal plan is practical and easy to follow.",
    },
  },
  {
    id: 5,
    serviceName: "Life Coaching Session",
    practitionerName: "Jessica Brown",
    practitionerImage: "/abstract-user-icon.png",
    date: "2023-06-20",
    time: "11:00 AM",
    duration: "60 min",
    location: "Virtual",
    status: "upcoming",
    description: "A one-on-one coaching session to help you identify and achieve your personal and professional goals.",
    price: "$85.00",
    bookingDate: "2023-06-05",
    bookingReference: "EST-LIF-7890",
    specialInstructions: "Take some time before our session to reflect on your current challenges and goals.",
    joinUrl: "https://estuary.com/video-room/456",
  },
  {
    id: 6,
    serviceName: "Career Guidance Workshop",
    practitionerName: "David Wilson",
    practitionerImage: "/abstract-user-icon.png",
    date: "2023-06-01",
    time: "2:00 PM",
    duration: "120 min",
    location: "Virtual",
    status: "cancelled",
    description: "A workshop designed to help you navigate career transitions and identify new opportunities.",
    price: "$110.00",
    bookingDate: "2023-05-15",
    bookingReference: "EST-CAR-2345",
    cancellationReason: "Practitioner unavailable due to emergency",
    cancellationDate: "2023-05-30",
    refundAmount: "$110.00",
  },
  {
    id: 7,
    serviceName: "Meditation Retreat",
    practitionerName: "Lisa Chen",
    practitionerImage: "/practitioner-2.jpg",
    date: new Date(Date.now() + 30 * 60000).toLocaleDateString(), // 30 minutes from now
    time: new Date(Date.now() + 30 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    duration: "180 min",
    location: "Virtual",
    status: "upcoming",
    description:
      "An immersive meditation experience to help you disconnect from daily stressors and reconnect with yourself.",
    price: "$150.00",
    bookingDate: "2023-06-07",
    bookingReference: "EST-MED-6789",
    specialInstructions:
      "Find a quiet space where you won't be disturbed for the full 3 hours. Have water and a light snack available.",
    joinUrl: "https://estuary.com/video-room/789",
  },
]

export default function BookingDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [booking, setBooking] = useState<(typeof bookings)[0] | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  useEffect(() => {
    const bookingId = Number.parseInt(params.id)
    const foundBooking = bookings.find((b) => b.id === bookingId)

    if (foundBooking) {
      setBooking(foundBooking)
    } else {
      // Booking not found, redirect back to bookings list
      router.push("/dashboard/user/bookings")
    }
  }, [params.id, router])

  if (!booking) {
    return (
      <UserDashboardLayout title="Booking Details">
        <div className="flex justify-center items-center h-64">
          <p>Loading booking details...</p>
        </div>
      </UserDashboardLayout>
    )
  }

  // Check if a session is joinable (within 1 hour of start time)
  const isSessionJoinable = () => {
    if (booking.status !== "upcoming") return false

    // Parse the date and time
    const bookingDate = new Date(`${booking.date} ${booking.time}`)
    const now = new Date()

    // Calculate time difference in milliseconds
    const timeDiff = bookingDate.getTime() - now.getTime()

    // Check if within 1 hour (3600000 milliseconds)
    return timeDiff > 0 && timeDiff <= 3600000
  }

  // Check if a session is reschedulable (more than 24 hours before start time)
  const isReschedulable = () => {
    if (booking.status !== "upcoming") return false

    // For testing purposes:
    // Booking ID 1 is within 24 hours (not reschedulable)
    // Booking ID 2 is outside 24 hours (reschedulable)
    return booking.id !== 1
  }

  // Check if a session is cancellable (more than 24 hours before start time)
  const isCancellable = () => {
    if (booking.status !== "upcoming") return false

    // For testing purposes:
    // Booking ID 1 is within 24 hours (not cancellable)
    // Booking ID 2 is outside 24 hours (cancellable)
    return booking.id !== 1
  }

  // Function to get badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "upcoming":
        return "default"
      case "completed":
        return "success"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const joinable = isSessionJoinable()
  const reschedulable = isReschedulable()
  const cancellable = isCancellable()

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Handle reschedule button click
  const handleReschedule = () => {
    router.push(`/dashboard/user/bookings/${booking.id}/reschedule`)
  }

  // Handle cancel button click
  const handleCancel = () => {
    setCancelDialogOpen(true)
  }

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
                    <CardTitle className="text-2xl">{booking.serviceName}</CardTitle>
                    <CardDescription className="text-base mt-1">with {booking.practitionerName}</CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(booking.status)} className="ml-2">
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-3 text-primary" />
                      <div>
                        <p className="font-medium">Date</p>
                        <p className="text-muted-foreground">{booking.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-3 text-primary" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-muted-foreground">
                          {booking.time} ({booking.duration})
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-3 text-primary" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{booking.location}</p>
                        {booking.address && <p className="text-muted-foreground text-sm">{booking.address}</p>}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-3 text-primary" />
                      <div>
                        <p className="font-medium">Booked on</p>
                        <p className="text-muted-foreground">{booking.bookingDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{booking.description}</p>
                </div>

                {booking.specialInstructions && (
                  <div>
                    <h3 className="font-medium mb-2">Special Instructions</h3>
                    <p className="text-muted-foreground">{booking.specialInstructions}</p>
                  </div>
                )}

                {booking.feedback && (
                  <div>
                    <h3 className="font-medium mb-2">Your Feedback</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex items-center mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < booking.feedback!.rating ? "text-yellow-400" : "text-gray-300"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">{booking.feedback.rating}/5 stars</span>
                      </div>
                      <p className="text-muted-foreground text-sm italic">"{booking.feedback.comment}"</p>
                    </div>
                  </div>
                )}

                {booking.cancellationReason && (
                  <div>
                    <h3 className="font-medium mb-2">Cancellation Details</h3>
                    <p className="text-muted-foreground">Reason: {booking.cancellationReason}</p>
                    <p className="text-muted-foreground">Cancelled on: {booking.cancellationDate}</p>
                    {booking.refundAmount && (
                      <p className="text-muted-foreground">Refund amount: {booking.refundAmount}</p>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-wrap justify-between gap-3 border-t pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="font-mono">{booking.bookingReference}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-semibold">{booking.price}</p>
                </div>
              </CardFooter>
            </Card>

            {/* Action buttons */}
            {booking.status === "upcoming" && (
              <div className="flex flex-wrap gap-3">
                {booking.location === "Virtual" && booking.joinUrl && (
                  <Button
                    className={`flex items-center gap-2 ${joinable ? "bg-green-600 hover:bg-green-700" : ""}`}
                    disabled={!joinable}
                  >
                    <Video className="h-4 w-4" />
                    {joinable ? "Join Session Now" : "Join Session"}
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
                          onClick={handleReschedule}
                          disabled={!reschedulable}
                        >
                          <CalendarRange className="h-4 w-4" />
                          Reschedule
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!reschedulable && (
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
                        <Button variant="destructive" onClick={handleCancel} disabled={!cancellable}>
                          Cancel Booking
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!cancellable && (
                      <TooltipContent>
                        <p>Cancellation is only available up to 24 hours before your session</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Rescheduling and cancellation policy note */}
            {booking.status === "upcoming" && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Rescheduling policy:</span> You can reschedule this session up to 24
                  hours before the start time.
                </p>
                <p>
                  <span className="font-medium">Cancellation policy:</span> You can cancel this session up to 24 hours
                  before the start time for a full refund.
                </p>
              </div>
            )}

            {booking.status === "completed" && !booking.feedback && <Button variant="secondary">Leave Feedback</Button>}
          </div>

          {/* Practitioner info */}
          <div>
            <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Practitioner</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={booking.practitionerImage || "/placeholder.svg"} alt={booking.practitionerName} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-lg">{booking.practitionerName}</h3>
                    <p className="text-sm text-muted-foreground">Wellness Practitioner</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <Button variant="outline" className="flex items-center justify-center gap-2 w-full">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Button>

                  <Button variant="outline" className="flex items-center justify-center gap-2 w-full">
                    <User className="h-4 w-4" />
                    View Profile
                  </Button>

                  {booking.status === "completed" && (
                    <Button variant="outline" className="flex items-center justify-center gap-2 w-full">
                      <Calendar className="h-4 w-4" />
                      Book Again
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {booking.status === "upcoming" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Cancellation Policy</CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Free cancellation up to 24 hours before your booking. After that, a 50% fee may apply. Please refer
                    to the practitioner's full cancellation policy for details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Dialog */}
      <CancelBookingDialog
        bookingId={booking.id}
        serviceName={booking.serviceName}
        practitionerName={booking.practitionerName}
        date={booking.date}
        time={booking.time}
        price={booking.price}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />

      {/* Toast notifications */}
      <Toaster />
    </UserDashboardLayout>
  )
}
