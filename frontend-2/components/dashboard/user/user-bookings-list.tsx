"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar,
  MapPin,
  Clock,
  Video,
  Info,
  ChevronRight,
  User,
  CalendarPlus,
  AlertCircle,
  Search,
  Filter,
  X,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

// Mock data for bookings
const bookings = [
  {
    id: 1,
    serviceName: "Mindfulness Meditation Session",
    practitionerName: "Dr. Sarah Johnson",
    practitionerImage: "/practitioner-1.jpg",
    date: "2023-06-15",
    time: "10:00 AM",
    duration: "60 min",
    location: "Virtual",
    status: "upcoming",
    serviceType: "session",
    description:
      "A guided meditation session focused on mindfulness techniques for stress reduction and improved focus.",
  },
  {
    id: 2,
    serviceName: "Stress Management Workshop",
    practitionerName: "Michael Chen",
    practitionerImage: "/practitioner-2.jpg",
    date: "2023-06-18",
    time: "2:00 PM",
    duration: "90 min",
    location: "In-person",
    address: "123 Wellness Center, Suite 200, San Francisco, CA",
    status: "upcoming",
    serviceType: "workshop",
    description: "Learn practical techniques to manage stress in your daily life and work environment.",
  },
  // Adding unscheduled bookings
  {
    id: 8,
    serviceName: "Personal Wellness Consultation",
    practitionerName: "Dr. Emily Parker",
    practitionerImage: "/practitioner-3.jpg",
    status: "unscheduled",
    serviceType: "session",
    description: "A personalized wellness consultation to help you create a balanced lifestyle plan.",
    price: "$95.00",
    bookingDate: "2023-06-08",
    bookingReference: "EST-WEL-4321",
    expiryDate: "2023-09-08", // 3 months from purchase
    duration: "60 min",
    location: "Virtual or In-person (your choice)",
    purchaseType: "Single Session",
  },
  {
    id: 9,
    serviceName: "Yoga Therapy Package",
    practitionerName: "James Wilson",
    practitionerImage: "/practitioner-4.jpg",
    status: "unscheduled",
    serviceType: "package",
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
    serviceType: "course",
    description: "An introduction to basic yoga poses and breathing techniques suitable for beginners.",
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
    serviceType: "session",
    description: "A personalized nutrition consultation to help you develop healthy eating habits.",
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
    serviceType: "session",
    description: "A one-on-one coaching session to help you identify and achieve your personal and professional goals.",
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
    serviceType: "workshop",
    description: "A workshop designed to help you navigate career transitions and identify new opportunities.",
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
    serviceType: "course",
    description:
      "An immersive meditation experience to help you disconnect from daily stressors and reconnect with yourself.",
  },
]

type BookingStatus = "all" | "unscheduled" | "upcoming" | "completed" | "cancelled"
type ServiceType = "all" | "session" | "course" | "workshop" | "package"

// Extract unique practitioner names for the filter
const uniquePractitioners = Array.from(new Set(bookings.map((booking) => booking.practitionerName)))

export default function UserBookingsList() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<BookingStatus>("all")
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType>("all")
  const [selectedPractitioners, setSelectedPractitioners] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Apply all filters to get filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Status filter
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false
      }

      // Service type filter
      if (serviceTypeFilter !== "all" && booking.serviceType !== serviceTypeFilter) {
        return false
      }

      // Practitioner filter
      if (selectedPractitioners.length > 0 && !selectedPractitioners.includes(booking.practitionerName)) {
        return false
      }

      // Search query (search in service name and practitioner name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          booking.serviceName.toLowerCase().includes(query) || booking.practitionerName.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [statusFilter, serviceTypeFilter, selectedPractitioners, searchQuery])

  // Navigate to booking details page
  const handleViewDetails = (bookingId: number) => {
    router.push(`/dashboard/user/bookings/${bookingId}`)
  }

  // Navigate to scheduling page
  const handleScheduleBooking = (e: React.MouseEvent, bookingId: number) => {
    e.stopPropagation()
    router.push(`/dashboard/user/bookings/${bookingId}/schedule`)
  }

  // Toggle practitioner selection
  const togglePractitioner = (practitioner: string) => {
    setSelectedPractitioners((prev) =>
      prev.includes(practitioner) ? prev.filter((p) => p !== practitioner) : [...prev, practitioner],
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setServiceTypeFilter("all")
    setSelectedPractitioners([])
    setSearchQuery("")
  }

  // Check if any filters are active
  const hasActiveFilters = serviceTypeFilter !== "all" || selectedPractitioners.length > 0 || searchQuery !== ""

  // Check if a session is joinable (within 1 hour of start time)
  const isSessionJoinable = (booking: (typeof bookings)[0]) => {
    if (booking.status !== "upcoming") return false
    if (!booking.date || !booking.time) return false

    // Parse the date and time
    const bookingDate = new Date(`${booking.date} ${booking.time}`)
    const now = new Date()

    // Calculate time difference in milliseconds
    const timeDiff = bookingDate.getTime() - now.getTime()

    // Check if within 1 hour (3600000 milliseconds)
    return timeDiff > 0 && timeDiff <= 3600000
  }

  // Get the current timezone for display
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneAbbr = new Date().toLocaleTimeString("en-us", { timeZoneName: "short" }).split(" ")[2]

  // Function to get badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "unscheduled":
        return "outline"
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

  // Function to get badge for service type
  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case "session":
        return (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
            Session
          </Badge>
        )
      case "course":
        return (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            Course
          </Badge>
        )
      case "workshop":
        return (
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-4 bg-purple-100 text-purple-800 hover:bg-purple-100"
          >
            Workshop
          </Badge>
        )
      case "package":
        return (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-green-100 text-green-800 hover:bg-green-100">
            Package
          </Badge>
        )
      default:
        return null
    }
  }

  // Function to render the appropriate booking card based on status
  const renderBookingCard = (booking: (typeof bookings)[0]) => {
    if (booking.status === "unscheduled") {
      return renderUnscheduledBookingCard(booking)
    }
    return renderScheduledBookingCard(booking)
  }

  // Render a card for an unscheduled booking
  const renderUnscheduledBookingCard = (booking: (typeof bookings)[0]) => {
    return (
      <Card
        key={booking.id}
        className="overflow-hidden transition-all hover:shadow-md cursor-pointer border-dashed group"
        onClick={() => handleViewDetails(booking.id)}
      >
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Status Indicator - dotted border for unscheduled */}
            <div className="w-full sm:w-1 h-1 sm:h-auto bg-amber-400" />

            <div className="flex-1 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                {/* Left side - Booking info */}
                <div className="flex items-start gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={booking.practitionerImage || "/placeholder.svg"} alt={booking.practitionerName} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <h3 className="font-medium text-base leading-tight">{booking.serviceName}</h3>
                      <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs px-1.5 py-0 h-4">
                        Schedule
                      </Badge>
                      {getServiceTypeBadge(booking.serviceType)}
                    </div>
                    <p className="text-muted-foreground text-sm">with {booking.practitionerName}</p>

                    {/* Purchase info - combined into fewer lines */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-amber-500" />
                        <span>Purchased {booking.bookingDate}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-amber-500" />
                        <span>{booking.duration}</span>
                      </div>
                      {booking.expiryDate && (
                        <div className="flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1 text-amber-500" />
                          <span>Expires {booking.expiryDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side - Actions */}
                <div>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1 h-7 px-2 text-xs"
                    onClick={(e) => handleScheduleBooking(e, booking.id)}
                  >
                    <CalendarPlus className="h-3 w-3" />
                    Schedule
                  </Button>
                </div>
              </div>

              {/* View details indicator - only show on hover */}
              <div className="flex justify-end mt-1 text-xs text-muted-foreground items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render a card for a scheduled booking
  const renderScheduledBookingCard = (booking: (typeof bookings)[0]) => {
    const joinable = isSessionJoinable(booking)

    return (
      <Card
        key={booking.id}
        className="overflow-hidden transition-all hover:shadow-md cursor-pointer group"
        onClick={() => handleViewDetails(booking.id)}
      >
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Status Indicator */}
            <div
              className={`w-full sm:w-1 h-1 sm:h-auto ${
                booking.status === "upcoming"
                  ? "bg-primary"
                  : booking.status === "completed"
                    ? "bg-green-500"
                    : "bg-red-500"
              }`}
            />

            <div className="flex-1 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                {/* Left side - Booking info */}
                <div className="flex items-start gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={booking.practitionerImage || "/placeholder.svg"} alt={booking.practitionerName} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <h3 className="font-medium text-base leading-tight">{booking.serviceName}</h3>
                      {getServiceTypeBadge(booking.serviceType)}
                    </div>
                    <p className="text-muted-foreground text-sm">with {booking.practitionerName}</p>

                    {/* Date, Time, Location - combined into fewer lines */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-primary" />
                        <span>{booking.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-primary" />
                        <span>
                          {booking.time} • {booking.duration}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-primary" />
                        <span>{booking.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Status and Actions */}
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusBadgeVariant(booking.status)} className="text-xs px-2 py-0 h-5">
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>

                  {booking.status === "upcoming" &&
                    booking.location === "Virtual" &&
                    (joinable ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 flex items-center gap-1 h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle join action
                        }}
                      >
                        <Video className="h-3 w-3" />
                        Join Now
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 h-7 px-2 text-xs"
                              disabled
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Video className="h-3 w-3" />
                              Join
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>You can join this session up to 1 hour before it begins</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                </div>
              </div>

              {/* View details indicator - only show on hover */}
              <div className="flex justify-end mt-1 text-xs text-muted-foreground items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Skeleton className="h-10 w-full sm:w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Status Filter Tabs */}
        <Tabs
          defaultValue={statusFilter}
          onValueChange={(value) => setStatusFilter(value as BookingStatus)}
          className="w-full sm:w-auto"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unscheduled">Unscheduled</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filter Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px] pl-8 h-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 py-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-md">
          {/* Service Type Filter */}
          <div>
            <span className="text-xs font-medium mr-2">Service Type:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {serviceTypeFilter === "all"
                    ? "All Types"
                    : serviceTypeFilter.charAt(0).toUpperCase() + serviceTypeFilter.slice(1)}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuCheckboxItem
                  checked={serviceTypeFilter === "all"}
                  onCheckedChange={() => setServiceTypeFilter("all")}
                >
                  All Types
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={serviceTypeFilter === "session"}
                  onCheckedChange={() => setServiceTypeFilter("session")}
                >
                  Sessions
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={serviceTypeFilter === "course"}
                  onCheckedChange={() => setServiceTypeFilter("course")}
                >
                  Courses
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={serviceTypeFilter === "workshop"}
                  onCheckedChange={() => setServiceTypeFilter("workshop")}
                >
                  Workshops
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={serviceTypeFilter === "package"}
                  onCheckedChange={() => setServiceTypeFilter("package")}
                >
                  Packages
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Practitioner Filter */}
          <div>
            <span className="text-xs font-medium mr-2">Practitioner:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {selectedPractitioners.length === 0
                    ? "All Practitioners"
                    : selectedPractitioners.length === 1
                      ? selectedPractitioners[0]
                      : `${selectedPractitioners.length} Selected`}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px]">
                <DropdownMenuLabel>Select Practitioners</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniquePractitioners.map((practitioner) => (
                  <DropdownMenuCheckboxItem
                    key={practitioner}
                    checked={selectedPractitioners.includes(practitioner)}
                    onCheckedChange={() => togglePractitioner(practitioner)}
                  >
                    {practitioner}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs ml-auto">
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>

          {serviceTypeFilter !== "all" && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 gap-1">
              {serviceTypeFilter.charAt(0).toUpperCase() + serviceTypeFilter.slice(1)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setServiceTypeFilter("all")}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          )}

          {selectedPractitioners.map((practitioner) => (
            <Badge key={practitioner} variant="outline" className="text-xs px-2 py-0.5 h-5 gap-1">
              {practitioner}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePractitioner(practitioner)}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          ))}

          {searchQuery && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 gap-1">
              "{searchQuery}"
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-4 w-4 p-0 ml-1">
                <X className="h-3 w-3" />
                <span className="sr-only">Remove search</span>
              </Button>
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs ml-auto">
            Clear All
          </Button>
        </div>
      )}

      {/* Timezone Note */}
      <div className="mb-2">
        <div className="flex items-center text-xs text-muted-foreground">
          <Info className="h-3 w-3 mr-1" />
          All times shown in your local time zone ({timezoneAbbr})
        </div>
      </div>

      {/* Unscheduled Bookings Alert - show only when there are unscheduled bookings and not filtering */}
      {statusFilter !== "unscheduled" && bookings.some((booking) => booking.status === "unscheduled") && (
        <Alert className="bg-amber-50 border-amber-200 mb-3 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800 text-sm">
              You have {bookings.filter((b) => b.status === "unscheduled").length} unscheduled{" "}
              {bookings.filter((b) => b.status === "unscheduled").length === 1 ? "booking" : "bookings"} that need
              attention.
              <Button
                variant="link"
                className="text-amber-600 p-0 h-auto text-sm ml-1"
                onClick={() => setStatusFilter("unscheduled")}
              >
                View
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <Alert className="my-3 py-2">
          <AlertDescription className="text-sm">
            No bookings found matching your filters.
            {hasActiveFilters && (
              <Button variant="link" className="text-primary p-0 h-auto text-sm ml-1" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Bookings Cards */}
      <div className="space-y-2">{filteredBookings.map((booking) => renderBookingCard(booking))}</div>
    </div>
  )
}
