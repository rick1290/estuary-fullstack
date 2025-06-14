"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import AddResourceDialog from "@/components/dashboard/practitioner/schedule/add-resource-dialog"
import ResourceCard from "@/components/dashboard/practitioner/schedule/resource-card"
import ResourceViewerDialog from "@/components/dashboard/practitioner/schedule/resource-viewer-dialog"

// Mock data for bookings
const mockBookings = {
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

// Status badge variant mapping
const statusVariants = {
  upcoming: "default",
  completed: "success",
  canceled: "destructive",
}

// Attendance status badge variant mapping
const attendanceStatusVariants = {
  confirmed: "outline",
  attended: "success",
  "no-show": "destructive",
  canceled: "secondary",
}

// Status icon mapping
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "upcoming":
      return <Calendar className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "canceled":
      return <XCircle className="h-4 w-4" />
    default:
      return null
  }
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  // Get the booking data based on the ID
  const booking = mockBookings[id as keyof typeof mockBookings]

  // State for resource management
  const [resources, setResources] = useState(booking?.resources || [])
  const [selectedResource, setSelectedResource] = useState<any>(null)
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false)

  // State for notes
  const [activeTab, setActiveTab] = useState("details")
  const [newNote, setNewNote] = useState("")
  const [newSharedNote, setNewSharedNote] = useState("")

  // If booking not found, show a message or redirect
  if (!booking) {
    return (
      <div className="container py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Booking Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">The booking you're looking for doesn't exist or has been removed.</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/practitioner/schedule")}>
              Return to Schedule
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

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{booking.title}</h1>
        <Badge
          variant={
            statusVariants[booking.status as keyof typeof statusVariants] as
              | "default"
              | "secondary"
              | "destructive"
              | "outline"
              | "success"
          }
          className="ml-2 flex items-center gap-1"
        >
          <StatusIcon status={booking.status} />
          <span className="capitalize">{booking.status}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.startTime} - {booking.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {booking.location === "Virtual" ? (
                    <Video className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{booking.location}</p>
                    {booking.location === "Virtual" && booking.meetingLink && (
                      <a
                        href={booking.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Join Meeting <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {booking.location === "In-Person" && booking.address && (
                      <p className="text-sm text-muted-foreground">{booking.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p className="text-sm text-muted-foreground">{booking.clients.length} client(s)</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{booking.description}</p>
              </div>
            </CardContent>
            {booking.status === "upcoming" && (
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">Reschedule</Button>
                <Button variant="destructive">Cancel Booking</Button>
                {booking.location === "Virtual" && booking.meetingLink && (
                  <Button asChild>
                    <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Start Session
                    </a>
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="details">Clients</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Client Information</h2>
                {booking.status === "upcoming" && (
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Attendance
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {booking.clients.map((client) => (
                  <Card key={client.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.name} />
                            <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/dashboard/practitioner/clients/${client.id}`}
                              className="font-medium hover:underline"
                            >
                              {client.name}
                            </Link>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={
                              attendanceStatusVariants[
                                client.attendanceStatus as keyof typeof attendanceStatusVariants
                              ] as "default" | "secondary" | "destructive" | "outline" | "success"
                            }
                            className="capitalize"
                          >
                            {client.attendanceStatus}
                          </Badge>

                          {booking.status === "upcoming" && (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dashboard/practitioner/clients/${client.id}`}>View Profile</Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

                  {booking.notes.length > 0 ? (
                    <div className="space-y-3">
                      {booking.notes.map((note) => (
                        <Card key={note.id}>
                          <CardContent className="p-4">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Added on {new Date(note.dateAdded).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No private notes yet</p>
                  )}
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

                  {booking.sharedNotes.length > 0 ? (
                    <div className="space-y-3">
                      {booking.sharedNotes.map((note) => (
                        <Card key={note.id}>
                          <CardContent className="p-4">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Shared on {new Date(note.dateAdded).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shared notes yet</p>
                  )}
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
              {booking.location === "Virtual" && booking.meetingLink && booking.status === "upcoming" && (
                <Button className="w-full" asChild>
                  <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Start Session
                  </a>
                </Button>
              )}
              {booking.status === "upcoming" && (
                <>
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Service Type</p>
                <p className="text-sm text-muted-foreground capitalize">{booking.type}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const start = new Date(
                      `2000-01-01T${booking.startTime.replace(" AM", "").replace(" PM", "")}${
                        booking.startTime.includes("PM") ? " PM" : " AM"
                      }`,
                    )
                    const end = new Date(
                      `2000-01-01T${booking.endTime.replace(" AM", "").replace(" PM", "")}${
                        booking.endTime.includes("PM") ? " PM" : " AM"
                      }`,
                    )
                    const diff = (end.getTime() - start.getTime()) / (1000 * 60)
                    return `${diff} minutes`
                  })()}
                </p>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/practitioner/services/${booking.id}`}>View Service Details</Link>
              </Button>
            </CardContent>
          </Card>

          {booking.clients.length === 1 && booking.clients[0].name && !booking.clients[0].name.includes("Multiple") && (
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={booking.clients[0].avatar || "/placeholder.svg"} alt={booking.clients[0].name} />
                    <AvatarFallback>{booking.clients[0].name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{booking.clients[0].name}</p>
                    <p className="text-sm text-muted-foreground">{booking.clients[0].email}</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/practitioner/clients/${booking.clients[0].id}`}>View Client Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
