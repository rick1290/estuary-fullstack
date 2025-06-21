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
  MessageSquare,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  conversationsRetrieveOptions,
  conversationsMessagesRetrieveOptions,
  conversationsSendMessageCreateMutation,
  conversationsMarkReadCreateMutation
} from "@/src/client/@tanstack/react-query.gen"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

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
  const conversationId = searchParams.get("conversationId")
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [newMessage, setNewMessage] = useState("")
  const [showClientInfo, setShowClientInfo] = useState(false)
  const [showShareService, setShowShareService] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    ...conversationsRetrieveOptions({
      path: { id: conversationId || "" }
    }),
    enabled: !!conversationId
  })

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    ...conversationsMessagesOptions({
      path: { id: conversationId || "" }
    }),
    enabled: !!conversationId
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    ...conversationsSendMessageOptions(),
    onSuccess: () => {
      setNewMessage("")
      setSelectedFile(null)
      setPreviewUrl(null)
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['conversations', conversationId, 'messages'] 
      })
    },
    onError: () => {
      toast.error("Failed to send message")
    }
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    ...conversationsMarkReadOptions(),
    onSuccess: () => {
      // Invalidate conversation list to update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  // Get the other user from conversation
  const otherUser = conversation?.participants?.find(
    (p) => p.user?.id !== user?.id
  )?.user

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Mark messages as read when viewing conversation
    if (conversationId && conversation) {
      markAsReadMutation.mutate({
        path: { id: conversationId }
      })
    }
  }, [conversationId, conversation])

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
    if (!conversationId) return

    sendMessageMutation.mutate({
      path: { id: conversationId },
      body: {
        content: newMessage,
        message_type: "text"
      }
    })
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

  if (!conversationId) {
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

  if (conversationLoading || messagesLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="ml-3 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="h-16 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!conversation || !otherUser) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-6 text-center">
        <h3 className="text-lg font-medium">Conversation not found</h3>
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
              <AvatarImage 
                src={otherUser?.avatar_url || "/placeholder.svg"} 
                alt={`${otherUser?.first_name} ${otherUser?.last_name}`} 
              />
              <AvatarFallback>
                {otherUser?.first_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-3">
            <h3 className="font-medium">
              {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown User'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {otherUser?.email || 'No email'}
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
        {messages && messages.length > 0 ? (
          messages.map((message, index) => {
            const isSentByMe = message.sender?.id === user?.id
            const messageSender = message.sender
            const messageDate = new Date(message.created_at)
            const prevMessageDate = index > 0 ? new Date(messages[index - 1].created_at) : null
            const showDateSeparator = !prevMessageDate || 
              messageDate.toDateString() !== prevMessageDate.toDateString()

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <Badge variant="outline" className="bg-background">
                      {formatDistanceToNow(messageDate, { addSuffix: true })}
                    </Badge>
                  </div>
                )}

                <div className={`flex mb-4 ${isSentByMe ? "justify-end" : "justify-start"}`}>
                  {!isSentByMe && (
                    <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                      <AvatarImage 
                        src={messageSender?.avatar_url || "/placeholder.svg"} 
                        alt={`${messageSender?.first_name} ${messageSender?.last_name}`} 
                      />
                      <AvatarFallback>
                        {messageSender?.first_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="max-w-[70%]">
                    <div
                      className={`p-3 rounded-lg ${
                        isSentByMe ? "bg-primary text-primary-foreground" : "bg-card"
                      }`}
                    >
                      <p>{message.content}</p>

                      {message.attachments && message.attachments.length > 0 && (
                        message.attachments.map((attachment: any, idx: number) => (
                          <div key={idx} className="flex items-center mt-2 p-2 bg-background/50 rounded">
                            <FileText className="h-4 w-4 mr-2" />
                            <div>
                              <p className="text-sm">{attachment.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" className="ml-auto">
                              Download
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                    <p
                      className={`text-xs text-muted-foreground mt-1 ${
                        isSentByMe ? "text-right" : "text-left"
                      }`}
                    >
                      {formatDistanceToNow(messageDate, { addSuffix: true })}
                    </p>
                  </div>

                  {isSentByMe && (
                    <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                      <AvatarFallback>Me</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}
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
            disabled={newMessage.trim() === "" && !selectedFile || sendMessageMutation.isPending}
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
              <AvatarImage 
                src={otherUser?.avatar_url || "/placeholder.svg"} 
                alt={`${otherUser?.first_name} ${otherUser?.last_name}`} 
              />
              <AvatarFallback>
                {otherUser?.first_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">
              {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown User'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Client since {otherUser?.created_at ? 
                new Date(otherUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
                'Unknown'
              }
            </p>
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
                <p className="text-sm">{otherUser?.email || 'No email'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">User ID</h4>
                <p className="text-sm">{otherUser?.id || 'Unknown'}</p>
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Session History</h4>
                <p className="text-sm text-muted-foreground">Session history will be available soon</p>
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

          <p className="text-sm mb-4">Select a service to share with {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'this client'}:</p>

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
