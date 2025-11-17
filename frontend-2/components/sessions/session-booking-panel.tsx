"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Video } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { bookingsCheckAvailabilityCreate } from "@/src/client"
import { format, addDays, startOfDay } from "date-fns"

interface SessionBookingPanelProps {
  session: any
}

export default function SessionBookingPanel({ session }: SessionBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [visibleDates, setVisibleDates] = useState<Array<{ day: string; date: string; dateObj: Date }>>([])
  const [showAllTimes, setShowAllTimes] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  // Generate dates for the next 30 days
  const generateDates = () => {
    const dates = []
    const today = startOfDay(new Date())
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i)
      dates.push({
        day: format(date, 'EEE'),
        date: format(date, 'MMM dd'),
        dateObj: date
      })
    }
    
    return dates
  }

  const allDates = generateDates()

  // Fetch availability when date changes
  const fetchAvailability = async (dateObj: Date) => {
    console.log('Session data:', session)
    console.log('Checking:', {
      practitioner_id: session?.primary_practitioner?.id,
      service_id: session?.id
    })
    if (!session?.primary_practitioner?.id || !session?.id) return
    
    setIsLoadingSlots(true)
    setTimeSlots([])
    
    try {
      const response = await bookingsCheckAvailabilityCreate({
        body: {
          practitioner_id: session.primary_practitioner.id,
          service_id: session.id,
          date: format(dateObj, 'yyyy-MM-dd') as any,  // Format as YYYY-MM-DD string
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      
      if (response.data && 'available_slots' in response.data) {
        // Format time slots from the response
        const slots = (response.data as any).available_slots.map((slot: any) => {
          const time = new Date(slot.start_time)
          return format(time, 'h:mm a')
        })
        setTimeSlots(slots)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      setTimeSlots([])
    } finally {
      setIsLoadingSlots(false)
    }
  }

  // Initialize with first date selected
  useEffect(() => {
    if (allDates.length > 0 && !selectedDate) {
      const firstDate = allDates[0]
      setSelectedDate(`${firstDate.day}, ${firstDate.date}`)
      updateVisibleDates(0)
      fetchAvailability(firstDate.dateObj)
    }
  }, [])

  const updateVisibleDates = (startIndex: number) => {
    // Show 3 dates on desktop, 2 on mobile
    const visibleCount = typeof window !== 'undefined' && window.innerWidth < 600 ? 2 : 3
    const endIndex = Math.min(startIndex + visibleCount, allDates.length)
    setVisibleDates(allDates.slice(startIndex, endIndex))
  }

  const handlePrevDates = () => {
    if (visibleDates.length === 0) return
    const currentStartIndex = allDates.findIndex(
      (date) => date.day === visibleDates[0].day && date.date === visibleDates[0].date
    )
    if (currentStartIndex > 0) {
      updateVisibleDates(currentStartIndex - 1)
    }
  }

  const handleNextDates = () => {
    if (visibleDates.length === 0) return
    const currentStartIndex = allDates.findIndex(
      (date) => date.day === visibleDates[0].day && date.date === visibleDates[0].date
    )
    if (currentStartIndex >= 0 && currentStartIndex < allDates.length - visibleDates.length) {
      updateVisibleDates(currentStartIndex + 1)
    }
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null) // Reset time when date changes
    
    // Find the date object and fetch availability
    const selectedDateObj = allDates.find(d => `${d.day}, ${d.date}` === date)
    if (selectedDateObj) {
      fetchAvailability(selectedDateObj.dateObj)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const toggleShowAllTimes = () => {
    setShowAllTimes(!showAllTimes)
  }

  const handleBookNow = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${session.id}&type=session&date=${selectedDate}&time=${selectedTime}`,
        serviceType: "session",
        title: "Sign in to Book Session",
        description: "Please sign in to book your wellness session"
      })
      return
    }

    // Redirect to checkout page with session details
    router.push(`/checkout?serviceId=${session.id}&type=session&date=${selectedDate}&time=${selectedTime}`)
  }

  // Display only first 6 time slots unless "show more" is clicked
  const displayedTimeSlots = showAllTimes ? timeSlots : timeSlots.slice(0, 6)

  return (
    <Card className="w-full border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden">
        {/* Service Image - Udemy Style */}
        <div className="relative w-full aspect-video bg-gradient-to-br from-sage-100 to-terracotta-100 overflow-hidden">
          {session.image_url ? (
            <img
              src={session.image_url}
              alt={session.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sage-400 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Session Preview</p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="bg-gradient-to-br from-sage-50 to-terracotta-50 p-6">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium text-olive-900">${session.price}</span>
              <span className="text-olive-700">per session</span>
            </div>
          </div>
          <p className="text-sm text-olive-600">{session.duration_display || `${session.duration} minutes`}</p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Key Info Points */}
          <div className="space-y-3 pb-6 border-b border-sage-200">
            <div className="flex items-center gap-3 text-olive-700">
              <Clock className="h-5 w-5 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
              <span className="text-sm font-medium">{session.duration_display || `${session.duration} minutes`} duration</span>
            </div>
            {session.location_type && (
              <div className="flex items-center gap-3 text-olive-700">
                {session.location_type === 'virtual' ? (
                  <Video className="h-5 w-5 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                ) : (
                  <MapPin className="h-5 w-5 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                )}
                <span className="text-sm font-medium capitalize">{session.location_type}</span>
              </div>
            )}
            {session.max_participants === 1 && (
              <div className="flex items-center gap-3 text-olive-700">
                <User className="h-5 w-5 text-sage-600 flex-shrink-0" strokeWidth="1.5" />
                <span className="text-sm font-medium">1-on-1 session</span>
              </div>
            )}
            {session.experience_level && (
              <div className="flex items-center gap-3 text-olive-700">
                <span className="text-sm font-medium capitalize">{session.experience_level.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Date selector - desktop version */}
          <div>
            <label className="text-sm font-medium text-olive-900 mb-3 block">Choose Your Date</label>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevDates}
                  disabled={visibleDates.length === 0 || (visibleDates[0]?.day === allDates[0].day && visibleDates[0]?.date === allDates[0].date)}
                  className="text-sage-600 hover:bg-sage-100 flex-shrink-0 h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth="1.5" />
                </Button>

                <div className="flex gap-1 justify-center flex-1 overflow-hidden">
                  {visibleDates.map((date) => (
                    <div
                      key={date.date}
                      onClick={() => handleDateSelect(`${date.day}, ${date.date}`)}
                      className={`px-3 py-2 rounded-lg cursor-pointer text-center min-w-[70px] border-2 transition-all ${
                        selectedDate === `${date.day}, ${date.date}`
                          ? "border-sage-600 bg-sage-600 text-white shadow-md"
                          : "border-sage-200 hover:border-sage-300 bg-white hover:bg-sage-50 text-olive-700"
                      }`}
                    >
                      <p className={`font-medium text-xs ${selectedDate === `${date.day}, ${date.date}` ? 'text-white' : ''}`}>{date.day}</p>
                      <p className={`text-xs mt-1 ${selectedDate === `${date.day}, ${date.date}` ? 'text-white' : ''}`}>{date.date}</p>
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextDates}
                  disabled={visibleDates.length === 0 || (visibleDates[visibleDates.length - 1]?.day === allDates[allDates.length - 1].day && visibleDates[visibleDates.length - 1]?.date === allDates[allDates.length - 1].date)}
                  className="text-sage-600 hover:bg-sage-100 flex-shrink-0 h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth="1.5" />
                </Button>
              </div>
            </div>

          {/* Date selector - mobile dropdown */}
          <div className="block sm:hidden mb-4">
            <Label htmlFor="date-select" className="mb-2 block">
              Select a date
            </Label>
            <Select value={selectedDate || ""} onValueChange={handleDateSelect}>
              <SelectTrigger id="date-select">
                <SelectValue placeholder="Select a date" />
              </SelectTrigger>
              <SelectContent>
                {allDates.map((date) => (
                  <SelectItem key={date.date} value={`${date.day}, ${date.date}`}>
                    {date.day}, {date.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <Label className="text-sm font-medium text-olive-900 mb-3 block">
              Select Your Time
            </Label>

            {isLoadingSlots ? (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-sage-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : timeSlots.length > 0 ? (
              <>
                <div className={`grid grid-cols-3 gap-2 mb-4 ${
                  showAllTimes && timeSlots.length > 9 
                    ? 'max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-sage-300 scrollbar-track-sage-50' 
                    : ''
                }`}>
                  {displayedTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`p-2 rounded-lg border-2 text-center text-xs font-medium transition-all ${
                        selectedTime === time
                          ? "border-sage-600 bg-sage-600 text-cream-50 shadow-md"
                          : "border-sage-200 hover:border-sage-300 bg-white hover:bg-sage-50 text-olive-700"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                {showAllTimes && timeSlots.length > 9 && (
                  <p className="text-xs text-olive-600 text-center mb-2">
                    Scroll to see all {timeSlots.length} available times
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-olive-600">
                <p className="text-sm">No available time slots for this date.</p>
                <p className="text-xs mt-2">Please select another date.</p>
              </div>
            )}
          </div>

          {!isLoadingSlots && timeSlots.length > 6 && (
            <button
              onClick={toggleShowAllTimes}
              className="text-xs text-primary hover:underline text-center w-full mb-4"
            >
              {showAllTimes ? `Show fewer times (${timeSlots.length} total)` : `Show all ${timeSlots.length} times`}
            </button>
          )}


          <Button 
            className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all" 
            onClick={handleBookNow} 
            disabled={!selectedTime || !selectedDate}
            size="lg"
          >
            Reserve Your Transformation
          </Button>

          <p className="text-sm text-center text-olive-600 mt-4">
            ✓ Instant confirmation • ✓ Secure checkout
          </p>
        </CardContent>
      </Card>
  )
}
