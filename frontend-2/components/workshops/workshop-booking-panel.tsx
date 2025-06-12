"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, Sparkles } from "lucide-react"
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

      <Card className="border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-sage-100 to-terracotta-100 p-8 text-center">
          <p className="text-sm text-olive-700 mb-2">Transform Your Weekend</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-olive-900">${workshop.price}</span>
            <span className="text-olive-700">per person</span>
          </div>
          <p className="text-sm text-olive-600 mt-2">{Math.floor(workshop.duration / 60)} hours of transformation</p>
        </div>
        <CardContent className="p-8">

          {/* Date Selection */}
          {dates && dates.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-olive-800 mb-3 block flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-terracotta-500" />
                Select Your Journey Date
              </label>
              <Select value={selectedDateId} onValueChange={handleDateChange}>
                <SelectTrigger className="w-full border-sage-200 focus:border-sage-400">
                  <SelectValue placeholder="Choose a workshop date" />
                </SelectTrigger>
                <SelectContent>
                  {dates.map((date) => (
                    <SelectItem key={date.id} value={date.id.toString()}>
                      <div className="flex justify-between items-center w-full">
                        <span>{date.date}</span>
                        <Badge 
                          variant={date.spotsRemaining < 5 ? "destructive" : "sage"} 
                          className="ml-2"
                        >
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
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-sage-600" />
                <span className="text-olive-700">Date</span>
              </div>
              <span className="font-semibold text-olive-900">{selectedDate.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-sage-600" />
                <span className="text-olive-700">Time</span>
              </div>
              <span className="font-semibold text-olive-900">
                {selectedDate.startTime} - {selectedDate.endTime}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-sage-600" />
                <span className="text-olive-700">Format</span>
              </div>
              <span className="font-semibold text-olive-900">{workshop.location}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-sage-600" />
                <span className="text-olive-700">Available Spots</span>
              </div>
              <Badge variant="terracotta" className="font-semibold">
                {selectedDate.spotsRemaining} of {workshop.capacity}
              </Badge>
            </div>
          </div>

          <Separator className="bg-sage-200 mb-6" />

          <Button 
            className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
            onClick={handleRegisterClick}
            size="lg"
          >
            Begin Your Transformation
          </Button>

          <p className="text-sm text-center text-olive-600 mt-4">
            ✓ Full refund 48hrs before • ✓ Materials included
          </p>
        </CardContent>
      </Card>
    </>
  )
}
