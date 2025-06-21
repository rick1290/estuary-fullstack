"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, Clock, MoreVertical, User, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

// Status badge variant mapping
const statusVariants = {
  confirmed: "success" as const,
  pending: "secondary" as const,
  pending_payment: "warning" as const,
  cancelled: "destructive" as const,
  completed: "outline" as const,
}

export default function PractitionerBookingsList() {
  const router = useRouter()
  
  // Fetch bookings from API
  const { data, isLoading, error } = useQuery({
    ...bookingsListOptions({
      query: {
        ordering: "-created_at"
      }
    }),
  })

  const bookings = data?.results || []

  const formatTime = (startTime: string, duration?: number) => {
    try {
      const start = parseISO(startTime)
      const startStr = format(start, "h:mm a")
      if (duration) {
        const end = new Date(start.getTime() + duration * 60000)
        const endStr = format(end, "h:mm a")
        return `${startStr} - ${endStr}`
      }
      return startStr
    } catch {
      return startTime
    }
  }

  if (isLoading) {
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
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load bookings. Please try again later.</AlertDescription>
      </Alert>
    )
  }

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
            {bookings.map((booking: any) => {
              const client = booking.client
              const service = booking.service
              const statusKey = booking.status?.toLowerCase().replace(' ', '_') || 'pending'
              
              return (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage 
                          src={client?.profile_image_url} 
                          alt={client?.display_name || "Client"} 
                        />
                        <AvatarFallback>
                          {client?.display_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {client?.display_name || "Unknown Client"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{service?.name || "Service"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {booking.start_time && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(parseISO(booking.start_time), "EEE, MMM d")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatTime(booking.start_time, booking.duration_minutes)}
                            </span>
                          </div>
                        </>
                      )}
                      {!booking.start_time && (
                        <span className="text-sm text-muted-foreground">Unscheduled</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusVariants[statusKey as keyof typeof statusVariants] || "outline"
                      }
                      className="capitalize"
                    >
                      {booking.status || "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>${booking.total_amount || 0}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link 
                            href={`/dashboard/practitioner/bookings/${booking.id}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Calendar className="h-4 w-4" />
                            <span>View Details</span>
                          </Link>
                        </DropdownMenuItem>
                        {client && (
                          <DropdownMenuItem asChild>
                            <Link 
                              href={`/dashboard/practitioner/clients/${client.id}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <User className="h-4 w-4" />
                              <span>View Client Profile</span>
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {booking.status === "confirmed" && (
                          <>
                            <DropdownMenuItem className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Reschedule</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive flex items-center gap-2">
                              Cancel Booking
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No bookings found.</p>
        </div>
      )}
    </div>
  )
}
