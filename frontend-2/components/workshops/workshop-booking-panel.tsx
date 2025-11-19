"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Users, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ServiceSession {
  id: number
  title?: string
  description?: string
  start_time: string
  end_time: string
  duration?: number
  capacity?: number
  spots_available?: number
  is_published?: boolean
  location?: string
  room?: any
}

interface WorkshopBookingPanelProps {
  workshop: any
  serviceData?: any // The raw service data from API which includes sessions
}

export default function WorkshopBookingPanel({ workshop, serviceData }: WorkshopBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  
  // Extract sessions from serviceData
  const sessions = serviceData?.sessions || []
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  
  // Filter and sort sessions
  const upcomingSessions = sessions
    .filter((session: ServiceSession) => {
      const sessionDate = new Date(session.start_time)
      return sessionDate > new Date() && session.is_published !== false
    })
    .sort((a: ServiceSession, b: ServiceSession) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  
  // Set initial selection to first upcoming session
  useEffect(() => {
    if (upcomingSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(upcomingSessions[0].id.toString())
    }
  }, [upcomingSessions, selectedSessionId])

  const handleSessionChange = (value: string) => {
    setSelectedSessionId(value)
  }

  // Find the selected session
  const selectedSession = sessions.find((session: ServiceSession) => 
    session.id.toString() === selectedSessionId
  )

  const handleRegisterClick = () => {
    if (!selectedSessionId) {
      return
    }
    
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${workshop.id}&type=workshop&sessions=${selectedSessionId}`,
        serviceType: "workshop",
        title: "Sign in to Register for Workshop",
        description: "Please sign in to register for this transformative workshop"
      })
      return
    }

    // Redirect to checkout page with workshop details
    router.push(`/checkout?serviceId=${workshop.id}&type=workshop&sessions=${selectedSessionId}`)
  }

  return (
    <Card className="border-2 border-sage-200 bg-cream-50 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-terracotta-100 to-sage-100 p-8 text-center">
          <p className="text-sm text-olive-700 mb-2">Experience Transformation</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-olive-900">${workshop.price}</span>
            <span className="text-olive-700">per person</span>
          </div>
          <p className="text-sm text-olive-600 mt-2">{Math.floor(workshop.duration / 60)} hours immersive experience</p>
        </div>

      <CardContent className="p-8">
        {/* Workshop Quick Info */}
        <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Duration</span>
              </div>
              <span className="font-semibold text-olive-900">
                {Math.floor(workshop.duration / 60)} hours
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                <span className="text-olive-700">Format</span>
              </div>
              <span className="font-semibold text-olive-900">{workshop.location}</span>
            </div>
          </div>

          <Separator className="bg-sage-200 mb-6" />

          {/* Session Selection */}
          {upcomingSessions.length > 0 ? (
            <div className="mb-6">
              <label className="text-sm font-semibold text-olive-800 mb-3 block">
                Select Your Workshop Date
              </label>
              <Select value={selectedSessionId} onValueChange={handleSessionChange}>
                <SelectTrigger className="w-full border-sage-200 focus:border-sage-400">
                  <SelectValue placeholder="Choose a workshop date" />
                </SelectTrigger>
                <SelectContent>
                    {upcomingSessions.map((session: ServiceSession) => (
                      <SelectItem key={session.id} value={session.id.toString()}>
                        <div className="flex justify-between items-center w-full gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {format(new Date(session.start_time), 'EEE, MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-olive-600 truncate">
                              {format(new Date(session.start_time), 'h:mm a')} - {format(new Date(session.end_time), 'h:mm a')}
                            </div>
                          </div>
                          {session.spots_available !== undefined && (
                            <Badge
                              variant={session.spots_available < 5 ? "destructive" : "secondary"}
                              className="ml-auto text-[10px] px-1.5 py-0.5 h-auto leading-tight flex-shrink-0 whitespace-nowrap"
                            >
                              {session.spots_available} left
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No upcoming workshop sessions are currently available.
                </AlertDescription>
              </Alert>
            )}

          <Button
            className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={handleRegisterClick}
            size="lg"
            disabled={!selectedSessionId || upcomingSessions.length === 0}
          >
            {upcomingSessions.length === 0 ? "No Upcoming Sessions" : "Begin Your Transformation"}
          </Button>

          <p className="text-sm text-center text-olive-600 mt-4">
            ✓ Full refund 48hrs before • ✓ Materials included
          </p>
        </CardContent>
      </Card>
    )
}
