"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  serviceSessionsRetrieveOptions,
  serviceSessionsMarkCompletedCreateMutation,
  serviceSessionsMarkInProgressCreateMutation,
  serviceSessionsPartialUpdateMutation,
  servicesRetrieveOptions,
  recordingsPartialUpdateMutation,
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SessionResourcesSection } from "./session-resources-section"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
  ExternalLink,
  Loader2,
  Film,
  PlayCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Download,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { CompactServiceHeader } from "./compact-service-header"
import { SessionParticipantsList } from "./session-participants-list"

// Session status config
const SESSION_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Draft", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default", className: "bg-blue-600" },
  completed: { label: "Completed", variant: "default", className: "bg-green-600" },
  canceled: { label: "Canceled", variant: "destructive" },
}

interface SessionDetailPageProps {
  serviceId: string
  sessionId: string
  /** Override back navigation for standalone /sessions/[id] route */
  backHref?: string
  backLabel?: string
}

export function SessionDetailPage({
  serviceId,
  sessionId,
  backHref,
  backLabel,
}: SessionDetailPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch session data
  const { data: session, isLoading: sessionLoading, error: sessionError, refetch } = useQuery(
    serviceSessionsRetrieveOptions({ path: { id: parseInt(sessionId) } })
  )

  // Fetch parent service for breadcrumb/context
  const { data: service } = useQuery({
    ...servicesRetrieveOptions({ path: { id: parseInt(serviceId) } }),
    enabled: !!serviceId,
  })

  // Mutations
  const markCompletedMutation = useMutation({
    ...serviceSessionsMarkCompletedCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session completed", description: "Session has been marked as completed." })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.body?.detail || error?.message || "Could not update session", variant: "destructive" })
    },
  })

  const markInProgressMutation = useMutation({
    ...serviceSessionsMarkInProgressCreateMutation(),
    onSuccess: () => {
      toast({ title: "Session started", description: "Session has been marked as in progress." })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.body?.detail || error?.message || "Could not update session", variant: "destructive" })
    },
  })

  const updateRecordingMutation = useMutation({
    ...recordingsPartialUpdateMutation(),
    onSuccess: () => {
      refetch()
    },
  })

  const updateSessionMutation = useMutation({
    ...serviceSessionsPartialUpdateMutation(),
    onSuccess: () => {
      toast({ title: "Saved", description: "Session updated successfully." })
      refetch()
    },
    onError: (error: any) => {
      toast({ title: "Failed to save", description: error?.body?.detail || error?.message || "Could not save", variant: "destructive" })
    },
  })

  // State
  const [activeTab, setActiveTab] = useState("participants")
  const [newNote, setNewNote] = useState((session as any)?.practitioner_notes || "")
  const [newSharedNote, setNewSharedNote] = useState((session as any)?.shared_notes || "")

  // Sync notes from session data when loaded
  useEffect(() => {
    if (session) {
      setNewNote((session as any)?.practitioner_notes || "")
      setNewSharedNote((session as any)?.shared_notes || "")
    }
  }, [session])

  const isAnyMutating = markCompletedMutation.isPending || markInProgressMutation.isPending

  // Loading
  if (sessionLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CompactServiceHeader isLoading />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Error
  if (sessionError || !session) {
    return (
      <div className="flex flex-col min-h-screen">
        <CompactServiceHeader backLabel="Back" />
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  // Session info
  const sessionStatus = session.status || 'scheduled'
  const statusConfig = SESSION_STATUS_CONFIG[sessionStatus] || SESSION_STATUS_CONFIG.scheduled
  const canMarkInProgress = sessionStatus === 'scheduled' || sessionStatus === 'draft'
  const canMarkCompleted = sessionStatus === 'in_progress'
  const bookings = session.bookings || []
  const attendeeCount = session.booking_count || bookings.length || 0
  const maxParticipants = session.max_participants
  const waitlistCount = parseInt(String(session.waitlist_count || '0'))
  const spotsAvailable = maxParticipants ? Math.max(0, maxParticipants - attendeeCount) : null

  const sessionTitle = session.title ||
    `${session.service_name || session.service?.name || 'Session'}${session.sequence_number ? ` - Session ${session.sequence_number}` : ''}`

  const resolvedBackHref = backHref || `/dashboard/practitioner/services/${serviceId}`
  const resolvedBackLabel = backLabel || service?.name || "Service"

  // Session action buttons — shared between desktop header and mobile bar
  const actionButtons = (
    <>
      {canMarkInProgress && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 min-h-[44px] sm:min-h-0 text-xs"
          onClick={() => markInProgressMutation.mutate({
            path: { id: sessionId },
            body: { service: parseInt(serviceId) },
          })}
          disabled={isAnyMutating}
        >
          {markInProgressMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <PlayCircle className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
          )}
          Mark In Progress
        </Button>
      )}
      {canMarkCompleted && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 min-h-[44px] sm:min-h-0 text-xs"
          onClick={() => markCompletedMutation.mutate({
            path: { id: sessionId },
            body: { service: parseInt(serviceId) },
          })}
          disabled={isAnyMutating}
        >
          {markCompletedMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />
          )}
          Mark Completed
        </Button>
      )}
      {session.room?.public_uuid && (
        <Button size="sm" className="h-8 min-h-[44px] sm:min-h-0 text-xs" asChild>
          <Link href={`/room/${session.room.public_uuid}/lobby`}>
            <Video className="h-3.5 w-3.5 mr-1.5" />
            Join Room
          </Link>
        </Button>
      )}
    </>
  )

  // Desktop: inline in header. Mobile: hidden (shown below header instead)
  const headerActions = (
    <div className="hidden sm:flex items-center gap-2">
      {actionButtons}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <CompactServiceHeader
        service={service}
        backHref={resolvedBackHref}
        backLabel={resolvedBackLabel}
        title={sessionTitle}
        actions={headerActions}
      >
        {/* Status badge below title */}
        <div className="flex items-center gap-2 px-4 pb-2 flex-wrap">
          <Badge variant={statusConfig.variant} className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
          {session.start_time && (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {format(parseISO(session.start_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </span>
              <span className="text-xs text-muted-foreground sm:hidden">
                {format(parseISO(session.start_time), "MMM d, yyyy · h:mm a")}
              </span>
            </>
          )}
        </div>

        {/* Mobile action buttons — below header, full width */}
        {(canMarkInProgress || canMarkCompleted || session.room?.public_uuid) && (
          <div className="flex sm:hidden items-center gap-2 px-4 pb-3 overflow-x-auto">
            {actionButtons}
          </div>
        )}
      </CompactServiceHeader>

      <div className="max-w-6xl mx-auto w-full px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main content (2/3) */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="recordings">Recordings</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              {/* Participants tab */}
              <TabsContent value="participants" className="mt-4">
                <SessionParticipantsList
                  bookings={bookings}
                  sessionId={parseInt(sessionId)}
                  serviceId={parseInt(serviceId)}
                  onRefresh={() => refetch()}
                />
              </TabsContent>

              {/* Resources tab */}
              <TabsContent value="resources" className="mt-4">
                <SessionResourcesSection sessionId={parseInt(sessionId)} />
              </TabsContent>

              {/* Recordings tab */}
              <TabsContent value="recordings" className="space-y-4 mt-4">
                <h2 className="text-sm font-medium">Session Recordings</h2>
                {session.recordings && session.recordings.length > 0 ? (
                  <div className="space-y-3">
                    {session.recordings.map((recording: any, index: number) => (
                      <Card key={recording.recording_id || index}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Film className="h-4 w-4 text-primary shrink-0" />
                                  <h4 className="font-medium text-sm">Recording {index + 1}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {recording.file_format?.toUpperCase() || 'MP4'}
                                  </Badge>
                                  <Badge
                                    variant={recording.status === 'completed' ? 'default' : 'secondary'}
                                    className="text-xs capitalize"
                                  >
                                    {recording.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {recording.duration_formatted || `${Math.floor(recording.duration_seconds / 60)} min`}
                                  </span>
                                  {recording.started_at && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(parseISO(recording.started_at), "MMM d, h:mm a")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {recording.status === 'completed' && (
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">
                                    {recording.is_available ? 'Visible' : 'Hidden'}
                                  </span>
                                  <Switch
                                    checked={recording.is_available}
                                    onCheckedChange={(checked) => {
                                      updateRecordingMutation.mutate({
                                        path: { id: recording.id },
                                        body: { is_available: checked }
                                      })
                                    }}
                                  />
                                </div>
                                {recording.download_url && (
                                  <Button variant="outline" size="sm" className="h-8" asChild>
                                    <a href={recording.download_url} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-3.5 w-3.5 mr-1.5" />
                                      Download
                                    </a>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Film className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No recordings available</p>
                      <p className="text-xs text-muted-foreground mt-1">Recordings will appear here after virtual sessions</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Notes tab */}
              <TabsContent value="notes" className="space-y-6 mt-4">
                {/* Private notes */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Private Notes</h3>
                  <p className="text-xs text-muted-foreground">Only visible to you</p>
                  <Textarea
                    placeholder="Add a private note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    size="sm"
                    disabled={newNote === ((session as any)?.practitioner_notes || "") || updateSessionMutation.isPending}
                    onClick={() => {
                      updateSessionMutation.mutate({
                        path: { id: session.id },
                        body: { practitioner_notes: newNote } as any,
                      })
                    }}
                  >
                    {updateSessionMutation.isPending ? "Saving..." : "Save Note"}
                  </Button>
                </div>

                <Separator />

                {/* Shared notes */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Shared Notes</h3>
                  <p className="text-xs text-muted-foreground">Visible to all participants</p>
                  <Textarea
                    placeholder="Add a note to share with participants..."
                    value={newSharedNote}
                    onChange={(e) => setNewSharedNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    size="sm"
                    disabled={newSharedNote === ((session as any)?.shared_notes || "") || updateSessionMutation.isPending}
                    onClick={() => {
                      updateSessionMutation.mutate({
                        path: { id: session.id },
                        body: { shared_notes: newSharedNote } as any,
                      })
                    }}
                  >
                    {updateSessionMutation.isPending ? "Saving..." : "Save Shared Note"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-4">
            {/* Session Details card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.start_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{format(parseISO(session.start_time), "EEEE, MMMM d, yyyy")}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(parseISO(session.start_time), "h:mm a")}
                        {session.end_time && ` - ${format(parseISO(session.end_time), "h:mm a")}`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  {session.service?.location_type === "virtual" ? (
                    <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="capitalize">{session.service?.location_type || 'Virtual'}</p>
                    {session.room?.public_uuid && (
                      <Link
                        href={`/room/${session.room.public_uuid}/lobby`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Join Session <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {session.service?.description && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {session.service.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Capacity card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Enrolled</span>
                  <span className="font-medium">
                    {attendeeCount}{maxParticipants ? ` / ${maxParticipants}` : ''}
                  </span>
                </div>
                {maxParticipants && maxParticipants > 0 && (
                  <Progress
                    value={Math.min((attendeeCount / maxParticipants) * 100, 100)}
                    className="h-2"
                  />
                )}
                {waitlistCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Waitlisted</span>
                    <span className="text-amber-600 font-medium">{waitlistCount}</span>
                  </div>
                )}
                {spotsAvailable !== null && spotsAvailable > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Available</span>
                    <span className="text-green-700 font-medium">{spotsAvailable}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status / Lifecycle card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={statusConfig.variant} className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
                <div className="space-y-2">
                  {canMarkInProgress && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start min-h-[44px]"
                      onClick={() => markInProgressMutation.mutate({
                        path: { id: sessionId },
                        body: { service: parseInt(serviceId) },
                      })}
                      disabled={isAnyMutating}
                    >
                      {markInProgressMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5 mr-2 text-blue-600" />
                      )}
                      Mark In Progress
                    </Button>
                  )}
                  {canMarkCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start min-h-[44px]"
                      onClick={() => markCompletedMutation.mutate({
                        path: { id: sessionId },
                        body: { service: parseInt(serviceId) },
                      })}
                      disabled={isAnyMutating}
                    >
                      {markCompletedMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                      )}
                      Mark Completed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" asChild>
                  <Link href={`/dashboard/practitioner/services/${serviceId}`}>
                    Back to Service Overview
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" asChild>
                  <Link href={`/dashboard/practitioner/schedule`}>
                    View in Schedule
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
