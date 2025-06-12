"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Calendar, Clock, User, Users, Video, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for schedule
const mockSchedule = (() => {
  // Get current date
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentDate = today.getDate()

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  return [
    {
      id: "booking-123",
      title: "Mindfulness Meditation Session",
      clientName: "Emma Thompson",
      clientAvatar: "/extraterrestrial-encounter.png",
      date: formatDate(new Date(currentYear, currentMonth, currentDate)),
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      type: "session",
      location: "Virtual",
      status: "upcoming",
    },
    {
      id: "booking-456",
      title: "Career Coaching Session",
      clientName: "Michael Chen",
      clientAvatar: "/microphone-crowd.png",
      date: formatDate(new Date(currentYear, currentMonth, currentDate + 1)),
      startTime: "2:00 PM",
      endTime: "3:30 PM",
      type: "session",
      location: "In-Person",
      status: "upcoming",
    },
    {
      id: "booking-789",
      title: "Yoga for Stress Relief Workshop",
      clientName: "Multiple Attendees (8)",
      clientAvatar: null,
      date: formatDate(new Date(currentYear, currentMonth, currentDate + 2)),
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      type: "workshop",
      location: "Virtual",
      status: "upcoming",
    },
    {
      id: "booking-101",
      title: "Nutritional Consultation",
      clientName: "David Wilson",
      clientAvatar: "/abstract-dw.png",
      date: formatDate(new Date(currentYear, currentMonth, currentDate - 3)),
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      type: "session",
      location: "Virtual",
      status: "completed",
    },
    {
      id: "booking-102",
      title: "Life Coaching Course",
      clientName: "Multiple Attendees (12)",
      clientAvatar: null,
      date: formatDate(new Date(currentYear, currentMonth, currentDate - 4)),
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      type: "course",
      location: "Virtual",
      status: "completed",
    },
    {
      id: "booking-103",
      title: "Group Therapy Session",
      clientName: "Multiple Attendees (6)",
      clientAvatar: null,
      date: formatDate(new Date(currentYear, currentMonth, currentDate - 5)),
      startTime: "3:00 PM",
      endTime: "4:30 PM",
      type: "workshop",
      location: "In-Person",
      status: "canceled",
    },
  ]
})()

// Type color and variant mapping
const typeConfig = {
  session: { color: "primary", icon: User },
  workshop: { color: "secondary", icon: Users },
  course: { color: "success", icon: Users },
}

export default function PractitionerScheduleList() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<string>("upcoming")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Filter schedule based on selected tab and search term
  const filteredSchedule = mockSchedule.filter((event) => {
    const matchesTab = selectedTab === "all" || event.status === selectedTab
    const matchesSearch =
      searchTerm === "" ||
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  })

  const handleViewDetails = (eventId: string) => {
    router.push(`/dashboard/practitioner/schedule/${eventId}`)
  }

  return (
    <div>
      <Tabs defaultValue="upcoming" value={selectedTab} onValueChange={setSelectedTab} className="w-full mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="canceled">Canceled</TabsTrigger>
          </TabsList>
          <div className="relative">
            <input
              type="text"
              placeholder="Search bookings..."
              className="px-3 py-2 border rounded-md w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <ScheduleTable events={filteredSchedule} onViewDetails={handleViewDetails} />
        </TabsContent>
        <TabsContent value="upcoming" className="mt-0">
          <ScheduleTable events={filteredSchedule} onViewDetails={handleViewDetails} />
        </TabsContent>
        <TabsContent value="completed" className="mt-0">
          <ScheduleTable events={filteredSchedule} onViewDetails={handleViewDetails} />
        </TabsContent>
        <TabsContent value="canceled" className="mt-0">
          <ScheduleTable events={filteredSchedule} onViewDetails={handleViewDetails} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScheduleTable({
  events,
  onViewDetails,
}: { events: typeof mockSchedule; onViewDetails: (id: string) => void }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Client/Attendees</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length > 0 ? (
              events.map((event) => {
                const TypeIcon = typeConfig[event.type as keyof typeof typeConfig].icon

                return (
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => onViewDetails(event.id)}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          event.type === "session" ? "default" : event.type === "workshop" ? "secondary" : "outline"
                        }
                        className="flex items-center gap-1"
                      >
                        <TypeIcon className="h-3 w-3" />
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {event.clientAvatar ? (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={event.clientAvatar || "/placeholder.svg"} alt={event.clientName} />
                            <AvatarFallback>{event.clientName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{event.type === "workshop" ? "W" : "C"}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-sm">{event.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {event.startTime} - {event.endTime}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {event.location === "Virtual" ? (
                                <Video className="h-4 w-4 text-primary" />
                              ) : (
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {event.location === "Virtual" ? "Virtual Session" : "In-Person"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-sm">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => onViewDetails(event.id)}>View Details</DropdownMenuItem>
                          {event.status === "upcoming" && (
                            <>
                              {event.location === "Virtual" && (
                                <DropdownMenuItem>Join Virtual Session</DropdownMenuItem>
                              )}
                              <DropdownMenuItem>Reschedule</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Cancel Event</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
