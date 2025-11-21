"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Plus,
  Send,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Film,
  PlayCircle,
  Download,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import AddResourceDialog from "@/components/dashboard/practitioner/calendar/add-resource-dialog"
import ResourceCard from "@/components/dashboard/practitioner/calendar/resource-card"
import ResourceViewerDialog from "@/components/dashboard/practitioner/calendar/resource-viewer-dialog"
import { calendarRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { format, parseISO } from "date-fns"

// Attendance status badge variant mapping (for when we implement attendance tracking)
const attendanceStatusVariants = {
  confirmed: "outline",
  attended: "success",
  "no-show": "destructive",
  canceled: "secondary",
}

// Mock data for bookings (TO BE REMOVED - keeping for reference)
const mockBookings_OLD = {
  "booking-123": {
    id: "booking-123",
    title: "Mindfulness Meditation Session",
    type: "session", // session, workshop, course
    date: "2023-05-15",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    location: "Virtual",
    meetingLink: "https://zoom.us/j/123456789",
    status: "upcoming", // upcoming, completed, canceled
    description:
      "A one-on-one guided meditation session focused on mindfulness techniques for stress reduction and improved focus.",
    clients: [
      {
        id: "client-1",
        name: "Emma Thompson",
        email: "emma.thompson@example.com",
        phone: "+1 (555) 123-4567",
        avatar: "/extraterrestrial-encounter.png",
        attendanceStatus: "confirmed", // confirmed, attended, no-show, canceled
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Mindfulness Practice Guide",
        type: "document",
        url: "#",
        dateAdded: "2023-05-10",
        sharedWithClients: true,
        description: "A comprehensive guide to daily mindfulness practices",
      },
      {
        id: "resource-2",
        name: "Breathing Techniques Video",
        type: "video",
        url: "https://example.com/video",
        dateAdded: "2023-05-12",
        sharedWithClients: true,
        description: "Video demonstration of effective breathing techniques",
      },
    ],
    notes: [
      {
        id: "note-1",
        content:
          "Client mentioned they're experiencing work-related stress and would like to focus on techniques they can use during the workday.",
        dateAdded: "2023-05-01",
        sharedWithClients: false,
      },
      {
        id: "note-2",
        content: "Prepare breathing exercises specifically for office environment.",
        dateAdded: "2023-05-08",
        sharedWithClients: false,
      },
    ],
    sharedNotes: [
      {
        id: "shared-note-1",
        content:
          "Please come prepared with a quiet space where you won't be disturbed for the duration of our session.",
        dateAdded: "2023-05-05",
      },
    ],
  },
  "booking-456": {
    id: "booking-456",
    title: "Career Coaching Session",
    type: "session",
    date: "2023-05-20",
    startTime: "2:00 PM",
    endTime: "3:30 PM",
    location: "In-Person",
    address: "123 Wellness Center, Suite 200, San Francisco, CA 94105",
    status: "upcoming",
    description: "One-on-one career coaching session focused on career transition strategies and resume review.",
    clients: [
      {
        id: "client-2",
        name: "Michael Chen",
        email: "michael.chen@example.com",
        phone: "+1 (555) 987-6543",
        avatar: "/microphone-crowd.png",
        attendanceStatus: "confirmed",
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Career Transition Workbook",
        type: "document",
        url: "#",
        dateAdded: "2023-05-15",
        sharedWithClients: true,
        description: "Comprehensive workbook for planning career transitions",
      },
    ],
    notes: [
      {
        id: "note-1",
        content: "Client is looking to transition from finance to tech. Bring industry-specific resources.",
        dateAdded: "2023-05-10",
        sharedWithClients: false,
      },
    ],
    sharedNotes: [
      {
        id: "shared-note-1",
        content: "Please bring a printed copy of your current resume and a list of target companies.",
        dateAdded: "2023-05-12",
      },
    ],
  },
  "booking-789": {
    id: "booking-789",
    title: "Group Meditation Workshop",
    type: "workshop",
    date: "2023-05-20",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    location: "In-Person",
    address: "123 Wellness Center, Suite 200, San Francisco, CA 94105",
    status: "upcoming",
    description:
      "A group workshop focused on meditation techniques for beginners. Participants will learn basic meditation postures, breathing techniques, and mindfulness practices.",
    clients: [
      {
        id: "client-1",
        name: "Emma Thompson",
        email: "emma.thompson@example.com",
        phone: "+1 (555) 123-4567",
        avatar: "/extraterrestrial-encounter.png",
        attendanceStatus: "confirmed",
      },
      {
        id: "client-2",
        name: "Michael Chen",
        email: "michael.chen@example.com",
        phone: "+1 (555) 987-6543",
        avatar: "/microphone-crowd.png",
        attendanceStatus: "confirmed",
      },
      {
        id: "client-3",
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        phone: "+1 (555) 456-7890",
        avatar: "/stylized-initials.png",
        attendanceStatus: "confirmed",
      },
      {
        id: "client-4",
        name: "David Wilson",
        email: "david.wilson@example.com",
        phone: "+1 (555) 789-0123",
        avatar: "/abstract-dw.png",
        attendanceStatus: "confirmed",
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Workshop Handout",
        type: "document",
        url: "#",
        dateAdded: "2023-05-15",
        sharedWithClients: true,
        description: "Handout with key concepts and practices from the workshop",
      },
      {
        id: "resource-2",
        name: "Meditation Postures",
        type: "image",
        url: "/meditation-postures.png",
        dateAdded: "2023-05-16",
        sharedWithClients: true,
        description: "Visual guide to proper meditation postures",
      },
      {
        id: "resource-3",
        name: "Recommended Reading",
        type: "post",
        content:
          "Here are some recommended books on meditation and mindfulness:\n\n1. The Miracle of Mindfulness by Thich Nhat Hanh\n2. Wherever You Go, There You Are by Jon Kabat-Zinn\n3. 10% Happier by Dan Harris\n4. Why Buddhism Is True by Robert Wright\n5. Real Happiness by Sharon Salzberg",
        dateAdded: "2023-05-17",
        sharedWithClients: true,
        description: "List of recommended books on meditation",
      },
      {
        id: "resource-4",
        name: "Meditation Timer App",
        type: "link",
        url: "https://www.example.com/meditation-app",
        dateAdded: "2023-05-18",
        sharedWithClients: true,
        description: "Link to a recommended meditation timer application",
      },
    ],
    notes: [
      {
        id: "note-1",
        content: "Prepare extra cushions and mats for participants who may not bring their own.",
        dateAdded: "2023-05-10",
        sharedWithClients: false,
      },
    ],
    sharedNotes: [
      {
        id: "shared-note-1",
        content: "Please arrive 15 minutes early to get settled. Bring a yoga mat and comfortable clothing.",
        dateAdded: "2023-05-12",
      },
    ],
  },
  "booking-101": {
    id: "booking-101",
    title: "Nutritional Consultation",
    type: "session",
    date: "2023-05-10",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
    location: "Virtual",
    meetingLink: "https://zoom.us/j/987654321",
    status: "completed",
    description:
      "A personalized nutritional consultation to discuss dietary needs, goals, and create a customized meal plan.",
    clients: [
      {
        id: "client-4",
        name: "David Wilson",
        email: "david.wilson@example.com",
        phone: "+1 (555) 789-0123",
        avatar: "/abstract-dw.png",
        attendanceStatus: "attended",
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Personalized Meal Plan",
        type: "document",
        url: "#",
        dateAdded: "2023-05-11",
        sharedWithClients: true,
        description: "Customized meal plan based on nutritional needs and goals",
      },
      {
        id: "resource-2",
        name: "Nutrition Tracking Template",
        type: "document",
        url: "#",
        dateAdded: "2023-05-11",
        sharedWithClients: true,
        description: "Excel template for tracking daily nutrition intake",
      },
    ],
    notes: [
      {
        id: "note-1",
        content: "Client has a dairy allergy and is looking to increase protein intake for muscle building.",
        dateAdded: "2023-05-05",
        sharedWithClients: false,
      },
      {
        id: "note-2",
        content: "Follow up in two weeks to check progress and adjust meal plan if needed.",
        dateAdded: "2023-05-10",
        sharedWithClients: false,
      },
    ],
    sharedNotes: [
      {
        id: "shared-note-1",
        content:
          "Thank you for our session today! Remember to track your meals using the provided template for our follow-up.",
        dateAdded: "2023-05-10",
      },
    ],
  },
  "booking-102": {
    id: "booking-102",
    title: "Life Coaching Course - Week 1",
    type: "course",
    date: "2023-05-08",
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    location: "Virtual",
    meetingLink: "https://zoom.us/j/555555555",
    status: "completed",
    description:
      "First session of an 8-week life coaching course focused on goal setting, time management, and personal development.",
    clients: [
      {
        id: "client-5",
        name: "Multiple Attendees (12)",
        email: "",
        phone: "",
        avatar: null,
        attendanceStatus: "attended",
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Week 1 Course Materials",
        type: "document",
        url: "#",
        dateAdded: "2023-05-07",
        sharedWithClients: true,
        description: "Course materials for Week 1 of the life coaching program",
      },
      {
        id: "resource-2",
        name: "Goal Setting Worksheet",
        type: "document",
        url: "#",
        dateAdded: "2023-05-07",
        sharedWithClients: true,
        description: "Interactive worksheet for setting SMART goals",
      },
    ],
    notes: [
      {
        id: "note-1",
        content: "Good engagement from participants. Several questions about long-term goal setting techniques.",
        dateAdded: "2023-05-08",
        sharedWithClients: false,
      },
    ],
    sharedNotes: [
      {
        id: "shared-note-1",
        content:
          "Please complete the goal setting worksheet before our next session. Next week we'll focus on time management strategies.",
        dateAdded: "2023-05-08",
      },
    ],
  },
  "booking-103": {
    id: "booking-103",
    title: "Group Therapy Session",
    type: "workshop",
    date: "2023-05-05",
    startTime: "3:00 PM",
    endTime: "4:30 PM",
    location: "In-Person",
    address: "123 Wellness Center, Suite 200, San Francisco, CA 94105",
    status: "canceled",
    description: "A group therapy session focused on anxiety management techniques and peer support.",
    clients: [
      {
        id: "client-6",
        name: "Multiple Attendees (6)",
        email: "",
        phone: "",
        avatar: null,
        attendanceStatus: "canceled",
      },
    ],
    resources: [],
    notes: [
      {
        id: "note-1",
        content: "Session canceled due to low enrollment. Consider rescheduling or combining with another group.",
        dateAdded: "2023-05-03",
        sharedWithClients: false,
      },
    ],
    sharedNotes: [
      {
        id: "shared-note-1",
        content:
          "We apologize, but this session has been canceled. Please contact us to discuss alternative options or a refund.",
        dateAdded: "2023-05-03",
      },
    ],
  },
}

// Status icon mapping
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "confirmed":
    case "in_progress":
      return <Calendar className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "cancelled":
    case "canceled":
      return <XCircle className="h-4 w-4" />
    default:
      return <Calendar className="h-4 w-4" />
  }
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  // Fetch service session data from API
  const { data: session, isLoading, error } = useQuery(
    calendarRetrieveOptions({
      path: { id: id }
    })
  )

  // State for resource management
  const [resources, setResources] = useState<any[]>([])
  const [selectedResource, setSelectedResource] = useState<any>(null)
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false)

  // State for notes
  const [activeTab, setActiveTab] = useState("details")
  const [newNote, setNewNote] = useState("")
  const [newSharedNote, setNewSharedNote] = useState("")

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  // Error or not found state
  if (error || !session) {
    return (
      <div className="container py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Session Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">The session you're looking for doesn't exist or has been removed.</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/practitioner/calendar")}>
              Return to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleAddResource = (newResource: any) => {
    // In a real app, you would upload the file and add it to the resources list
    const resourceToAdd = {
      id: `resource-${resources.length + 1}`,
      ...newResource,
      dateAdded: new Date().toISOString().split("T")[0],
    }
    setResources([...resources, resourceToAdd])
  }

  const handleViewResource = (resource: any) => {
    setSelectedResource(resource)
    setResourceViewerOpen(true)
  }

  const handleDeleteResource = (id: string) => {
    setResources(resources.filter((resource) => resource.id !== id))
  }

  const handleAddNote = () => {
    // In a real app, you would save the note to the database
    console.log("Adding note:", newNote)
    // Reset form
    setNewNote("")
  }

  const handleAddSharedNote = () => {
    // In a real app, you would save the shared note to the database
    console.log("Adding shared note:", newSharedNote)
    // Reset form
    setNewSharedNote("")
  }

  // Format session title
  const sessionTitle = session.service_session_title ||
    `${session.service?.name}${session.sequence_number ? ` - Session ${session.sequence_number}` : ''}`

  // Map status to display variant
  const getStatusVariant = (status: string) => {
    const variants: Record<string, any> = {
      confirmed: "default",
      in_progress: "default",
      completed: "success",
      cancelled: "destructive",
      canceled: "destructive",
    }
    return variants[status] || "secondary"
  }

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{sessionTitle}</h1>
        <Badge
          variant={getStatusVariant(session.status || 'confirmed')}
          className="ml-2 flex items-center gap-1"
        >
          <StatusIcon status={session.status || 'confirmed'} />
          <span className="capitalize">{session.status || 'confirmed'}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {session.start_time && format(parseISO(session.start_time), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {session.start_time && format(parseISO(session.start_time), "h:mm a")} - {session.end_time && format(parseISO(session.end_time), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.service?.location_type === "virtual" ? (
                    <Video className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground capitalize">{session.service?.location_type}</p>
                    {session.service?.location_type === "virtual" && session.room?.public_uuid && (
                      <Link
                        href={`/room/${session.room.public_uuid}/lobby`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Join Session <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p className="text-sm text-muted-foreground">
                      {session.attendee_count} / {session.max_participants || '∞'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{session.service?.description}</p>
              </div>

              {session.agenda && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-2">Agenda</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.agenda}</p>
                  </div>
                </>
              )}

              {session.what_youll_learn && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-2">What You'll Learn</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.what_youll_learn}</p>
                  </div>
                </>
              )}
            </CardContent>
            {session.status === "confirmed" && (
              <CardFooter className="flex justify-end gap-2">
                {session.service?.location_type === "virtual" && session.room?.public_uuid && (
                  <Button asChild>
                    <Link href={`/room/${session.room.public_uuid}/lobby`}>
                      <Video className="h-4 w-4 mr-2" />
                      Start Session
                    </Link>
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="details">Clients</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Attendees ({session.attendee_count})</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {session.attendees && session.attendees.length > 0 ? (
                  session.attendees.map((attendee: any) => (
                    <Card key={attendee.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={attendee.avatar_url || ""} alt={attendee.full_name} />
                              <AvatarFallback>{attendee.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{attendee.full_name}</p>
                              <p className="text-sm text-muted-foreground">{attendee.email}</p>
                              {attendee.phone_number && (
                                <p className="text-sm text-muted-foreground">{attendee.phone_number}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              variant={
                                attendanceStatusVariants[
                                  attendee.booking_status as keyof typeof attendanceStatusVariants
                                ] as "default" | "secondary" | "destructive" | "outline" | "success"
                              }
                              className="capitalize"
                            >
                              {attendee.booking_status}
                            </Badge>

                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dashboard/practitioner/bookings/${attendee.booking_id}`}>
                                  View Booking
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No attendees registered yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Resources</h2>
                <AddResourceDialog onAddResource={handleAddResource} />
              </div>

              {resources.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {resources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onView={handleViewResource}
                      onDelete={handleDeleteResource}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No resources added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add materials to share with your clients</p>
                    <Button className="mt-4" onClick={() => document.getElementById("add-resource-button")?.click()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Resource
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Resource Viewer Dialog */}
              <ResourceViewerDialog
                resource={selectedResource}
                open={resourceViewerOpen}
                onOpenChange={setResourceViewerOpen}
              />
            </TabsContent>

            <TabsContent value="recordings" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Session Recordings</h2>
              </div>

              {session.recordings && session.recordings.length > 0 ? (
                <div className="space-y-3">
                  {session.recordings.map((recording: any, index: number) => (
                    <Card
                      key={recording.recording_id || index}
                      className="border border-sage-100 hover:shadow-md transition-all hover:border-sage-300"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Film className="h-4 w-4 text-primary" />
                              <h4 className="font-medium">
                                Recording {index + 1}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {recording.file_format?.toUpperCase() || 'MP4'}
                              </Badge>
                              <Badge
                                variant={recording.status === 'completed' ? 'success' : 'secondary'}
                                className="text-xs capitalize"
                              >
                                {recording.status}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{recording.duration_formatted || `${Math.floor(recording.duration_seconds / 60)} min`}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {recording.started_at ? format(parseISO(recording.started_at), "MMM d, h:mm a") : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {recording.file_size_bytes && (
                              <p className="text-xs text-muted-foreground">
                                Size: {(recording.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {recording.file_url && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90"
                                  asChild
                                >
                                  <a
                                    href={recording.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <PlayCircle className="h-4 w-4 mr-1.5" />
                                    Watch
                                  </a>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <a
                                    href={recording.download_url || recording.file_url}
                                    download
                                    className="flex items-center gap-1.5"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </a>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Film className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No recordings available yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recordings will appear here after the session is recorded
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Private Notes */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Private Notes</h2>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <Textarea
                        placeholder="Add a private note (only visible to you)"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end mt-2">
                        <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-sm text-muted-foreground">No private notes yet</p>
                </div>

                {/* Shared Notes */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Shared Notes</h2>
                    <Badge>Visible to clients</Badge>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <Textarea
                        placeholder="Add a note to share with clients"
                        value={newSharedNote}
                        onChange={(e) => setNewSharedNote(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end mt-2">
                        <Button onClick={handleAddSharedNote} disabled={!newSharedNote.trim()}>
                          <Send className="h-4 w-4 mr-2" />
                          Share Note
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-sm text-muted-foreground">No shared notes yet</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.service?.location_type === "virtual" && session.room?.public_uuid && session.status === "confirmed" && (
                <Button className="w-full bg-sage-600 hover:bg-sage-700" asChild>
                  <Link href={`/room/${session.room.public_uuid}/lobby`}>
                    <Video className="h-4 w-4 mr-2" />
                    Start Session
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Service Type</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {session.service?.service_type_code}
                </p>
              </div>

              {session.sequence_number && (
                <div>
                  <p className="text-sm font-medium">Session Number</p>
                  <p className="text-sm text-muted-foreground">
                    Session {session.sequence_number}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {session.duration_minutes} minutes
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Location Type</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {session.service?.location_type}
                </p>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/practitioner/services/${session.service?.id}`}>
                  View Service Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
