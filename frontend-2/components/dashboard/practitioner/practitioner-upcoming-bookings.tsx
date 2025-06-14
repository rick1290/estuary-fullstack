"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Calendar, Clock, Video, MapPin, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Mock data for upcoming bookings
const UPCOMING_BOOKINGS = [
  {
    id: 1,
    client: {
      name: "John Smith",
      avatar: "/diverse-group-city.png",
    },
    service: "Mindfulness Meditation Session",
    date: "Today",
    time: "2:00 PM - 3:00 PM",
    type: "Virtual",
    status: "confirmed",
  },
  {
    id: 2,
    client: {
      name: "Emily Johnson",
      avatar: "/diverse-group-city.png",
    },
    service: "Yoga for Beginners",
    date: "Tomorrow",
    time: "10:00 AM - 11:00 AM",
    type: "In-Person",
    status: "confirmed",
  },
  {
    id: 3,
    client: {
      name: "Michael Chen",
      avatar: "/diverse-group-city.png",
    },
    service: "Life Coaching Session",
    date: "May 15, 2023",
    time: "4:00 PM - 5:00 PM",
    type: "Virtual",
    status: "pending",
  },
]

export default function PractitionerUpcomingBookings() {
  const [tabValue, setTabValue] = useState("upcoming")

  return (
    <div className="space-y-4">
      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
      </Tabs>

      {UPCOMING_BOOKINGS.length > 0 ? (
        <div className="space-y-3">
          {UPCOMING_BOOKINGS.map((booking) => (
            <div
              key={booking.id}
              className="flex items-start space-x-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={booking.client.avatar || "/placeholder.svg"} alt={booking.client.name} />
                <AvatarFallback>{booking.client.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{booking.service}</div>
                  <Badge variant={booking.status === "confirmed" ? "success" : "outline"}>{booking.status}</Badge>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{booking.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.type === "Virtual" ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5" />
                    )}
                    <span>{booking.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>with {booking.client.name}</span>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Send Message</DropdownMenuItem>
                  <DropdownMenuItem>Reschedule</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Cancel Session</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">No upcoming bookings</p>
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard/practitioner/bookings" className="flex items-center gap-1">
            View All Bookings
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
