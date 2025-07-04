"use client"

import React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, CalendarIcon, Video, User, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { bookingsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import type { BookingListReadable } from "@/src/client/types.gen"
import { startOfMonth, endOfMonth, addDays, format } from "date-fns"

// Mock data for calendar events
const mockEvents = (() => {
  // Get current date
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentDate = today.getDate()

  // Create events for the current week/month
  return [
    {
      id: "event-1",
      title: "Mindfulness Meditation",
      clientName: "Emma Thompson",
      clientAvatar: "/extraterrestrial-encounter.png",
      start: new Date(currentYear, currentMonth, currentDate, 10, 0), // Today at 10:00 AM
      end: new Date(currentYear, currentMonth, currentDate, 11, 0), // Today at 11:00 AM
      type: "session",
      location: "Virtual",
    },
    {
      id: "event-2",
      title: "Career Coaching",
      clientName: "Michael Chen",
      clientAvatar: "/microphone-crowd.png",
      start: new Date(currentYear, currentMonth, currentDate + 1, 14, 0), // Tomorrow at 2:00 PM
      end: new Date(currentYear, currentMonth, currentDate + 1, 15, 30), // Tomorrow at 3:30 PM
      type: "session",
      location: "In-Person",
    },
    {
      id: "event-3",
      title: "Yoga for Stress Relief",
      clientName: "Multiple Attendees (8)",
      clientAvatar: null,
      start: new Date(currentYear, currentMonth, currentDate + 2, 9, 0), // Day after tomorrow at 9:00 AM
      end: new Date(currentYear, currentMonth, currentDate + 2, 10, 0), // Day after tomorrow at 10:00 AM
      type: "workshop",
      location: "Virtual",
    },
    {
      id: "event-4",
      title: "Nutritional Consultation",
      clientName: "David Wilson",
      clientAvatar: "/abstract-dw.png",
      start: new Date(currentYear, currentMonth, currentDate + 3, 16, 0), // 3 days from now at 4:00 PM
      end: new Date(currentYear, currentMonth, currentDate + 3, 17, 0), // 3 days from now at 5:00 PM
      type: "session",
      location: "Virtual",
    },
    {
      id: "event-5",
      title: "Life Coaching Course",
      clientName: "Multiple Attendees (12)",
      clientAvatar: null,
      start: new Date(currentYear, currentMonth, currentDate + 4, 11, 0), // 4 days from now at 11:00 AM
      end: new Date(currentYear, currentMonth, currentDate + 4, 12, 30), // 4 days from now at 12:30 PM
      type: "course",
      location: "Virtual",
    },
    {
      id: "event-6",
      title: "Group Therapy Session",
      clientName: "Multiple Attendees (6)",
      clientAvatar: null,
      start: new Date(currentYear, currentMonth, currentDate + 5, 15, 0), // 5 days from now at 3:00 PM
      end: new Date(currentYear, currentMonth, currentDate + 5, 16, 30), // 5 days from now at 4:30 PM
      type: "workshop",
      location: "In-Person",
    },
    {
      id: "event-7",
      title: "Personal Development Workshop",
      clientName: "Multiple Attendees (10)",
      clientAvatar: null,
      start: new Date(currentYear, currentMonth, currentDate + 7, 13, 0), // 7 days from now at 1:00 PM
      end: new Date(currentYear, currentMonth, currentDate + 7, 15, 0), // 7 days from now at 3:00 PM
      type: "workshop",
      location: "Virtual",
    },
    {
      id: "event-8",
      title: "Executive Coaching",
      clientName: "Sarah Johnson",
      clientAvatar: "/stylized-initials.png",
      start: new Date(currentYear, currentMonth, currentDate + 10, 9, 0), // 10 days from now at 9:00 AM
      end: new Date(currentYear, currentMonth, currentDate + 10, 10, 0), // 10 days from now at 10:00 AM
      type: "session",
      location: "Virtual",
    },
  ]
})()

// Helper function to generate time slots
const generateTimeSlots = () => {
  const slots = []
  for (let i = 8; i <= 20; i++) {
    slots.push(`${i}:00`)
  }
  return slots
}

// Helper function to generate days for the week view
const generateWeekDays = (date: Date) => {
  const days = []
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay()) // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    days.push(day)
  }

  return days
}

// Helper function to generate days for the month view
const generateMonthDays = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const daysInMonth = lastDay.getDate()
  const startOffset = firstDay.getDay() // 0 for Sunday

  const days = []

  // Add days from previous month to fill the first week
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = new Date(year, month - 1, prevMonthLastDay - i)
    days.push(day)
  }

  // Add days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i)
    days.push(day)
  }

  // Add days from next month to complete the grid (6 rows x 7 columns)
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const day = new Date(year, month + 1, i)
    days.push(day)
  }

  return days
}

// Helper function to get events for a specific day
const getEventsForDay = (day: Date) => {
  return mockEvents.filter((event) => {
    const eventDate = new Date(event.start)
    return (
      eventDate.getDate() === day.getDate() &&
      eventDate.getMonth() === day.getMonth() &&
      eventDate.getFullYear() === day.getFullYear()
    )
  })
}

// Helper function to get events for a specific time slot on a specific day
const getEventsForTimeSlot = (day: Date, timeSlot: string) => {
  const [hour] = timeSlot.split(":").map(Number)

  return mockEvents.filter((event) => {
    const eventDate = new Date(event.start)
    const eventEndDate = new Date(event.end)

    return (
      eventDate.getDate() === day.getDate() &&
      eventDate.getMonth() === day.getMonth() &&
      eventDate.getFullYear() === day.getFullYear() &&
      eventDate.getHours() <= hour &&
      eventEndDate.getHours() > hour
    )
  })
}

interface PractitionerCalendarViewProps {
  view: "day" | "week" | "month"
}

export default function PractitionerCalendarView({ view = "week" }: PractitionerCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const router = useRouter()
  const { user } = useAuth()
  const timeSlots = generateTimeSlots()

  const weekDays = generateWeekDays(currentDate)
  const monthDays = generateMonthDays(currentDate)

  // Calculate date range for API query
  const dateRange = useMemo(() => {
    if (view === "day") {
      return { start: currentDate, end: currentDate }
    } else if (view === "week") {
      const start = weekDays[0]
      const end = weekDays[weekDays.length - 1]
      return { start, end }
    } else {
      const start = startOfMonth(currentDate)
      const end = addDays(endOfMonth(currentDate), 7) // Include some days from next month
      return { start, end }
    }
  }, [currentDate, view, weekDays])

  // Fetch bookings for the current view
  const { data: bookingsData, isLoading } = useQuery(
    bookingsListOptions({
      query: {
        practitioner_id: user?.practitionerId,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        status: 'confirmed,completed',
        page_size: 100
      }
    })
  )

  // Transform bookings into calendar events
  const events = useMemo(() => {
    if (!bookingsData?.results) return []
    
    return bookingsData.results.map((booking: BookingListReadable) => ({
      id: booking.id?.toString() || '',
      bookingId: booking.id,
      title: booking.service?.name || 'Unknown Service',
      clientName: booking.user?.full_name || booking.user?.email || 'Unknown Client',
      clientAvatar: booking.user?.avatar_url,
      start: new Date(booking.start_time),
      end: new Date(booking.end_time),
      type: booking.service?.service_type_code || 'session',
      location: booking.service?.location_type === 'virtual' ? 'Virtual' : 'In-Person',
      status: booking.status
    }))
  }, [bookingsData])

  // Update helper functions to use real events
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start)
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      )
    })
  }

  const getEventsForTimeSlot = (day: Date, timeSlot: string) => {
    const [hour] = timeSlot.split(":").map(Number)

    return events.filter((event) => {
      const eventDate = new Date(event.start)
      const eventEndDate = new Date(event.end)

      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear() &&
        eventDate.getHours() <= hour &&
        eventEndDate.getHours() > hour
      )
    })
  }

  const handleEventClick = (bookingId: number | undefined) => {
    if (bookingId) {
      router.push(`/dashboard/practitioner/bookings/${bookingId}`)
    }
  }

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (view === "day") {
      newDate.setDate(newDate.getDate() - 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (view === "day") {
      newDate.setDate(newDate.getDate() + 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const formatWeekRange = (days: Date[]) => {
    const firstDay = days[0]
    const lastDay = days[days.length - 1]

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${firstDay.toLocaleDateString("en-US", { month: "long" })} ${firstDay.getDate()} - ${lastDay.getDate()}, ${lastDay.getFullYear()}`
    } else {
      return `${firstDay.toLocaleDateString("en-US", { month: "short" })} ${firstDay.getDate()} - ${lastDay.toLocaleDateString("en-US", { month: "short" })} ${lastDay.getDate()}, ${lastDay.getFullYear()}`
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {view === "day" ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) :
           view === "week" ? formatWeekRange(weekDays) : formatMonthYear(currentDate)}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "day" ? (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[100px_1fr] min-w-[600px]">
            {/* Header row */}
            <div className="p-2 border-b border-r border-border"></div>
            <div className={`p-2 text-center border-b border-r border-border ${
              isToday(currentDate) ? "bg-primary/10" : "bg-background"
            }`}>
              <p className="text-sm font-medium">{currentDate.toLocaleDateString("en-US", { weekday: "long" })}</p>
              <p className="text-lg font-semibold">{currentDate.getDate()}</p>
            </div>

            {/* Time slots */}
            {timeSlots.map((timeSlot) => {
              const events = getEventsForTimeSlot(currentDate, timeSlot)

              return (
                <React.Fragment key={timeSlot}>
                  <div className="p-2 border-b border-r border-border flex items-center justify-center">
                    <span className="text-xs">{timeSlot}</span>
                  </div>
                  
                  <div className="p-2 border-b border-r border-border min-h-[80px] relative">
                    {events.map((event) => (
                      <Card
                        key={event.id}
                        className={`p-2 mb-1 cursor-pointer hover:shadow-md transition-shadow ${
                          event.type === "session"
                            ? "bg-primary/10"
                            : event.type === "workshop"
                              ? "bg-secondary/10"
                              : "bg-green-100"
                        } flex flex-col gap-0.5`}
                        onClick={() => handleEventClick(event.bookingId)}
                      >
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          {event.location === "Virtual" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Video className="h-4 w-4 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>Virtual Session</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {event.type === "session" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                          <div className="flex items-center gap-1">
                            {event.clientAvatar && (
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={event.clientAvatar || "/placeholder.svg"} alt={event.clientName} />
                                <AvatarFallback className="text-[10px]">{event.clientName.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="text-xs truncate">{event.clientName}</span>
                          </div>
                        </div>

                        <span className="text-xs">
                          {event.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -
                          {event.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </Card>
                    ))}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[100px_repeat(7,_1fr)] min-w-[900px]">
            {/* Header row with days */}
            <div className="p-2 border-b border-r border-border"></div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-2 text-center border-b border-r border-border ${
                  isToday(day) ? "bg-primary/10" : "bg-background"
                }`}
              >
                <p className="text-sm font-medium">{day.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className="text-lg font-semibold">{day.getDate()}</p>
              </div>
            ))}

            {/* Time slots */}
            {timeSlots.map((timeSlot, timeIndex) => (
              <React.Fragment key={timeSlot}>
                <div className="p-2 border-b border-r border-border flex items-center justify-center">
                  <span className="text-xs">{timeSlot}</span>
                </div>

                {weekDays.map((day, dayIndex) => {
                  const events = getEventsForTimeSlot(day, timeSlot)

                  return (
                    <div
                      key={`${timeIndex}-${dayIndex}`}
                      className="p-2 border-b border-r border-border min-h-[80px] relative"
                    >
                      {events.map((event) => (
                        <Card
                          key={event.id}
                          className={`p-2 mb-1 cursor-pointer hover:shadow-md transition-shadow ${
                            event.type === "session"
                              ? "bg-primary/10"
                              : event.type === "workshop"
                                ? "bg-secondary/10"
                                : "bg-green-100"
                          } flex flex-col gap-0.5`}
                          onClick={() => handleEventClick(event.bookingId)}
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            {event.location === "Virtual" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Video className="h-4 w-4 text-primary" />
                                  </TooltipTrigger>
                                  <TooltipContent>Virtual Session</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {event.type === "session" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            <div className="flex items-center gap-1">
                              {event.clientAvatar && (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={event.clientAvatar || "/placeholder.svg"} alt={event.clientName} />
                                  <AvatarFallback className="text-[10px]">{event.clientName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              )}
                              <span className="text-xs truncate">{event.clientName}</span>
                            </div>
                          </div>

                          <span className="text-xs">
                            {event.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -
                            {event.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </Card>
                      ))}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7">
            {/* Header row with weekday names */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center border-b border-r border-border font-medium">
                <p className="text-sm">{day}</p>
              </div>
            ))}

            {/* Calendar days */}
            {monthDays.map((day, index) => {
              const events = getEventsForDay(day)
              const isCurrentDay = isToday(day)
              const inCurrentMonth = isCurrentMonth(day)

              return (
                <div
                  key={index}
                  className={`p-2 border-b border-r border-border ${
                    isCurrentDay ? "bg-primary/10" : "bg-background"
                  } ${inCurrentMonth ? "opacity-100" : "opacity-50"} min-h-[120px]`}
                >
                  <p className={`text-sm ${isCurrentDay ? "font-bold" : "font-normal"} mb-2`}>{day.getDate()}</p>

                  {events.length > 0
                    ? events.slice(0, 3).map((event) => (
                        <Card
                          key={event.id}
                          className={`p-1 mb-1 cursor-pointer hover:shadow-md transition-shadow ${
                            event.type === "session"
                              ? "bg-primary/10"
                              : event.type === "workshop"
                                ? "bg-secondary/10"
                                : "bg-green-100"
                          }`}
                          onClick={() => handleEventClick(event.bookingId)}
                        >
                          <span className="text-xs block truncate">
                            {event.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="text-xs block truncate">{event.title}</span>
                        </Card>
                      ))
                    : null}

                  {events.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{events.length - 3} more</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
