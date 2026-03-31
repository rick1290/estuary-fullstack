"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  bookingsRetrieveOptions,
  bookingsCancelCreateMutation,
  bookingsCompleteCreateMutation,
  bookingsConfirmCreateMutation,
  bookingsNotesRetrieveOptions,
  bookingsNotesCreateMutation,
  bookingsRequestRescheduleCreateMutation
} from "@/src/client/@tanstack/react-query.gen"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  DollarSign,
  ChevronLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Edit,
  Save,
  X,
  FileText
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Check if a session can be joined
const isSessionJoinable = (booking: any) => {
  if (!booking.service_session?.start_time || (booking.status !== "confirmed" && booking.service_session?.status !== "in_progress")) return false
  
  const now = new Date()
  const startTime = typeof booking.service_session?.start_time === 'string' ? parseISO(booking.service_session?.start_time) : new Date(booking.service_session?.start_time)
  const endTime = booking.service_session?.end_time 
    ? (typeof booking.service_session?.end_time === 'string' ? parseISO(booking.service_session?.end_time) : new Date(booking.service_session?.end_time))
    : new Date(startTime.getTime() + (booking.duration_minutes || 60) * 60 * 1000)
  
  // Allow joining 15 minutes before start and until the session ends
  const joinWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000)
  
  return now >= joinWindowStart && now < endTime
}

interface BookingDetailViewProps {
  bookingId: string
}

const statusConfig = {
  pending_payment: { color: "warning", label: "Pending Payment", icon: AlertCircle },
  confirmed: { color: "success", label: "Confirmed", icon: CheckCircle },
  in_progress: { color: "default", label: "In Progress", icon: Clock },
  completed: { color: "default", label: "Completed", icon: CheckCircle },
  canceled: { color: "destructive", label: "Canceled", icon: XCircle },
  no_show: { color: "destructive", label: "No Show", icon: XCircle },
}

export default function BookingDetailView({ bookingId }: BookingDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleReason, setRescheduleReason] = useState("")

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    ...bookingsRetrieveOptions({ path: { public_uuid: bookingId } }),
  })

  // Mutations
  // Invalidate all related queries so dashboard, schedule, and lists update in real time
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['bookingsRetrieve'] })
    queryClient.invalidateQueries({ queryKey: ['bookingsList'] })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
    queryClient.invalidateQueries({ queryKey: ['practitioner'] })
    queryClient.invalidateQueries({ queryKey: ['services'] })
    queryClient.invalidateQueries({ queryKey: ['calendar'] })
  }

  const cancelMutation = useMutation({
    ...bookingsCancelCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Booking canceled",
        description: `The booking has been canceled and the client will be refunded.`,
      })
      invalidateAll()
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel booking",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    },
  })

  const completeMutation = useMutation({
    ...bookingsCompleteCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Booking completed",
        description: "The booking has been marked as completed.",
      })
      invalidateAll()
    },
    onError: (error: any) => {
      toast({
        title: "Failed to complete booking",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    },
  })

  const rescheduleMutation = useMutation({
    ...bookingsRequestRescheduleCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Reschedule requested",
        description: "The time slot has been released and the client will be notified to pick a new time.",
      })
      invalidateAll()
      setShowRescheduleDialog(false)
      setRescheduleReason("")
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request reschedule",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    },
  })

  const confirmMutation = useMutation({
    ...bookingsConfirmCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Booking confirmed",
        description: "The booking has been confirmed.",
      })
      invalidateAll()
    },
  })

  // Fetch notes
  const { data: notes = [] } = useQuery({
    ...bookingsNotesRetrieveOptions({
      path: { public_uuid: bookingId }
    }),
  })

  const createNoteMutation = useMutation({
    ...bookingsNotesCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Note saved",
        description: "Your note has been saved successfully.",
      })
      queryClient.invalidateQueries({
        queryKey: bookingsNotesRetrieveOptions({ path: { public_uuid: bookingId } }).queryKey
      })
      setIsEditingNote(false)
      setNoteContent("")
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save note",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load booking</p>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mt-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  // Derive display status from both booking.status and service_session.status
  const derivedStatus = booking.status === "canceled"
    ? "canceled"
    : booking.service_session?.status === "completed"
    ? "completed"
    : booking.service_session?.status === "in_progress"
    ? "in_progress"
    : booking.status as string
  const StatusIcon = statusConfig[derivedStatus as keyof typeof statusConfig]?.icon || AlertCircle
  const statusVariant = statusConfig[derivedStatus as keyof typeof statusConfig]?.color || "default"
  const statusLabel = statusConfig[derivedStatus as keyof typeof statusConfig]?.label || booking.status_display

  const handleCancel = () => {
    setShowCancelDialog(true)
  }

  const confirmCancel = () => {
    cancelMutation.mutate({
      path: { public_uuid: bookingId },
      body: {
        reason: "Canceled by practitioner",
        canceled_by: "practitioner"
      }
    })
    setShowCancelDialog(false)
  }

  const handleReschedule = () => {
    setShowRescheduleDialog(true)
  }

  const confirmReschedule = () => {
    rescheduleMutation.mutate({
      path: { public_uuid: bookingId },
      body: {
        reason: rescheduleReason || "Practitioner requested reschedule"
      } as any,
    })
  }

  const handleComplete = () => {
    completeMutation.mutate({
      path: { public_uuid: bookingId }
    })
  }

  const handleConfirm = () => {
    confirmMutation.mutate({
      path: { public_uuid: bookingId }
    })
  }

  const handleSaveNote = () => {
    if (!noteContent.trim()) return

    createNoteMutation.mutate({
      path: { public_uuid: bookingId },
      body: {
        content: noteContent,
        is_private: true
      }
    })
  }

  const startTime = booking.service_session?.start_time ? new Date(booking.service_session?.start_time) : null
  const endTime = booking.service_session?.end_time ? new Date(booking.service_session?.end_time) : null

  return (
    <div className="space-y-6 px-3 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="shrink-0 min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-lg sm:text-xl font-normal text-olive-900 truncate">{booking.service?.name || booking.title || "Booking"}</h1>
            <p className="text-muted-foreground text-sm">Booking #{booking.public_uuid?.slice(-8) || booking.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusVariant as any} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusLabel}
          </Badge>

          {/* Prominent Mark Complete button for in-progress bookings */}
          {booking.service_session?.status === "in_progress" && (
            <Button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="bg-sage-700 hover:bg-sage-800 min-h-[44px]"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-[44px]">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {booking.status === "pending_payment" && (
                <DropdownMenuItem onClick={handleConfirm}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Booking
                </DropdownMenuItem>
              )}
              {(booking.status === "confirmed" || booking.service_session?.status === "in_progress") && (
                <>
                  <DropdownMenuItem
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </DropdownMenuItem>
                  {booking.status === "confirmed" && (
                    <DropdownMenuItem onClick={handleReschedule}>
                      <Edit className="h-4 w-4 mr-2" />
                      Reschedule
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {booking.service?.location_type === "virtual" && booking.room && isSessionJoinable(booking) && (
                <DropdownMenuItem
                  onClick={() => router.push(`/room/${booking.room.public_uuid}/lobby`)}
                  className="text-primary"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Session
                </DropdownMenuItem>
              )}
              {booking.can_be_canceled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleCancel}
                    className="text-destructive"
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle>Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {startTime ? format(startTime, "EEEE, MMMM d, yyyy") : "Not scheduled"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {startTime && endTime && (
                      <>
                        {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                        {" "}({booking.duration_minutes} minutes)
                      </>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                {booking.service?.location_type === "virtual" ? (
                  <>
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Virtual Session</p>
                      {booking.meeting_url && (
                        <Button
                          variant="link"
                          className="h-auto p-0 text-sm"
                          onClick={() => window.open(booking.meeting_url, "_blank")}
                        >
                          Join Meeting
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">In-Person</p>
                      {booking.service?.location && (
                        <p className="text-sm text-muted-foreground">
                          {booking.service.location.city}, {booking.service.location.state_province}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Join Session Button for Virtual Sessions */}
              {booking.service?.location_type === "virtual" && booking.room?.public_uuid && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <Button
                      className={`w-full flex items-center justify-center gap-2 ${
                        isSessionJoinable(booking) ? "bg-sage-700 hover:bg-sage-800" : ""
                      }`}
                      disabled={!isSessionJoinable(booking)}
                      onClick={() => router.push(`/room/${booking.room.public_uuid}/lobby`)}
                    >
                      <Video className="h-4 w-4" />
                      {isSessionJoinable(booking) ? "Join Session Now" : "Join Session"}
                    </Button>
                    {!isSessionJoinable(booking) && booking.service_session?.start_time && (
                      <p className="text-xs text-muted-foreground text-center">
                        Join will be available 15 minutes before session start
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={booking.user?.avatar_url || ""} />
                  <AvatarFallback>
                    {booking.user?.full_name?.charAt(0) || booking.user?.email?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-serif text-base font-normal text-olive-900">{booking.user?.full_name || "Unknown"}</h3>
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{booking.user?.email || "No email"}</span>
                    </div>
                    {booking.user?.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{booking.user.phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {booking.client_notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2">Client Notes</h4>
                    <p className="text-sm text-muted-foreground">{booking.client_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Comments</CardTitle>
              <CardDescription>Internal notes about this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add new note form */}
                {isEditingNote ? (
                  <div className="space-y-4">
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add your notes here..."
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={createNoteMutation.isPending || !noteContent.trim()}
                        className="min-h-[44px]"
                      >
                        {createNoteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Note
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingNote(false)
                          setNoteContent("")
                        }}
                        disabled={createNoteMutation.isPending}
                        className="min-h-[44px]"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingNote(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                )}

                {/* Display existing notes */}
                {notes.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h4 className="text-sm font-medium">Previous Notes</h4>
                    {notes.map((note: any) => (
                      <div key={note.id} className="border rounded-lg p-3 space-y-1">
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {note.created_at && format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                          {note.is_private && <span className="ml-2 text-orange-600">(Private)</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {notes.length === 0 && !isEditingNote && (
                  <p className="text-sm text-muted-foreground">No notes added yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Intake Form Responses */}
          {booking.intake_forms_status?.has_forms && (
            <IntakeResponsesSection bookingId={bookingId} status={booking.intake_forms_status} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Service Price</span>
                <span className="font-medium">
                  ${((booking.service as any)?.price_cents ? ((booking.service as any).price_cents / 100).toFixed(2) : (booking as any).price_charged || "0.00")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Paid</span>
                <span className="font-serif text-lg font-normal text-olive-900">
                  ${(((booking as any).credits_allocated || (booking.service as any)?.price_cents || 0) / 100).toFixed(2)}
                </span>
              </div>
              <Badge variant={booking.payment_status === "paid" ? "success" : "warning"}>
                {booking.payment_status_display || booking.payment_status}
              </Badge>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{booking.service?.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{booking.service?.description}</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{booking.service?.service_type_display || booking.service?.service_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{booking.service?.duration_minutes} minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking History */}
          <Card>
            <CardHeader>
              <CardTitle>Booking History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{booking.created_at ? format(new Date(booking.created_at), "MMM d, h:mm a") : "N/A"}</span>
              </div>
              {booking.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span>{format(new Date(booking.confirmed_at), "MMM d, h:mm a")}</span>
                </div>
              )}
              {booking.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(booking.completed_at), "MMM d, h:mm a")}</span>
                </div>
              )}
              {booking.canceled_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Canceled</span>
                  <span>{format(new Date(booking.canceled_at), "MMM d, h:mm a")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-olive-900">Cancel This Booking?</DialogTitle>
            <DialogDescription className="text-olive-600">
              This will cancel the session and refund the client. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-olive-600">Client</span>
              <span className="font-medium text-olive-900">{booking.user?.full_name || booking.user?.email || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-olive-600">Service</span>
              <span className="font-medium text-olive-900">{booking.service?.name}</span>
            </div>
            {startTime && (
              <div className="flex justify-between text-sm">
                <span className="text-olive-600">Scheduled</span>
                <span className="font-medium text-olive-900">{format(startTime, "MMM d, h:mm a")}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-olive-600">Refund to client</span>
              <span className="font-medium text-olive-900">${(((booking as any).credits_allocated || (booking.service as any)?.price_cents || 0) / 100).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                "Cancel & Refund Client"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-olive-900">Request Reschedule?</DialogTitle>
            <DialogDescription className="text-olive-600">
              This will release the current time slot and notify the client to pick a new time at their convenience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-olive-600">Client</span>
              <span className="font-medium text-olive-900">{booking.user?.full_name || booking.user?.email || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-olive-600">Service</span>
              <span className="font-medium text-olive-900">{booking.service?.name}</span>
            </div>
            {startTime && (
              <div className="flex justify-between text-sm">
                <span className="text-olive-600">Current time</span>
                <span className="font-medium text-olive-900">{format(startTime, "MMM d, h:mm a")}</span>
              </div>
            )}
            <Separator />
            <div>
              <label className="text-sm font-medium text-olive-700 mb-1.5 block">Reason (optional)</label>
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g., Schedule conflict, need to move to a different day..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowRescheduleDialog(false); setRescheduleReason("") }}>
              Keep Current Time
            </Button>
            <Button
              onClick={confirmReschedule}
              disabled={rescheduleMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {rescheduleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Release Slot & Notify Client"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Inline component to fetch and display client intake form responses */
function IntakeResponsesSection({ bookingId, status }: { bookingId: string; status: any }) {
  const [responses, setResponses] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const { intakeBookingsFormsResponsesRetrieve } = await import("@/src/client/sdk.gen")
        const res = await intakeBookingsFormsResponsesRetrieve({ path: { booking_uuid: bookingId } })
        if (res.data) {
          setResponses(res.data)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchResponses()
  }, [bookingId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Client Intake Forms
        </CardTitle>
        <CardDescription>
          {status.all_completed
            ? `${status.completed_forms}/${status.total_forms} forms completed`
            : `${status.completed_forms}/${status.total_forms} forms completed — waiting on client`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-3/4 bg-sage-100 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-sage-100 rounded animate-pulse" />
          </div>
        ) : responses?.intake_responses?.length > 0 ? (
          <div className="space-y-4">
            {responses.intake_responses.map((response: any) => (
              <div key={response.id} className="border border-sage-200/60 rounded-lg p-4">
                <h4 className="font-medium text-sm text-olive-900 mb-3">
                  {response.form_template_name || response.form_template?.title || "Intake Form"}
                </h4>
                {response.responses && typeof response.responses === 'object' ? (
                  <dl className="space-y-2">
                    {Object.entries(response.responses).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <dt className="text-xs font-medium text-olive-500">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</dt>
                        <dd className="text-sm text-olive-800 mt-0.5">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || '—')}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-olive-500">No response data available</p>
                )}
                <p className="text-xs text-olive-500 mt-3">
                  Submitted {response.submitted_at ? new Date(response.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-olive-500">
            {status.all_completed ? "Forms completed but no response data to display." : "Client has not yet completed the intake forms."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}