"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import LoginModal from "@/components/auth/login-modal"

interface SessionBookingPanelProps {
  session: any
}

export default function SessionBookingPanel({ session }: SessionBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [visibleDates, setVisibleDates] = useState<Array<{ day: string; date: string }>>([])
  const [showAllTimes, setShowAllTimes] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Mock dates for the date selector
  const allDates = [
    { day: "Mon", date: "Apr 22" },
    { day: "Tue", date: "Apr 23" },
    { day: "Wed", date: "Apr 24" },
    { day: "Thu", date: "Apr 25" },
    { day: "Fri", date: "Apr 26" },
    { day: "Sat", date: "Apr 27" },
    { day: "Sun", date: "Apr 28" },
    { day: "Mon", date: "Apr 29" },
    { day: "Tue", date: "Apr 30" },
  ]

  // Mock time slots
  const timeSlots = [
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
  ]

  // Initialize with first date selected
  useEffect(() => {
    if (allDates.length > 0 && !selectedDate) {
      setSelectedDate(`${allDates[0].day}, ${allDates[0].date}`)
      updateVisibleDates(0)
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
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const toggleShowAllTimes = () => {
    setShowAllTimes(!showAllTimes)
  }

  const handleBookNow = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    // Redirect to checkout page with session details
    router.push(`/checkout?serviceId=${session.id}&type=session&date=${selectedDate}&time=${selectedTime}`)
  }

  // Display only first 6 time slots unless "show more" is clicked
  const displayedTimeSlots = showAllTimes ? timeSlots : timeSlots.slice(0, 6)

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectUrl={`/checkout?serviceId=${session.id}&type=session&date=${selectedDate}&time=${selectedTime}`}
        serviceType="session"
      />

      <Card className="w-full border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-sage-50 to-terracotta-50 p-8 text-center">
          <p className="text-sm text-olive-700 mb-2">Transform Your Practice</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-medium text-olive-900">${session.price}</span>
            <span className="text-olive-700">per session</span>
          </div>
          <p className="text-sm text-olive-600 mt-2">{session.duration} minutes of personalized guidance</p>
        </div>
        <CardContent className="p-8">

          {/* Date selector - desktop version */}
          <div className="mb-6">
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
                      <p className="font-medium text-xs">{date.day}</p>
                      <p className="text-xs mt-1">{date.date}</p>
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

            <div className="grid grid-cols-3 gap-2 mb-4">
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
          </div>

          {timeSlots.length > 6 && (
            <button
              onClick={toggleShowAllTimes}
              className="text-xs text-primary hover:underline text-center w-full mb-4"
            >
              {showAllTimes ? "Show fewer times" : "Show more times"}
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
    </>
  )
}
