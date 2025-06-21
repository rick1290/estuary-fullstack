"use client"

import { useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Eye, Calendar, GraduationCap, Users, Flower, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"

interface ClientServiceHistoryProps {
  clientId: string
}

export default function ClientServiceHistory({ clientId }: ClientServiceHistoryProps) {
  const [tabValue, setTabValue] = useState("all")

  // Fetch bookings for this client
  const { data, isLoading, error } = useQuery({
    ...bookingsListOptions({
      query: {
        client_id: parseInt(clientId),
        ordering: "-start_time"
      }
    }),
  })

  const bookings = data?.results || []

  const getFilteredHistory = () => {
    if (tabValue === "all") return bookings
    return bookings.filter((booking: any) => {
      const serviceType = booking.service?.service_type || "session"
      return serviceType === tabValue
    })
  }

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case "session":
        return <Flower className="h-4 w-4" />
      case "course":
        return <GraduationCap className="h-4 w-4" />
      case "workshop":
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Upcoming
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      case "pending":
      case "pending_payment":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full mb-4" />
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-16 w-full my-2" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load service history. Please try again later.</AlertDescription>
      </Alert>
    )
  }

  const filteredHistory = getFilteredHistory()

  return (
    <div>
      <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
        <TabsList className="grid grid-cols-4 mb-2">
          <TabsTrigger value="all">All Services</TabsTrigger>
          <TabsTrigger value="session">Sessions</TabsTrigger>
          <TabsTrigger value="course">Courses</TabsTrigger>
          <TabsTrigger value="workshop">Workshops</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No service history found</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((booking: any) => {
                const service = booking.service
                const serviceType = service?.service_type || "session"
                
                return (
                  <TableRow key={booking.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center">
                        <div className="mr-2 text-muted-foreground">
                          {getServiceTypeIcon(serviceType)}
                        </div>
                        <div>
                          <p className="font-medium">{service?.name || "Service"}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.duration_minutes || service?.duration_minutes || 0} min
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.start_time ? (
                        <>
                          <p>{format(parseISO(booking.start_time), "MMM d, yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(booking.start_time), "h:mm a")}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unscheduled</p>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>${booking.total_amount || 0}</TableCell>
                    <TableCell>
                      {booking.location_type === "virtual" ? "Virtual" : "In-Person"}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link href={`/dashboard/practitioner/bookings/${booking.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
