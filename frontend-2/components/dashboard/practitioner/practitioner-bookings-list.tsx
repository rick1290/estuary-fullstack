"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, Clock, MoreVertical, User } from "lucide-react"

// Mock data for bookings
const mockBookings = [
  {
    id: "book-1",
    clientName: "Emma Thompson",
    clientAvatar: "/extraterrestrial-encounter.png",
    serviceName: "Mindfulness Meditation Session",
    date: "2023-05-15",
    time: "10:00 AM - 11:00 AM",
    status: "confirmed",
    price: "$85.00",
  },
  {
    id: "book-2",
    clientName: "Michael Chen",
    clientAvatar: "/microphone-crowd.png",
    serviceName: "Career Coaching Session",
    date: "2023-05-16",
    time: "2:00 PM - 3:30 PM",
    status: "pending",
    price: "$120.00",
  },
  {
    id: "book-3",
    clientName: "Sarah Johnson",
    clientAvatar: "/stylized-initials.png",
    serviceName: "Yoga for Stress Relief",
    date: "2023-05-17",
    time: "9:00 AM - 10:00 AM",
    status: "confirmed",
    price: "$65.00",
  },
  {
    id: "book-4",
    clientName: "David Wilson",
    clientAvatar: "/abstract-dw.png",
    serviceName: "Nutritional Consultation",
    date: "2023-05-18",
    time: "4:00 PM - 5:00 PM",
    status: "canceled",
    price: "$95.00",
  },
  {
    id: "book-5",
    clientName: "Jessica Lee",
    clientAvatar: "/intertwined-letters.png",
    serviceName: "Life Coaching Session",
    date: "2023-05-19",
    time: "11:00 AM - 12:30 PM",
    status: "confirmed",
    price: "$110.00",
  },
]

// Status badge variant mapping
const statusVariants = {
  confirmed: "success",
  pending: "warning",
  canceled: "destructive",
}

export default function PractitionerBookingsList() {
  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={booking.clientAvatar || "/placeholder.svg"} alt={booking.clientName} />
                      <AvatarFallback>{booking.clientName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{booking.clientName}</span>
                  </div>
                </TableCell>
                <TableCell>{booking.serviceName}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(booking.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.time}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      statusVariants[booking.status as keyof typeof statusVariants] as
                        | "default"
                        | "secondary"
                        | "destructive"
                        | "outline"
                        | "success"
                        | "warning"
                    }
                    className="capitalize"
                  >
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>{booking.price}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>View Client Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Reschedule</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive flex items-center gap-2">
                        Cancel Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {mockBookings.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No bookings found.</p>
        </div>
      )}
    </div>
  )
}
