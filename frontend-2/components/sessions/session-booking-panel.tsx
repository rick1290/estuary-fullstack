"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Video, Globe } from "lucide-react"
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

  const practitioner = session.primary_practitioner
  const imageUrl = session.image_url
  const practitionerName = practitioner?.display_name || practitioner?.name
  const practitionerImage = practitioner?.profile_image_url
  const practitionerInitials = practitionerName
    ? practitionerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    : ''

  return (
    <div className="w-full bg-white rounded-2xl border border-sage-200/60 overflow-hidden">
        {/* Image header with overlaid price + practitioner */}
        <div className="relative">
          {/* Background image or gradient */}
          <div className="aspect-[4/3] w-full">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={session.name || 'Session'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cream-100 via-sage-50 to-terracotta-50" />
            )}
          </div>

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Overlaid content */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            {/* Practitioner */}
            {practitioner && (
              <div className="flex items-center gap-2.5 mb-3">
                {practitionerImage ? (
                  <img
                    src={practitionerImage}
                    alt={practitionerName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white/70"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/70">
                    <span className="text-[10px] font-serif text-white">{practitionerInitials}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white leading-tight">{practitionerName}</p>
                  {practitioner.professional_title && (
                    <p className="text-[11px] font-light text-white/75">{practitioner.professional_title}</p>
                  )}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-white">${session.price}</span>
              <span className="text-xs font-light text-white/70">per session</span>
            </div>
            <p className="text-[11px] font-light text-white/60 mt-0.5">{session.duration_display || `${session.duration} minutes`} · 1-on-1</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key Info Points */}
          <div className="flex items-center justify-between text-xs text-olive-500 pb-4 border-b border-sage-200/60">
            {session.location_type && (
              <div className="flex items-center gap-1.5">
                {session.location_type === 'virtual' ? (
                  <Video className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-sage-500" strokeWidth="1.5" />
                )}
                <span className="font-medium text-olive-700 capitalize">{session.location_type}</span>
              </div>
            )}
            {session.experience_level && (
              <span className="font-medium text-olive-700 capitalize">{session.experience_level.replace('_', ' ')}</span>
            )}
          </div>

          {/* Date selector - desktop version */}
          <div>
            <label className="text-sm font-medium text-olive-800 mb-2.5 block">Choose Your Date</label>
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
                      className={`px-3 py-2 rounded-lg cursor-pointer text-center min-w-[70px] border transition-all ${
                        selectedDate === `${date.day}, ${date.date}`
                          ? "border-sage-600 bg-sage-600 text-white shadow-sm"
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
            <Label htmlFor="date-select" className="text-sm font-medium text-olive-800 mb-2 block">
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

            <Label className="text-sm font-medium text-olive-800 mb-2.5 block">
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
                      className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                        selectedTime === time
                          ? "border-sage-600 bg-sage-600 text-cream-50 shadow-sm"
                          : "border-sage-200/80 hover:border-sage-300 bg-white hover:bg-sage-50 text-olive-700"
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
              className="text-xs text-sage-600 hover:text-sage-700 hover:underline text-center w-full mb-4 font-light"
            >
              {showAllTimes ? `Show fewer times (${timeSlots.length} total)` : `Show all ${timeSlots.length} times`}
            </button>
          )}

          <Button
            className="w-full py-5 text-sm font-medium bg-olive-800 hover:bg-olive-700 text-white shadow-sm hover:shadow-md transition-all rounded-full"
            onClick={handleBookNow}
            disabled={!selectedTime || !selectedDate}
          >
            Reserve Your Session
          </Button>

          <div className="text-center text-olive-500 mt-3 space-y-1">
            <p className="text-xs font-light">Instant confirmation · Secure checkout</p>
            <p className="text-[11px] font-light flex items-center justify-center gap-1">
              <Globe className="h-3 w-3" />
              Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
  )
}
