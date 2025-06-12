"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Info,
  Calendar,
  FileText,
  X,
  User,
  GraduationCap,
  Users,
} from "lucide-react"

// Mock data for the selected client
const mockClients = {
  "1": {
    id: "1",
    name: "Emma Johnson",
    avatar: "/practitioner-1.jpg",
    online: true,
    lastActive: "Just now",
    email: "emma.johnson@example.com",
    phone: "+1 (555) 123-4567",
    joinedDate: "March 2023",
    totalSessions: 8,
  },
  "2": {
    id: "2",
    name: "Michael Chen",
    avatar: "/practitioner-2.jpg",
    online: false,
    lastActive: "2 hours ago",
    email: "michael.chen@example.com",
    phone: "+1 (555) 987-6543",
    joinedDate: "January 2023",
    totalSessions: 5,
  },
  "3": {
    id: "3",
    name: "Sophia Rodriguez",
    avatar: "/practitioner-3.jpg",
    online: false,
    lastActive: "5 hours ago",
    email: "sophia.rodriguez@example.com",
    phone: "+1 (555) 456-7890",
    joinedDate: "April 2023",
    totalSessions: 3,
  },
  "4": {
    id: "4",
    name: "James Wilson",
    avatar: "/practitioner-4.jpg",
    online: true,
    lastActive: "Just now",
    email: "james.wilson@example.com",
    phone: "+1 (555) 789-0123",
    joinedDate: "February 2023",
    totalSessions: 12,
  },
  "5": {
    id: "5",
    name: "Olivia Taylor",
    avatar: "/practitioner-profile.jpg",
    online: false,
    lastActive: "1 day ago",
    email: "olivia.taylor@example.com",
    phone: "+1 (555) 234-5678",
    joinedDate: "May 2023",
    totalSessions: 2,
  },
}

// Mock data for messages
const mockMessages = {
  "1": [
    {
      id: "1",
      sender: "client",
      text: "Hi there! I wanted to thank you for the amazing session yesterday.",
      timestamp: "10:15 AM",
      date: "Today",
    },
    {
      id: "2",
      sender: "practitioner",
      text: "You're welcome, Emma! I'm glad you found it helpful. How are you feeling today?",
      timestamp: "10:20 AM",
      date: "Today",
    },
    {
      id: "3",
      sender: "client",
      text: "Much better! The breathing techniques you taught me really helped with my anxiety.",
      timestamp: "10:25 AM",
      date: "Today",
    },
    {
      id: "4",
      sender: "practitioner",
      text: "That's wonderful to hear! Remember to practice them daily, especially when you feel stressed.",
      timestamp: "10:28 AM",
      date: "Today",
    },
    {
      id: "5",
      sender: "client",
      text: "I will! By the way, do you have any availability next week for another session?",
      timestamp: "10:30 AM",
      date: "Today",
    },
  ],
  "2": [
    {
      id: "1",
      sender: "client",
      text: "Hello, I need to reschedule my appointment for next week.",
      timestamp: "3:45 PM",
      date: "Yesterday",
    },
    {
      id: "2",
      sender: "practitioner",
      text: "Hi Michael, no problem. What day works better for you?",
      timestamp: "4:00 PM",
      date: "Yesterday",
    },
    {
      id: "3",
      sender: "client",
      text: "Would Thursday at 2 PM work?",
      timestamp: "4:05 PM",
      date: "Yesterday",
    },
    {
      id: "4",
      sender: "practitioner",
      text: "Let me check my calendar... Yes, Thursday at 2 PM works for me. I'll update your booking.",
      timestamp: "4:10 PM",
      date: "Yesterday",
    },
    {
      id: "5",
      sender: "client",
      text: "Perfect, thank you!",
      timestamp: "4:12 PM",
      date: "Yesterday",
    },
  ],
  "3": [
    {
      id: "1",
      sender: "client",
      text: "Hi, I'm interested in booking a session this weekend. Do you have any availability?",
      timestamp: "5:30 PM",
      date: "Yesterday",
    },
    {
      id: "2",
      sender: "practitioner",
      text: "Hello Sophia! I have a few slots open on Saturday. Would morning or afternoon work better for you?",
      timestamp: "5:45 PM",
      date: "Yesterday",
    },
    {
      id: "3",
      sender: "client",
      text: "Morning would be perfect!",
      timestamp: "6:00 PM",
      date: "Yesterday",
    },
  ],
  "4": [
    {
      id: "1",
      sender: "client",
      text: "Hello, I've completed the assessment form you sent.",
      timestamp: "2:15 PM",
      date: "Monday",
    },
    {
      id: "2",
      sender: "client",
      text: "Here's the attachment.",
      timestamp: "2:16 PM",
      date: "Monday",
      attachment: {
        type: "file",
        name: "assessment_form.pdf",
        size: "1.2 MB",
      },
    },
    {
      id: "3",
      sender: "practitioner",
      text: "Thank you, James! I'll review it before our next session.",
      timestamp: "2:30 PM",
      date: "Monday",
    },
  ],
  "5": [
    {
      id: "1",
      sender: "practitioner",
      text: "Hi Olivia, just confirming our session tomorrow at 3 PM.",
      timestamp: "11:00 AM",
      date: "Monday",
    },
    {
      id: "2",
      sender: "client",
      text: "Yes, I'll be there! Looking forward to it.",
      timestamp: "11:15 AM",
      date: "Monday",
    },
    {
      id: "3",
      sender: "practitioner",
      text: "Great! Don't forget to bring your journal.",
      timestamp: "11:20 AM",
      date: "Monday",
    },
  ],
}

// Mock data for services
const mockServices = [
  {
    id: "1",
    type: "session",
    title: "One-on-One Coaching Session",
    duration: "60 min",
    price: "$120",
    image: "/session-image-1.jpg",
    icon: <User className="h-4 w-4" />,
  },
  {
    id: "2",
    type: "course",
    title: "Mindfulness Fundamentals",
    duration: "6 weeks",
    price: "$299",
    image: "/course-image-1.jpg",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    id: "3",
    type: "workshop",
    title: "Stress Management Workshop",
    duration: "3 hours",
    price: "$85",
    image: "/workshop-image-1.jpg",
    icon: <Users className="h-4 w-4" />,
  },
]

export default function PractitionerMessageDetail() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get("clientId") || "1"
  const client = mockClients[clientId as keyof typeof mockClients]
  const messages = mockMessages[clientId as keyof typeof mockMessages] || []

  const [newMessage, setNewMessage] = useState("")
  const [showClientInfo, setShowClientInfo] = useState(false)
  const [showShareService, setShowShareService] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages, clientId])

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreviewUrl(null)
    }
  }, [selectedFile])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = () => {
    if (newMessage.trim() === "" && !selectedFile) return

    // In a real app, you would send the message to the server here
    console.log("Sending message:", newMessage, selectedFile)

    // Clear the input
    setNewMessage("")
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleShareService = (serviceId: string) => {
    // In a real app, you would send the service to the client here
    console.log("Sharing service:", serviceId)
    setShowShareService(false)
  }

  if (!client) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-6 text-center">
        <div className="mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Select a conversation</h3>
        <p className="text-muted-foreground mt-1">Choose a client from the list or start a new conversation</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <div className="relative">
            <Avatar>
              <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.name} />
              <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {client.online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div className="ml-3">
            <h3 className="font-medium">{client.name}</h3>
            <p className="text-xs text-muted-foreground">
              {client.online ? "Online" : `Last active: ${client.lastActive}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Voice call">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Video call">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Client info" onClick={() => setShowClientInfo(true)}>
            <Info className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowShareService(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Share a service
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule a session
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <X className="h-4 w-4 mr-2" />
                Clear conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-accent/20">
        {messages.map((message, index) => {
          const isFirstMessageOfDay = index === 0 || message.date !== messages[index - 1].date

          return (
            <div key={message.id}>
              {isFirstMessageOfDay && (
                <div className="flex justify-center my-4">
                  <Badge variant="outline" className="bg-background">
                    {message.date}
                  </Badge>
                </div>
              )}

              <div className={`flex mb-4 ${message.sender === "practitioner" ? "justify-end" : "justify-start"}`}>
                {message.sender === "client" && (
                  <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                    <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.name} />
                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}

                <div className="max-w-[70%]">
                  <div
                    className={`p-3 rounded-lg ${
                      message.sender === "practitioner" ? "bg-primary text-primary-foreground" : "bg-card"
                    }`}
                  >
                    {message.text && <p>{message.text}</p>}

                    {message.attachment && message.attachment.type === "file" && (
                      <div className="flex items-center mt-2 p-2 bg-background/50 rounded">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-sm">{message.attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{message.attachment.size}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="ml-auto">
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs text-muted-foreground mt-1 ${
                      message.sender === "practitioner" ? "text-right" : "text-left"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>

                {message.sender === "practitioner" && (
                  <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                    <AvatarFallback>Me</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* File preview */}
      {selectedFile && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center">
            {previewUrl ? (
              <div className="relative w-20 h-20 mr-2 rounded overflow-hidden">
                <Image src={previewUrl || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
              </div>
            ) : (
              <div className="flex items-center mr-2">
                <FileText className="h-5 w-5 mr-2" />
                <p className="text-sm truncate max-w-[200px]">{selectedFile.name}</p>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={handleFileButtonClick}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Smile className="h-5 w-5" />
          </Button>

          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[40px] resize-none"
            rows={1}
          />

          <Button
            variant="default"
            size="icon"
            className="flex-shrink-0"
            onClick={handleSendMessage}
            disabled={newMessage.trim() === "" && !selectedFile}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Client Info Dialog */}
      <Dialog open={showClientInfo} onOpenChange={setShowClientInfo}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Client Information</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.name} />
              <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{client.name}</h3>
            <p className="text-sm text-muted-foreground">Client since {client.joinedDate}</p>
          </div>

          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="info">Contact</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Email</h4>
                <p className="text-sm">{client.email}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Phone</h4>
                <p className="text-sm">{client.phone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Last Active</h4>
                <p className="text-sm">{client.lastActive}</p>
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Session History</h4>
                <p className="text-sm">Total Sessions: {client.totalSessions}</p>
                <p className="text-sm">Last Session: 3 days ago</p>
                <h4 className="text-sm font-medium mt-4">Upcoming Bookings</h4>
                <p className="text-sm text-muted-foreground">No upcoming bookings</p>
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Private Notes</h4>
                <Textarea placeholder="Add private notes about this client..." rows={5} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowClientInfo(false)}>
              Close
            </Button>
            <Button>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Service Dialog */}
      <Dialog open={showShareService} onOpenChange={setShowShareService}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share a Service</DialogTitle>
          </DialogHeader>

          <p className="text-sm mb-4">Select a service to share with {client.name}:</p>

          <div className="space-y-3">
            {mockServices.map((service) => (
              <Card
                key={service.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleShareService(service.id)}
              >
                <CardContent className="p-3 flex items-center">
                  <div className="relative h-12 w-12 rounded overflow-hidden mr-3 flex-shrink-0">
                    <Image
                      src={service.image || "/placeholder.svg"}
                      alt={service.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{service.title}</h4>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2">
                        {service.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {service.duration} • {service.price}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowShareService(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// This is a placeholder component in case it's needed
function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
