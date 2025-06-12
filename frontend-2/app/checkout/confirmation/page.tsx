"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Calendar, Clock, MapPin, User, Mail, Download, ArrowRight } from "lucide-react"
import { getServiceById } from "@/lib/services"
import { formatDate, formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [service, setService] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Get service ID and type from URL
  const serviceId = searchParams.get("serviceId")
  const serviceType = searchParams.get("type") || "session"

  // Generate a random booking ID
  const bookingId = "BK" + Math.floor(Math.random() * 10000000)

  useEffect(() => {
    // Fetch service data
    const fetchService = async () => {
      if (!serviceId) {
        setError("No service selected")
        setLoading(false)
        return
      }

      try {
        const serviceData = await getServiceById(serviceId)
        if (!serviceData) {
          setError("Service not found")
          setLoading(false)
          return
        }

        setService(serviceData)
        setLoading(false)
      } catch (err) {
        setError("Failed to load service data")
        setLoading(false)
      }
    }

    fetchService()
  }, [serviceId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button asChild>
            <Link href="/marketplace">Return to Marketplace</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Get confirmation title based on service type
  const getConfirmationTitle = () => {
    switch (serviceType) {
      case "course":
        return "You're enrolled!"
      case "workshop":
        return "You're registered!"
      case "package":
        return "Package purchased!"
      default:
        return "Booking confirmed!"
    }
  }

  // Get next steps message based on service type
  const getNextStepsMessage = () => {
    switch (serviceType) {
      case "course":
        return "Course materials and access instructions have been sent to your email."
      case "workshop":
        return "Workshop details and preparation materials have been sent to your email."
      case "package":
        return "You can now schedule your sessions from your dashboard."
      default:
        return `Instructions for joining your ${service.location_type === "virtual" ? "virtual session" : "session"} have been sent to your email.`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50/30 to-white">
      {/* Success Animation Area */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 to-transparent"></div>
        <div className="container max-w-4xl pt-16 pb-8 relative">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-medium mb-4">{getConfirmationTitle()}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Thank you for your{" "}
              {serviceType === "course" ? "enrollment" : serviceType === "workshop" ? "registration" : "booking"}.
              We've sent all the details to your email.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl pb-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Confirmation number</p>
                    <p className="text-lg font-medium font-mono">{bookingId}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmed</Badge>
                </div>

                <Separator className="mb-6" />

                <div className="space-y-6">
                  {/* Service Info */}
                  <div>
                    <h3 className="font-medium mb-3">Service Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-lg mb-1">{service.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} with{" "}
                        {service.primary_practitioner.display_name}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{service.location_type.charAt(0).toUpperCase() + service.location_type.slice(1)}</span>
                        </div>
                        {service.duration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{service.duration} minutes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sessions Schedule */}
                  {service.sessions && service.sessions.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">
                        {serviceType === "course" || serviceType === "workshop" ? "Schedule" : "Session Time"}
                      </h3>
                      <div className="space-y-3">
                        {service.sessions.slice(0, 3).map((session: any, index: number) => (
                          <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{session.title || `Session ${index + 1}`}</h4>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(session.start_time)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                <span>{service.primary_practitioner.display_name}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {service.sessions.length > 3 && (
                          <p className="text-sm text-gray-500 text-center">
                            + {service.sessions.length - 3} more sessions
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Next Steps */}
          <div className="space-y-6">
            {/* Next Steps Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-medium mb-4">What happens next?</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-warm-100 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-warm-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1">Check your email</p>
                      <p className="text-sm text-gray-600">{getNextStepsMessage()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-warm-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-warm-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1">Add to calendar</p>
                      <p className="text-sm text-gray-600">
                        We've included calendar invites in your confirmation email.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-warm-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-warm-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1">Prepare for your session</p>
                      <p className="text-sm text-gray-600">
                        Review any preparation materials sent by your practitioner.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-medium mb-4">Payment Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service fee</span>
                    <span>${Number(service.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing fee</span>
                    <span>$0.00</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total paid</span>
                    <span className="text-lg">${Number(service.price).toFixed(2)}</span>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full mt-4" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/dashboard/user/bookings">
                  View My Bookings
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/marketplace">Continue Browsing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}