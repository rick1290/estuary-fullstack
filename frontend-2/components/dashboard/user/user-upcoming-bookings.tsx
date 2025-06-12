"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin } from "lucide-react"

// Mock data for upcoming bookings
const upcomingBookings = [
  {
    id: 1,
    serviceName: "Mindfulness Meditation Session",
    practitionerName: "Dr. Sarah Johnson",
    practitionerImage: "/practitioner-1.jpg",
    practitionerInitials: "SJ",
    date: "2023-06-15",
    time: "10:00 AM",
    duration: "60 min",
    location: "Virtual",
    status: "upcoming",
  },
  {
    id: 2,
    serviceName: "Stress Management Workshop",
    practitionerName: "Michael Chen",
    practitionerImage: "/practitioner-2.jpg",
    practitionerInitials: "MC",
    date: "2023-06-18",
    time: "2:00 PM",
    duration: "90 min",
    location: "In-person",
    status: "upcoming",
  },
  {
    id: 3,
    serviceName: "Life Coaching Session",
    practitionerName: "Jessica Brown",
    practitionerImage: "/practitioner-3.jpg",
    practitionerInitials: "JB",
    date: "2023-06-20",
    time: "11:00 AM",
    duration: "60 min",
    location: "Virtual",
    status: "upcoming",
  },
]

export default function UserUpcomingBookings() {
  const [bookings] = useState(upcomingBookings)

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-US", options)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">You have no upcoming bookings</p>
            <Button>Explore Services</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg">{booking.serviceName}</h3>

                    <div className="flex items-center mt-2 mb-3">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage
                          src={booking.practitionerImage || "/placeholder.svg"}
                          alt={booking.practitionerName}
                        />
                        <AvatarFallback>{booking.practitionerInitials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">with {booking.practitionerName}</span>
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm">{formatDate(booking.date)}</span>
                      </div>

                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm">
                          {booking.time} ({booking.duration})
                        </span>
                      </div>

                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm">{booking.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between md:items-end">
                    <Badge variant="outline" className="mb-4 self-start md:self-end">
                      Upcoming
                    </Badge>

                    <div className="flex flex-col gap-2 w-full">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive border-destructive hover:bg-destructive/10"
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="text-center mt-6">
            <Button variant="outline">View All Bookings</Button>
          </div>
        </div>
      )}
    </div>
  )
}
