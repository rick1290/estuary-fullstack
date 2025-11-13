"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  bookingsRetrieveOptions,
  bookingsCancelCreateMutation,
  bookingsCompleteCreateMutation,
  bookingsConfirmCreateMutation,
  bookingsNotesRetrieveOptions,
  bookingsNotesCreateMutation
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
  MessageSquare,
  Edit,
  Copy,
  Save,
  X
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Check if a session can be joined
const isSessionJoinable = (booking: any) => {
  if (!booking.start_time || (booking.status !== "confirmed" && booking.status !== "in_progress")) return false
  
  const now = new Date()
  const startTime = typeof booking.start_time === 'string' ? parseISO(booking.start_time) : new Date(booking.start_time)
  const endTime = booking.end_time 
    ? (typeof booking.end_time === 'string' ? parseISO(booking.end_time) : new Date(booking.end_time))
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

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    ...bookingsRetrieveOptions({ path: { id: parseInt(bookingId) } }),
  })

  // Mutations
  const cancelMutation = useMutation({
    ...bookingsCancelCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Booking canceled",
        description: "The booking has been canceled successfully.",
      })
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] })
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
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to complete booking",
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
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] })
    },
  })

  // Fetch notes
  const { data: notes = [] } = useQuery({
    ...bookingsNotesRetrieveOptions({
      path: { id: bookingId }
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
        queryKey: bookingsNotesRetrieveOptions({ path: { id: bookingId } }).queryKey
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

  const StatusIcon = statusConfig[booking.status as keyof typeof statusConfig]?.icon || AlertCircle
  const statusVariant = statusConfig[booking.status as keyof typeof statusConfig]?.color || "default"
  const statusLabel = statusConfig[booking.status as keyof typeof statusConfig]?.label || booking.status_display

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelMutation.mutate({
        path: { id: parseInt(bookingId) },
        body: {
          reason: "Canceled by practitioner",
          canceled_by: "practitioner"
        }
      })
    }
  }

  const handleComplete = () => {
    completeMutation.mutate({
      path: { id: parseInt(bookingId) }
    })
  }

  const handleConfirm = () => {
    confirmMutation.mutate({
      path: { id: parseInt(bookingId) }
    })
  }

  const handleSaveNote = () => {
    if (!noteContent.trim()) return

    createNoteMutation.mutate({
      path: { id: bookingId },
      body: {
        content: noteContent,
        is_private: true
      }
    })
  }

  const startTime = booking.start_time ? new Date(booking.start_time) : null
  const endTime = booking.end_time ? new Date(booking.end_time) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{booking.service?.name || booking.title || "Booking"}</h1>
            <p className="text-muted-foreground">Booking #{booking.public_uuid?.slice(-8) || booking.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusVariant as any} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusLabel}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {booking.status === "pending_payment" && (
                <DropdownMenuItem onClick={handleConfirm}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Booking
                </DropdownMenuItem>
              )}
              {booking.status === "confirmed" && booking.is_upcoming && (
                <>
                  <DropdownMenuItem onClick={handleComplete}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Reschedule
                  </DropdownMenuItem>
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
              <DropdownMenuItem>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Client
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Copy Booking Link
              </DropdownMenuItem>
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
                      {booking.location && (
                        <p className="text-sm text-muted-foreground">
                          {booking.location.city}, {booking.location.state_province}
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
                        isSessionJoinable(booking) ? "bg-green-600 hover:bg-green-700" : ""
                      }`}
                      disabled={!isSessionJoinable(booking)}
                      onClick={() => router.push(`/room/${booking.room.public_uuid}/lobby`)}
                    >
                      <Video className="h-4 w-4" />
                      {isSessionJoinable(booking) ? "Join Session Now" : "Join Session"}
                    </Button>
                    {!isSessionJoinable(booking) && booking.start_time && (
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
                  <h3 className="font-medium">{booking.user?.full_name || "Unknown"}</h3>
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={createNoteMutation.isPending || !noteContent.trim()}
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
                <span className="font-medium">${booking.price_charged || "0.00"}</span>
              </div>
              {booking.discount_amount && parseFloat(booking.discount_amount) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Discount</span>
                  <span className="font-medium text-green-600">-${booking.discount_amount}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Paid</span>
                <span className="font-bold text-lg">${booking.final_amount || "0.00"}</span>
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
    </div>
  )
}