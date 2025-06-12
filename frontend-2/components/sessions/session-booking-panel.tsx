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
    const visibleCount = window.innerWidth < 600 ? 2 : 3
    const endIndex = Math.min(startIndex + visibleCount, allDates.length)
    setVisibleDates(allDates.slice(startIndex, endIndex))
  }

  const handlePrevDates = () => {
    const currentStartIndex = allDates.findIndex(
      (date) => `${date.day}, ${date.date}` === visibleDates[0].day + ", " + visibleDates[0].date,
    )
    if (currentStartIndex > 0) {
      updateVisibleDates(currentStartIndex - 1)
    }
  }

  const handleNextDates = () => {
    const currentStartIndex = allDates.findIndex(
      (date) => `${date.day}, ${date.date}` === visibleDates[0].day + ", " + visibleDates[0].date,
    )
    if (currentStartIndex < allDates.length - visibleDates.length) {
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

      <Card className="w-full border border-gray-200">
        <CardContent className="p-6">
          {/* Price Display */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium text-gray-900">${session.price}</span>
              <span className="text-gray-600">/ session</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{session.duration} minutes • {session.location}</p>
          </div>

          {/* Date selector - desktop version */}
          <div className="hidden sm:block border-t border-b py-4 mb-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevDates}
                disabled={visibleDates[0]?.day === allDates[0].day}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex gap-2 justify-center flex-1">
                {visibleDates.map((date) => (
                  <div
                    key={date.date}
                    onClick={() => handleDateSelect(`${date.day}, ${date.date}`)}
                    className={`px-4 py-2 rounded-md cursor-pointer text-center min-w-[70px] border transition-all ${
                      selectedDate === `${date.day}, ${date.date}`
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <p className="font-medium text-sm">{date.day}</p>
                    <p className="text-xs">{date.date}</p>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextDates}
                disabled={visibleDates[visibleDates.length - 1]?.day === allDates[allDates.length - 1].day}
              >
                <ChevronRight className="h-4 w-4" />
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

          <Label className="mb-3 block text-sm font-medium text-gray-900">
            Select time
          </Label>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {displayedTimeSlots.map((time) => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={`p-2.5 rounded-md border text-center text-sm transition-all ${
                  selectedTime === time
                    ? "border-gray-900 bg-gray-900 text-white font-medium"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {time}
              </button>
            ))}
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
            className="w-full py-6 text-base font-medium" 
            onClick={handleBookNow} 
            disabled={!selectedTime || !selectedDate}
          >
            Book Session
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            Free cancellation up to 24 hours before
          </p>
        </CardContent>
      </Card>
    </>
  )
}
