"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { bookingsRetrieveOptions, paymentsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import Link from "next/link"
import { CheckCircle2, Calendar, Clock, MapPin, User, Mail, Download, ArrowRight, Sparkles, Globe, Loader2 } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format, parseISO } from "date-fns"

export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get IDs from URL parameters
  const orderId = searchParams.get("orderId")
  const bookingId = searchParams.get("bookingId")
  const serviceId = searchParams.get("serviceId")
  const serviceType = searchParams.get("type") || "session"

  // Fetch booking data
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    ...bookingsRetrieveOptions({ path: { id: parseInt(bookingId || '0') } }),
    enabled: !!bookingId && !isNaN(parseInt(bookingId)),
  })

  // Fetch order/payment data
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    ...paymentsRetrieveOptions({ path: { id: parseInt(orderId || '0') } }),
    enabled: !!orderId && !isNaN(parseInt(orderId)),
  })

  const loading = bookingLoading || orderLoading
  const error = bookingError || orderError
  const service = booking?.service

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sage-50/30 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
          <p className="text-sage-700">Loading your booking details...</p>
        </div>
      </div>
    )
  }

  if (error || !booking || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sage-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load booking details</p>
          <Button asChild className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800">
            <Link href="/marketplace">Return to Marketplace</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Extract practitioner info
  const practitioner = service.primary_practitioner || service.practitioner

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
    <div className="min-h-screen bg-gradient-to-b from-sage-50/30 to-white">
      {/* Header */}
      <div className="w-full py-6 border-b border-sage-200 bg-gradient-to-r from-sage-50 to-terracotta-50">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-medium tracking-tight text-olive-900">ESTUARY</h1>
          </Link>
        </div>
      </div>

      {/* Success Animation Area */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sage-100/50 via-terracotta-100/30 to-blush-100/50">
        <div className="absolute inset-0 texture-grain opacity-5"></div>
        <div className="container max-w-4xl pt-16 pb-12 relative">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full mb-6 shadow-lg">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-sage-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-olive-900 mb-4">{getConfirmationTitle()}</h1>
            <p className="text-xl text-olive-700 max-w-2xl mx-auto">
              Thank you for your{" "}
              {serviceType === "course" ? "enrollment" : serviceType === "workshop" ? "registration" : "booking"}.
              We've sent all the details to your email.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left Column - Booking Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Summary Card */}
            <Card className="border-2 border-sage-200 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-olive-600 mb-1">Confirmation number</p>
                    <p className="text-lg font-semibold font-mono text-olive-900">
                      {booking.booking_reference || booking.public_uuid?.slice(-8) || `BK${booking.id}`}
                    </p>
                  </div>
                  <Badge className="bg-sage-100 text-sage-800 border-sage-300 hover:bg-sage-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {booking.status_display || 'Confirmed'}
                  </Badge>
                </div>

                <Separator className="mb-6" />

                <div className="space-y-6">
                  {/* Service Info */}
                  <div>
                    <h3 className="font-semibold text-olive-900 mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-terracotta-600" />
                      Service Details
                    </h3>
                    <div className="bg-gradient-to-br from-sage-50 to-terracotta-50 rounded-xl p-5 border border-sage-200">
                      <h4 className="font-semibold text-lg text-olive-900 mb-2">
                        {service.name || service.title || 'Service'}
                      </h4>
                      <p className="text-olive-700 mb-4">
                        {service.service_type_display || service.service_type || serviceType} with{" "}
                        <span className="font-medium">
                          {practitioner?.display_name || 'Practitioner'}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          {booking.location_type === "virtual" ? (
                            <>
                              <Globe className="h-4 w-4 text-sage-600" />
                              <span className="text-olive-700 font-medium">Virtual Session</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 text-sage-600" />
                              <span className="text-olive-700">
                                {booking.location?.city ? `${booking.location.city}, ${booking.location.state_province}` : 'In-person'}
                              </span>
                            </>
                          )}
                        </div>
                        {booking.duration_minutes && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-sage-600" />
                            <span className="text-olive-700">{booking.duration_minutes} minutes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Booking Schedule */}
                  {booking.service_session?.start_time && (
                    <div>
                      <h3 className="font-semibold text-olive-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-terracotta-600" />
                        {serviceType === "course" || serviceType === "workshop" ? "Schedule" : "Session Time"}
                      </h3>
                      <div className="bg-sage-50/50 rounded-lg p-4 border border-sage-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-olive-900">
                            {booking.title || service.name || 'Session'}
                          </h4>
                          <Badge variant="outline" className="text-xs border-sage-300 text-sage-700">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(parseISO(booking.service_session?.start_time), "MMM d, yyyy")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-olive-700">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-sage-600" />
                            <span>
                              {format(parseISO(booking.service_session?.start_time), "h:mm a")}
                              {booking.service_session?.end_time && ` - ${format(parseISO(booking.service_session?.end_time), "h:mm a")}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-sage-600" />
                            <span>{practitioner?.display_name || 'Practitioner'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Next Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Steps Card */}
            <Card className="border-2 border-sage-200 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-olive-900 mb-5">What happens next?</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-sage-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-olive-900 mb-1">Check your email</p>
                      <p className="text-sm text-olive-700">{getNextStepsMessage()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-sage-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-olive-900 mb-1">Add to calendar</p>
                      <p className="text-sm text-olive-700">
                        We've included calendar invites in your confirmation email.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-sage-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-olive-900 mb-1">Prepare for your session</p>
                      <p className="text-sm text-olive-700">
                        Review any preparation materials sent by your practitioner.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="border-2 border-sage-200 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-olive-900 mb-5">Payment Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-olive-700">Service fee</span>
                    <span className="font-medium text-olive-900">
                      ${((booking.price_charged_cents || order?.subtotal_amount_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  {(order?.credits_applied_cents || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-olive-700">Credits applied</span>
                      <span className="font-medium text-green-600">
                        -${(order.credits_applied_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-olive-700">Processing fee</span>
                    <span className="font-medium text-olive-900">$0.00</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-olive-900">Total paid</span>
                    <span className="text-lg font-bold text-olive-900">
                      ${((booking.final_amount_cents || order?.total_amount_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-5 border-sage-300 text-sage-700 hover:bg-sage-50" 
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                asChild 
                className="w-full bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg"
              >
                <Link href="/dashboard/user/bookings">
                  View My Bookings
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                className="w-full border-sage-300 text-sage-700 hover:bg-sage-50"
              >
                <Link href="/marketplace">Continue Browsing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}