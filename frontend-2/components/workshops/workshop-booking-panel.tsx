"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, User } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import LoginModal from "@/components/auth/login-modal"

interface WorkshopDate {
  id: string | number
  date: string
  startTime: string
  endTime: string
  spotsRemaining: number
}

interface WorkshopBookingPanelProps {
  workshop: any
  dates?: WorkshopDate[]
}

export default function WorkshopBookingPanel({ workshop, dates }: WorkshopBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Find the most recent date as default selection
  const findMostRecentDate = (dates?: WorkshopDate[]) => {
    if (!dates || dates.length === 0) return ""

    // Get current date without time for comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Sort dates by proximity to today (future dates only)
    const futureDates = dates
      .filter((date) => new Date(date.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Return the closest future date, or the first date if all are in the past
    return futureDates.length > 0 ? futureDates[0].id.toString() : dates[0].id.toString()
  }

  const [selectedDateId, setSelectedDateId] = useState<string>(findMostRecentDate(dates))

  const handleDateChange = (value: string) => {
    setSelectedDateId(value)
  }

  // Find the selected date from the dates array
  const selectedDate = dates?.find((date) => date.id.toString() === selectedDateId) || {
    date: workshop.date,
    startTime: workshop.startTime,
    endTime: workshop.endTime,
    spotsRemaining: workshop.spotsRemaining,
  }

  const handleRegisterClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    // Redirect to checkout page with workshop details
    router.push(`/checkout?serviceId=${workshop.id}&type=workshop&date=${selectedDateId}`)
  }

  return (
    <>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectUrl={`/checkout?serviceId=${workshop.id}&type=workshop&date=${selectedDateId}`}
        serviceType="workshop"
      />

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          {/* Price Display */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium text-gray-900">${workshop.price}</span>
              <span className="text-gray-600">/ person</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{Math.floor(workshop.duration / 60)} hours • {workshop.location}</p>
          </div>

          {/* Date Selection */}
          {dates && dates.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-900 mb-2 block">Select Date</label>
              <Select value={selectedDateId} onValueChange={handleDateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a workshop date" />
                </SelectTrigger>
                <SelectContent>
                  {dates.map((date) => (
                    <SelectItem key={date.id} value={date.id.toString()}>
                      <div className="flex justify-between items-center w-full">
                        <span>{date.date}</span>
                        <Badge variant={date.spotsRemaining < 5 ? "destructive" : "secondary"} className="ml-2">
                          {date.spotsRemaining} spots left
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Workshop Details */}
          <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Date</span>
              <span className="font-medium text-gray-900">{selectedDate.date}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Time</span>
              <span className="font-medium text-gray-900">
                {selectedDate.startTime} - {selectedDate.endTime}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Duration</span>
              <span className="font-medium text-gray-900">{Math.floor(workshop.duration / 60)} hours</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Format</span>
              <span className="font-medium text-gray-900">{workshop.location}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Available Spots</span>
              <span className="font-medium text-gray-900">{selectedDate.spotsRemaining} of {workshop.capacity}</span>
            </div>
          </div>

          <Button 
            className="w-full py-6 text-base font-medium" 
            onClick={handleRegisterClick}
          >
            Register for Workshop
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            Full refund available up to 48 hours before
          </p>
        </CardContent>
      </Card>
    </>
  )
}
