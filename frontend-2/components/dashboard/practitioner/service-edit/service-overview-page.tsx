"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  serviceSessionsListOptions,
  serviceSessionsMarkCompletedCreateMutation,
  serviceSessionsMarkInProgressCreateMutation,
  serviceSessionsRescheduleCreateMutation,
  servicesPartialUpdateMutation,
  servicesRetrieveOptions,
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users, Star, Calendar as CalendarIcon, DollarSign, Eye, Clock,
  TrendingUp, CheckCircle2, PlayCircle, CalendarClock,
  ExternalLink, ArrowRight, Loader2, Settings,
  AlertTriangle, CalendarPlus, Archive, Package, Sparkles,
} from "lucide-react"
import { format, isFuture, isPast } from "date-fns"
import { cn } from "@/lib/utils"
import { getServiceDetailUrl } from "@/lib/service-utils"
import type { ServiceDetailReadable as ServiceReadable } from "@/src/client/types.gen"
import { CompactServiceHeader } from "./compact-service-header"
import { SessionsTable } from "./sessions-table"

interface ServiceOverviewPageProps {
  serviceId: string
}

export function ServiceOverviewPage({ serviceId }: ServiceOverviewPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch service data
  const { data: service, isLoading: serviceLoading, error: serviceError } = useQuery({
    ...servicesRetrieveOptions({ path: { id: parseInt(serviceId) } }),
  })

  const isWorkshop = service?.service_type_code === 'workshop'
  const isCourse = service?.service_type_code === 'course'
  const isSession = service?.service_type_code === 'session'
  const isBundle = service?.service_type_code === 'bundle'
  const isPackage = service?.service_type_code === 'package'
  const hasScheduledSessions = isWorkshop || isCourse
  const hasSessions = isWorkshop || isCourse || isSession

  // Fetch sessions for courses/workshops/sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    ...serviceSessionsListOptions({ query: { service_id: service?.id } }),
    enabled: hasSessions && !!service?.id,
  })

  const sessions = sessionsData?.results || []

  // Session stats
  const completedSessions = sessions.filter((s: any) => s.status === 'completed').length
  const inProgressSessions = sessions.filter((s: any) => s.status === 'in_progress').length
  const scheduledSessions = sessions.filter((s: any) => s.status === 'scheduled' || s.status === 'draft').length
  const totalSessions = sessions.length

  // Capacity across all sessions
  const totalBooked = sessions.reduce((sum: number, s: any) => sum + parseInt(s.booking_count || '0'), 0)
  const totalCapacity = sessions.reduce((sum: number, s: any) => sum + (s.max_participants || 0), 0)
  const capacityPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0

  // Service-level stats
  const totalBookings = parseInt(String(service?.total_bookings || '0'))
  const avgRating = parseFloat(String(service?.average_rating || '0'))
  const totalReviews = parseInt(String(service?.total_reviews || '0'))
  const waitlistCount = parseInt(String(service?.waitlist_count || '0'))
  const price = parseFloat(String(service?.price || '0'))

  // Mutations
  const invalidateSessions = () => {
    queryClient.invalidateQueries({
      queryKey: serviceSessionsListOptions({ query: { service_id: service?.id } }).queryKey
    })
  }

  const invalidateService = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] })
    queryClient.invalidateQueries({
      queryKey: servicesRetrieveOptions({ path: { id: parseInt(serviceId) } }).queryKey
    })
  }

  const markCompletedMutation = useMutation({
    ...serviceSessionsMarkCompletedCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session completed", description: "Session has been marked as completed." })
      invalidateSessions()
      invalidateService()
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.body?.detail || error?.message || "Could not mark session as completed", variant: "destructive" })
    }
  })

  const markInProgressMutation = useMutation({
    ...serviceSessionsMarkInProgressCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session started", description: "Session has been marked as in progress." })
      invalidateSessions()
      invalidateService()
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.body?.detail || error?.message || "Could not mark session as in progress", variant: "destructive" })
    }
  })

  const rescheduleMutation = useMutation({
    ...serviceSessionsRescheduleCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session rescheduled", description: "Session has been rescheduled. Enrolled participants will be notified." })
      invalidateSessions()
      invalidateService()
    },
    onError: (error: any) => {
      toast({ title: "Reschedule failed", description: error?.body?.detail || error?.message || "Could not reschedule session", variant: "destructive" })
    }
  })

  const archiveMutation = useMutation({
    ...servicesPartialUpdateMutation(),
    onSuccess: () => {
      toast({ title: "Service archived", description: "This service has been archived." })
      invalidateService()
    },
    onError: (error: any) => {
      toast({ title: "Archive failed", description: error?.message || "Could not archive service", variant: "destructive" })
    }
  })

  const isAnyMutating = markCompletedMutation.isPending || markInProgressMutation.isPending || rescheduleMutation.isPending

  const handleMarkCompleted = (sessionId: number) => {
    markCompletedMutation.mutate({
      path: { id: String(sessionId) },
      body: { service: service!.id! },
    })
  }

  const handleMarkInProgress = (sessionId: number) => {
    markInProgressMutation.mutate({
      path: { id: String(sessionId) },
      body: { service: service!.id! },
    })
  }

  const handleReschedule = (sessionId: number, startTime: string, endTime: string) => {
    rescheduleMutation.mutate({
      path: { id: String(sessionId) },
      body: {
        service: service!.id!,
        start_time: startTime,
        end_time: endTime,
      }
    })
  }

  // Loading state
  if (serviceLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CompactServiceHeader isLoading />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Error state
  if (serviceError || !service) {
    return (
      <div className="flex flex-col min-h-screen">
        <CompactServiceHeader backLabel="Services" />
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load service</p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const isDraft = service.status === 'draft'

  return (
    <div className="flex flex-col min-h-screen">
      <CompactServiceHeader service={service} />

      <div className="max-w-5xl mx-auto w-full px-4 py-4 sm:px-6 sm:py-6 space-y-6">

        {/* Draft nudge */}
        {isDraft && (
          <Card className="p-4 sm:p-5 border-2 border-sage-200 bg-gradient-to-r from-sage-50 to-cream-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100">
                  <Sparkles className="h-5 w-5 text-sage-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-olive-900">Complete your service setup</h3>
                  <p className="text-sm text-muted-foreground">
                    This service is still a draft. Complete the required settings to publish it.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="self-start sm:self-auto shrink-0"
                onClick={() => router.push(`/dashboard/practitioner/services/${serviceId}/settings`)}
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Open Settings
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Bookings */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">
                {isSession ? 'Bookings' : 'Enrolled'}
              </span>
            </div>
            <p className="font-serif text-2xl text-olive-900">{totalBookings}</p>
            {waitlistCount > 0 && (
              <p className="text-xs text-terracotta-600 mt-0.5">
                +{waitlistCount} waitlisted
              </p>
            )}
          </Card>

          {/* Rating */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Rating</span>
            </div>
            {avgRating > 0 ? (
              <>
                <p className="font-serif text-2xl text-olive-900">{avgRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            )}
          </Card>

          {/* Revenue estimate */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Est. Revenue</span>
            </div>
            <p className="font-serif text-2xl text-olive-900">
              ${(totalBookings * price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ${price} x {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
            </p>
          </Card>

          {/* Capacity / Duration / Sold */}
          {hasScheduledSessions ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">Capacity</span>
              </div>
              {totalCapacity > 0 ? (
                <>
                  <p className="font-serif text-2xl text-olive-900">{capacityPercent}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalBooked}/{totalCapacity} spots filled
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No limit set</p>
              )}
            </Card>
          ) : (isBundle || isPackage) ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">Sold</span>
              </div>
              <p className="font-serif text-2xl text-olive-900">{totalBookings}</p>
              {isBundle && service.sessions_included && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {service.sessions_included} sessions included
                </p>
              )}
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">Duration</span>
              </div>
              <p className="font-serif text-2xl text-olive-900">
                {service.duration_minutes || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">minutes per session</p>
            </Card>
          )}
        </div>

        {/* Sessions Table — Workshops, Courses, and 1:1 Sessions */}
        {hasSessions && (
          <>
            {/* Progress bar — only for workshops/courses with multiple sessions */}
            {hasScheduledSessions && totalSessions > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-olive-600" />
                    {isCourse ? 'Course Progress' : 'Session Delivery'}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {completedSessions}/{totalSessions} {isCourse ? 'modules' : 'sessions'} complete
                  </span>
                </div>
                <Progress
                  value={totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}
                  className="h-2 mb-3"
                />
                <div className="flex items-center gap-4 text-xs">
                  {completedSessions > 0 && (
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {completedSessions} completed
                    </span>
                  )}
                  {inProgressSessions > 0 && (
                    <span className="flex items-center gap-1 text-blue-700">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {inProgressSessions} in progress
                    </span>
                  )}
                  {scheduledSessions > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {scheduledSessions} upcoming
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* Sessions data table */}
            {sessionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalSessions > 0 ? (
              <SessionsTable
                sessions={sessions}
                serviceId={service.id!}
                serviceType={(service.service_type_code || 'session') as 'session' | 'workshop' | 'course' | 'bundle' | 'package'}
                isAnyMutating={isAnyMutating}
                onMarkInProgress={handleMarkInProgress}
                onMarkCompleted={handleMarkCompleted}
                onReschedule={handleReschedule}
              />
            ) : (
              <Card className="p-6 border-dashed text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {isSession
                    ? "No bookings yet. Clients will appear here once they book sessions."
                    : "No sessions have been added yet."
                  }
                </p>
                {!isSession && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/practitioner/services/${serviceId}/settings`)}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Add Sessions in Settings
                  </Button>
                )}
              </Card>
            )}

            {/* Link to add more sessions — only for workshops/courses */}
            {hasScheduledSessions && totalSessions > 0 && (
              <button
                onClick={() => router.push(`/dashboard/practitioner/services/${serviceId}/settings`)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Add or edit sessions in Settings
              </button>
            )}
          </>
        )}

        {/* Bundle/Package — Sold summary */}
        {(isBundle || isPackage) && (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100">
                <Package className="h-4 w-4 text-sage-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{isBundle ? 'Session Bundle' : 'Service Package'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isBundle
                    ? `This bundle includes ${service.sessions_included || '—'} sessions. ${totalBookings} sold so far.`
                    : `This package combines multiple services. ${totalBookings} sold so far.`
                  }
                </p>
                <Badge variant={service.is_purchasable ? "default" : "secondary"} className="mt-1">
                  {service.is_purchasable ? "Purchasable" : "Not purchasable"}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Ended Service Alert */}
        {service.has_ended && service.status === 'active' && hasSessions && (
          <Card className="border-2 border-terracotta-200 bg-terracotta-50 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100">
                  <AlertTriangle className="h-5 w-5 text-terracotta-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-terracotta-900">All sessions have ended</h3>
                  <p className="text-sm text-terracotta-700">
                    Add new dates to continue offering this service, or archive it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-terracotta-300 text-terracotta-700 hover:bg-terracotta-100"
                  onClick={() => router.push(`/dashboard/practitioner/services/${serviceId}/settings`)}
                >
                  <CalendarPlus className="h-4 w-4 mr-1.5" />
                  Add Dates in Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-terracotta-300 text-terracotta-700 hover:bg-terracotta-100"
                  onClick={() => {
                    archiveMutation.mutate({
                      path: { id: service.id! },
                      body: { status: 'archived', is_active: false, is_public: false },
                    })
                  }}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-1.5" />
                  )}
                  Archive
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start h-9" asChild>
              <Link href={getServiceDetailUrl(service)} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3.5 w-3.5 mr-2" />
                View Public Page
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start h-9" asChild>
              <Link href={`/dashboard/practitioner/bookings?search=${encodeURIComponent(service.name || '')}`}>
                <Users className="h-3.5 w-3.5 mr-2" />
                View Bookings
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
              </Link>
            </Button>
            {hasSessions && (
              <Button variant="outline" size="sm" className="justify-start h-9" asChild>
                <Link href={`/dashboard/practitioner/schedule?search=${encodeURIComponent(service.name || '')}`}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  View in Schedule
                  <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
                </Link>
              </Button>
            )}
            {service.status === 'active' && (
              <Button variant="outline" size="sm" className="justify-start h-9" asChild>
                <Link href={`/dashboard/practitioner/finances/transactions?search=${encodeURIComponent(service.name || '')}`}>
                  <DollarSign className="h-3.5 w-3.5 mr-2" />
                  View Transactions
                  <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
                </Link>
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
