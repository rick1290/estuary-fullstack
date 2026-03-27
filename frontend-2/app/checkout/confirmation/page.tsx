"use client"

import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { bookingsRetrieveOptions, paymentsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import Link from "next/link"
import { CheckCircle2, Calendar, Clock, MapPin, User, Mail, Download, ArrowRight, Video, Copy, Check, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parseISO } from "date-fns"
import { useState, useEffect } from "react"

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)

  // Get IDs from URL parameters
  const orderId = searchParams.get("orderId")
  const bookingId = searchParams.get("bookingId")
  const serviceType = searchParams.get("type") || "session"

  // Fetch booking data
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingId || '' } }),
    enabled: !!bookingId,
  })

  // Fetch order/payment data
  const { data: order, isLoading: orderLoading } = useQuery({
    ...paymentsRetrieveOptions({ path: { id: parseInt(orderId || '0') } }),
    enabled: !!orderId && !isNaN(parseInt(orderId)),
  })

  const loading = bookingLoading || orderLoading
  const service = booking?.service
  // Practitioner comes directly from booking, not service
  const practitioner = booking?.practitioner
  // Use full public_uuid as confirmation number
  const confirmationNumber = booking?.public_uuid || booking?.booking_reference || `BK${booking?.id}`

  const copyConfirmation = () => {
    navigator.clipboard.writeText(confirmationNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Get title based on service type
  const getTitle = () => {
    switch (serviceType) {
      case "course": return "You're enrolled!"
      case "workshop": return "You're registered!"
      default: return "Booking confirmed!"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sage-50/30 to-white">
        <div className="w-full py-6 border-b border-sage-200 bg-gradient-to-r from-sage-50 to-terracotta-50">
          <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center font-bold text-xl tracking-widest">ESTUARY</Link>
          </div>
        </div>
        <div className="container max-w-3xl py-12 px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-10 w-64 mx-auto mb-2" />
            <Skeleton className="h-5 w-48 mx-auto" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (bookingError || !booking || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sage-50/30 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load booking details</p>
          <Button asChild>
            <Link href="/marketplace">Return to Marketplace</Link>
          </Button>
        </div>
      </div>
    )
  }

  const sessionTime = booking.service_session?.start_time
  const totalPaid = ((booking.final_amount_cents || order?.total_amount_cents || 0) / 100).toFixed(2)

  // Format session time in the booking's timezone if available, otherwise user's local timezone
  const bookingTimezone = (booking as any).timezone as string | undefined
  const formatSessionDate = (dateValue: string | Date) => {
    if (bookingTimezone) {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: bookingTimezone })
    }
    const iso = dateValue instanceof Date ? dateValue.toISOString() : dateValue
    return format(parseISO(iso), "MMM d, yyyy")
  }

  const formatSessionTime = (dateValue: string | Date) => {
    if (bookingTimezone) {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: bookingTimezone })
    }
    const iso = dateValue instanceof Date ? dateValue.toISOString() : dateValue
    return format(parseISO(iso), "h:mm a")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50/30 to-white">
      {/* Header */}
      <div className="w-full py-6 border-b border-sage-200 bg-gradient-to-r from-sage-50 to-terracotta-50">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center font-bold text-xl tracking-widest">ESTUARY</Link>
        </div>
      </div>

      <div className="container max-w-3xl py-6 sm:py-12 px-4 sm:px-6">
        {/* Success Header - Compact */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-sage-100 rounded-full mb-3 sm:mb-4">
            <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-sage-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-olive-900 mb-2">{getTitle()}</h1>
          <p className="text-sm sm:text-base text-olive-600">Confirmation sent to your email</p>
        </div>

        {/* Main Card */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-0">
            {/* Confirmation Number Bar */}
            <div className="bg-sage-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-sage-100">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Confirmation Number</p>
                  <p className="font-mono text-xs sm:text-sm font-medium text-olive-900 truncate">{confirmationNumber}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyConfirmation} className="h-9 min-w-[44px] px-3 flex-shrink-0">
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-sage-600" />
                      <span className="text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Service + Practitioner */}
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-6">
                {/* Service Image + Info */}
                <div className="flex items-start gap-3 sm:gap-4 w-full sm:flex-1 min-w-0">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-gradient-to-br from-sage-100 to-terracotta-100 overflow-hidden flex-shrink-0">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-xl sm:text-2xl font-medium text-olive-600">{service.name?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-base sm:text-lg text-olive-900 mb-1">{service.name}</h2>
                      {/* Price inline on mobile, separate column on desktop */}
                      <div className="text-right sm:hidden flex-shrink-0">
                        <p className="font-semibold text-olive-900">${totalPaid}</p>
                        <p className="text-xs text-muted-foreground">paid</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {practitioner?.profile_image_url ? (
                        <img
                          src={practitioner.profile_image_url}
                          alt={practitioner.name || practitioner.display_name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-sage-100 flex items-center justify-center">
                          <User className="h-3 w-3 text-olive-600" />
                        </div>
                      )}
                      <span className="text-sm text-olive-600">{practitioner?.name || practitioner?.display_name}</span>
                    </div>
                  </div>
                </div>
                {/* Price - desktop only (shown inline on mobile above) */}
                <div className="text-right hidden sm:block flex-shrink-0">
                  <p className="font-semibold text-olive-900">${totalPaid}</p>
                  <p className="text-xs text-muted-foreground">paid</p>
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-sage-50/50 rounded-lg">
                {sessionTime && (
                  <>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-sage-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium text-olive-900">{formatSessionDate(sessionTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-sage-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium text-olive-900">{formatSessionTime(sessionTime)}</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  {booking.location_type === "virtual" ? (
                    <Video className="h-4 w-4 text-sage-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-sage-600" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium text-olive-900">
                      {booking.location_type === "virtual" ? "Virtual Session" : "In-person"}
                    </p>
                  </div>
                </div>
                {booking.duration_minutes && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-sage-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium text-olive-900">{booking.duration_minutes} min</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps - Compact */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold text-olive-900 mb-4">What's next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-sage-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-olive-900">Check your email</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.location_type === "virtual"
                      ? "Join link and calendar invite sent"
                      : "Address and details sent"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-sage-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-olive-900">Add to your calendar</p>
                  <p className="text-sm text-muted-foreground">Calendar file attached to confirmation email</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 min-h-[44px]">
            <Link href="/dashboard/user/journeys">
              View My Journeys
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 min-h-[44px]">
            <Link href="/marketplace">Continue Browsing</Link>
          </Button>
        </div>

        {/* Pre-session forms prompt — after all existing content */}
        {booking?.public_uuid && (
          <FormsPrompt bookingUuid={booking.public_uuid} />
        )}

        {/* Receipt Link */}
        <div className="text-center mt-6">
          <Button variant="link" size="sm" className="text-muted-foreground">
            <Download className="h-3 w-3 mr-1" />
            Download Receipt
          </Button>
        </div>
      </div>
    </div>
  )
}

function FormsPrompt({ bookingUuid }: { bookingUuid: string }) {
  const [hasForms, setHasForms] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    fetch(`${baseUrl}/api/v1/intake/bookings/${bookingUuid}/forms/`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        const forms = data?.data || data
        setHasForms(forms?.has_forms || false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookingUuid])

  if (loading || !hasForms) return null

  return (
    <Card className="mt-6 border-sage-200/60">
      <CardContent className="py-5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-sage-50 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-sage-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-olive-900 mb-1">Pre-session form available</h3>
            <p className="text-sm text-olive-600 mb-3">
              Your practitioner has a quick form to help prepare for your session. You can complete it now or anytime before your appointment.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-sage-300 text-sage-700"
              asChild
            >
              <Link href={`/dashboard/user/bookings/${bookingUuid}/forms`}>
                Complete Form
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
