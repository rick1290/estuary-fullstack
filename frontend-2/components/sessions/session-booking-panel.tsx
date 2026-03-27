"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Video, Globe, ArrowRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { bookingsCheckAvailabilityCreate, bookingsAvailableDatesCreate } from "@/src/client"
import { format, addDays, startOfDay } from "date-fns"

interface SessionBookingPanelProps {
  session: any
  /** When true, hides the image header — used inside the mobile drawer */
  compact?: boolean
}

export default function SessionBookingPanel({ session, compact = false }: SessionBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [visibleDates, setVisibleDates] = useState<Array<{ day: string; date: string; dateObj: Date }>>([])
  const [showAllTimes, setShowAllTimes] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [availableDatesMap, setAvailableDatesMap] = useState<Record<string, number>>({})
  const [isLoadingDates, setIsLoadingDates] = useState(true)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

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

  // Check if a date has availability
  const dateKey = (dateObj: Date) => format(dateObj, 'yyyy-MM-dd')
  const hasAvailability = useCallback(
    (dateObj: Date) => (availableDatesMap[dateKey(dateObj)] ?? 0) > 0,
    [availableDatesMap]
  )

  // Find the next date with availability after a given index
  const findNextAvailableIndex = useCallback((afterIndex: number): number | null => {
    for (let i = afterIndex + 1; i < allDates.length; i++) {
      if ((availableDatesMap[dateKey(allDates[i].dateObj)] ?? 0) > 0) return i
    }
    return null
  }, [allDates, availableDatesMap])

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
          date: format(dateObj, 'yyyy-MM-dd') as any,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })

      if (response.data && 'available_slots' in response.data) {
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

  // Fetch all available dates on mount
  useEffect(() => {
    if (!session?.id) return

    const fetchAvailableDates = async () => {
      setIsLoadingDates(true)
      try {
        const response = await bookingsAvailableDatesCreate({
          body: {
            service_id: session.id,
            days_ahead: 30,
          }
        })

        const data = response.data as any
        if (data?.available_dates) {
          const map: Record<string, number> = {}
          for (const entry of data.available_dates) {
            map[entry.date] = entry.slot_count
          }
          setAvailableDatesMap(map)

          // Auto-select the first date with availability
          const firstAvailable = allDates.find(d => map[dateKey(d.dateObj)] > 0)
          const target = firstAvailable || allDates[0]
          const dateLabel = `${target.day}, ${target.date}`
          setSelectedDate(dateLabel)

          // Scroll desktop carousel to show the selected date
          const targetIndex = allDates.indexOf(target)
          updateVisibleDates(Math.max(0, targetIndex - 1))

          // Fetch time slots for the selected date
          fetchAvailability(target.dateObj)

          // On mobile, scroll to show the first available date
          if (firstAvailable && mobileScrollRef.current) {
            const idx = allDates.indexOf(firstAvailable)
            // Each chip is ~56px wide (52px + 4px gap)
            setTimeout(() => {
              mobileScrollRef.current?.scrollTo({ left: Math.max(0, idx * 56 - 20), behavior: 'smooth' })
            }, 50)
          }
        } else {
          // Fallback if endpoint returns unexpected shape
          setAvailableDatesMap({})
          const firstDate = allDates[0]
          setSelectedDate(`${firstDate.day}, ${firstDate.date}`)
          updateVisibleDates(0)
          fetchAvailability(firstDate.dateObj)
        }
      } catch (error) {
        console.error('Failed to fetch available dates:', error)
        // Fallback: select today and fetch normally
        setAvailableDatesMap({})
        const firstDate = allDates[0]
        setSelectedDate(`${firstDate.day}, ${firstDate.date}`)
        updateVisibleDates(0)
        fetchAvailability(firstDate.dateObj)
      } finally {
        setIsLoadingDates(false)
      }
    }

    fetchAvailableDates()
  }, [session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateVisibleDates = (startIndex: number) => {
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
    setSelectedTime(null)
    setShowAllTimes(false)

    const selectedDateObj = allDates.find(d => `${d.day}, ${d.date}` === date)
    if (selectedDateObj) {
      fetchAvailability(selectedDateObj.dateObj)
    }
  }

  const handleSkipToNextAvailable = () => {
    const currentIdx = allDates.findIndex(d => `${d.day}, ${d.date}` === selectedDate)
    const nextIdx = findNextAvailableIndex(currentIdx)
    if (nextIdx === null) return

    const next = allDates[nextIdx]
    const dateLabel = `${next.day}, ${next.date}`
    setSelectedDate(dateLabel)
    setSelectedTime(null)
    setShowAllTimes(false)

    // Scroll desktop carousel
    updateVisibleDates(Math.max(0, nextIdx - 1))

    // Scroll mobile strip
    if (mobileScrollRef.current) {
      setTimeout(() => {
        mobileScrollRef.current?.scrollTo({ left: Math.max(0, nextIdx * 56 - 20), behavior: 'smooth' })
      }, 50)
    }

    fetchAvailability(next.dateObj)
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

    router.push(`/checkout?serviceId=${session.id}&type=session&date=${selectedDate}&time=${selectedTime}`)
  }

  // Check if there's a next available date after current selection
  const currentIdx = allDates.findIndex(d => `${d.day}, ${d.date}` === selectedDate)
  const hasNextAvailable = findNextAvailableIndex(currentIdx) !== null
  const totalAvailableDates = Object.values(availableDatesMap).filter(c => c > 0).length
  const noAvailabilityAtAll = !isLoadingDates && totalAvailableDates === 0

  const displayedTimeSlots = showAllTimes ? timeSlots : timeSlots.slice(0, 6)

  const practitioner = session.primary_practitioner
  const imageUrl = session.image_url
  const practitionerName = practitioner?.display_name || practitioner?.name
  const practitionerImage = practitioner?.profile_image_url
  const practitionerInitials = practitionerName
    ? practitionerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    : ''

  // Date chip component for reuse between desktop and mobile
  const DateChip = ({ date, isMobile = false }: { date: typeof allDates[0]; isMobile?: boolean }) => {
    const label = `${date.day}, ${date.date}`
    const isSelected = selectedDate === label
    const available = hasAvailability(date.dateObj)
    const datesLoaded = !isLoadingDates

    return (
      <div
        onClick={() => handleDateSelect(label)}
        className={`${isMobile ? 'flex-shrink-0 w-[52px]' : 'flex-1'} py-2 rounded-lg cursor-pointer text-center border-[1.5px] transition-all relative ${
          isSelected
            ? "border-olive-900 bg-olive-900 text-white"
            : datesLoaded && !available
              ? "border-sage-200/60 bg-sage-50/50 text-olive-400 opacity-50"
              : "border-sage-200 hover:border-terracotta-300 hover:bg-terracotta-50/30 bg-white text-olive-700"
        }`}
      >
        <p className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-medium uppercase tracking-wide leading-none ${
          isSelected ? 'text-white/60' : 'text-olive-400'
        }`}>{date.day}</p>
        <p className={`text-sm font-medium mt-1 leading-none ${
          isSelected ? 'text-white' : datesLoaded && !available ? 'text-olive-400' : 'text-olive-800'
        }`}>{date.date.split(' ')[1]}</p>
        {/* Availability dot indicator */}
        {datesLoaded && available && !isSelected && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
        )}
        {datesLoaded && available && isSelected && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-300" />
        )}
      </div>
    )
  }

  return (
    <div className={`w-full bg-white overflow-hidden ${compact ? '' : 'rounded-2xl border border-sage-200/60'}`}>
        {/* Image header with overlaid price */}
        {!compact && (
          <div className="relative">
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

            {/* Price badge overlaid on image */}
            <div className="absolute bottom-4 left-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-sm">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-olive-900">${session.price}</span>
                  <span className="text-[11px] font-light text-olive-500">per session</span>
                </div>
                <p className="text-[10px] font-light text-olive-400 mt-0.5">{session.duration_display || `${session.duration} minutes`} · 1-on-1</p>
              </div>
            </div>
          </div>
        )}

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

          {/* Date selector */}
          <div>
            <label className="text-[10px] font-medium tracking-widest uppercase text-olive-500 mb-3 block">Choose Your Date</label>

            {/* Desktop: arrows + visible chips */}
            <div className="hidden sm:block mb-5">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevDates}
                  disabled={visibleDates.length === 0 || (visibleDates[0]?.day === allDates[0].day && visibleDates[0]?.date === allDates[0].date)}
                  className="text-olive-400 hover:text-olive-600 hover:bg-sage-50 flex-shrink-0 h-7 w-7 rounded-lg border border-sage-200/60"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth="1.5" />
                </Button>

                <div className="flex gap-1.5 justify-center flex-1 overflow-hidden">
                  {visibleDates.map((date) => (
                    <DateChip key={date.date} date={date} />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextDates}
                  disabled={visibleDates.length === 0 || (visibleDates[visibleDates.length - 1]?.day === allDates[allDates.length - 1].day && visibleDates[visibleDates.length - 1]?.date === allDates[allDates.length - 1].date)}
                  className="text-olive-400 hover:text-olive-600 hover:bg-sage-50 flex-shrink-0 h-7 w-7 rounded-lg border border-sage-200/60"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth="1.5" />
                </Button>
              </div>
            </div>

            {/* Mobile: horizontal scrollable chips */}
            <div className="sm:hidden mb-5">
              <div ref={mobileScrollRef} className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {allDates.slice(0, 14).map((date) => (
                  <DateChip key={date.date} date={date} isMobile />
                ))}
              </div>
            </div>

            <Label className="text-[10px] font-medium tracking-widest uppercase text-olive-500 mb-3 block">
              Select Your Time
            </Label>

            {isLoadingSlots ? (
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-sage-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : timeSlots.length > 0 ? (
              <>
                <div className={`grid grid-cols-3 gap-2.5 mb-4 ${
                  showAllTimes && timeSlots.length > 9
                    ? 'max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-sage-300 scrollbar-track-sage-50'
                    : ''
                }`}>
                  {displayedTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`py-2 rounded-lg border-[1.5px] text-center text-xs font-medium transition-all ${
                        selectedTime === time
                          ? "border-olive-900 bg-olive-900 text-white"
                          : "border-sage-200 hover:border-terracotta-300 hover:bg-terracotta-50/30 bg-white text-olive-700"
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
            ) : noAvailabilityAtAll ? (
              <div className="text-center py-8 text-olive-600">
                <p className="text-sm">No availability in the next 30 days.</p>
                <p className="text-xs mt-2">Please check back later or contact the practitioner directly.</p>
              </div>
            ) : (
              <div className="text-center py-6 text-olive-600">
                <p className="text-sm">No available times on this date.</p>
                {hasNextAvailable && (
                  <button
                    onClick={handleSkipToNextAvailable}
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-terracotta-600 hover:text-terracotta-700 transition-colors"
                  >
                    Skip to next available
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
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
