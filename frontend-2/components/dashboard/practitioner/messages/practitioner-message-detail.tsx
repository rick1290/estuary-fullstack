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
  Info,
  Calendar,
  FileText,
  X,
  User,
  GraduationCap,
  Users,
  MessageSquare,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  conversationsRetrieveOptions,
  conversationsMessagesRetrieveOptions,
  conversationsSendMessageCreateMutation,
  conversationsMarkReadCreateMutation,
  servicesListOptions
} from "@/src/client/@tanstack/react-query.gen"
import type { MessageReadable } from "@/src/client/types.gen"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useWebSocketMessaging } from "@/hooks/use-websocket-messaging"
import { toast } from "sonner"

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
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebSocket connection for real-time messaging
  const { 
    connectionStatus, 
    typingUsers, 
    sendTypingIndicator, 
    markAsRead 
  } = useWebSocketMessaging({
    conversationId: conversationId || undefined,
    onMessage: (message) => {
      console.log('PractitionerMessageDetail received WebSocket message:', message)
      
      // Force a complete refetch of messages
      refetchMessages()
      
      // Also invalidate conversations list to update last message
      queryClient.invalidateQueries({ 
        queryKey: ['conversations'] 
      })
    },
    onTyping: (event) => {
      // Handle typing indicators from other users
      if (event.user_id !== user?.numericId) {
        setIsTyping(event.is_typing)
      }
    }
  })

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    ...conversationsRetrieveOptions({
      path: { id: conversationId || "" }
    }),
    enabled: !!conversationId
  })

  // Fetch messages
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    ...conversationsMessagesRetrieveOptions({
      path: { id: conversationId || "" }
    }),
    enabled: !!conversationId,
    staleTime: 0, // Always consider data stale
    refetchInterval: false, // Don't auto-refetch
  })

  // Fetch practitioner's active services
  const { data: servicesData } = useQuery({
    ...servicesListOptions({
      query: {
        is_active: true,
        ordering: '-created_at'
      }
    })
  })

  const services = servicesData?.results || []

  // Send message mutation
  const sendMessageMutation = useMutation({
    ...conversationsSendMessageCreateMutation(),
    onSuccess: () => {
      setNewMessage("")
      setSelectedFile(null)
      setPreviewUrl(null)
      // Invalidate and refetch messages immediately
      queryClient.invalidateQueries({ 
        queryKey: ['conversations', conversationId, 'messages'] 
      })
      queryClient.refetchQueries({ 
        queryKey: ['conversations', conversationId, 'messages'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['conversations'] 
      })
    },
    onError: () => {
      toast.error("Failed to send message")
    }
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    ...conversationsMarkReadCreateMutation(),
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
    // Scroll to bottom when messages load or change
    if (messages && messages.length > 0) {
      scrollToBottom(true) // Instant scroll on initial load
    }
  }, [messages])

  useEffect(() => {
    // Scroll to bottom when conversation changes
    if (conversationId && messages && messages.length > 0) {
      scrollToBottom(true) // Instant scroll when switching conversations
    }
  }, [conversationId])

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

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: instant ? "instant" : "smooth",
          block: "end",
          inline: "nearest" // This prevents horizontal scrolling
        })
      }
    }, 50)
  }

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" && !selectedFile) return
    if (!conversationId) return

    let attachments: any[] = []
    let messageType = "text"

    // If there's a file, upload it first
    if (selectedFile) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("entity_type", "conversation")
        formData.append("entity_id", conversationId)

        const response = await mediaUploadCreate({
          body: formData as any
        })

        if (response.data?.url) {
          const isImage = selectedFile.type.startsWith("image/")
          attachments = [{
            type: isImage ? "image" : "file",
            url: response.data.url,
            filename: selectedFile.name,
            size: selectedFile.size,
            mime_type: selectedFile.type,
            thumbnail_url: response.data.thumbnail_url || null,
          }]
          messageType = isImage ? "image" : "file"
        }
      } catch (error) {
        console.error("Failed to upload file:", error)
        toast.error("Failed to upload file")
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    // Send the message
    sendMessageMutation.mutate({
      path: { id: conversationId },
      body: {
        content: newMessage || (selectedFile ? `Sent ${selectedFile.type.startsWith("image/") ? "an image" : "a file"}` : ""),
        message_type: messageType,
        attachments: attachments
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    // Send typing indicator
    if (value.length > 0 && !typingTimeout) {
      sendTypingIndicator(true)
      
      // Stop typing indicator after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        sendTypingIndicator(false)
        setTypingTimeout(null)
      }, 3000)
      
      setTypingTimeout(timeout)
    } else if (value.length === 0 && typingTimeout) {
      // User cleared the input
      sendTypingIndicator(false)
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    } else if (typingTimeout) {
      // Reset typing timeout
      clearTimeout(typingTimeout)
      const timeout = setTimeout(() => {
        sendTypingIndicator(false)
        setTypingTimeout(null)
      }, 3000)
      setTypingTimeout(timeout)
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

  const handleShareService = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId)
    if (!service || !conversationId) return

    // Create a formatted message with service details
    const serviceUrl = `${window.location.origin}/services/${service.slug || service.id}`
    const price = service.price_cents ? `$${(service.price_cents / 100).toFixed(2)}` : 'Price TBD'
    const duration = service.duration_minutes ? `${service.duration_minutes} min` : ''

    const message = `I'd like to share this service with you:\n\n📋 ${service.name}\n💰 ${price}${duration ? `\n⏱️ ${duration}` : ''}\n\n${service.description || ''}\n\nBook here: ${serviceUrl}`

    // Send the message
    sendMessageMutation.mutate({
      path: { id: conversationId },
      body: {
        content: message
      }
    })

    setShowShareService(false)
    toast.success(`Shared "${service.name}" with ${otherUser?.first_name || 'client'}`)
  }

  if (!conversationId) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full p-6 text-center">
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
      <div className="flex flex-col h-full w-full">
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
      <div className="flex flex-col justify-center items-center h-full w-full p-6 text-center">
        <h3 className="text-lg font-medium">Conversation not found</h3>
      </div>
    )
  }


  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
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
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown User'}
              </h3>
              {connectionStatus === 'connected' && (
                <Wifi className="h-3 w-3 text-green-500" title="Connected" />
              )}
              {connectionStatus === 'disconnected' && (
                <WifiOff className="h-3 w-3 text-red-500" title="Disconnected" />
              )}
              {connectionStatus === 'connecting' && (
                <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" title="Connecting..." />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {otherUser?.email || 'No email'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Share a service" onClick={() => setShowShareService(true)}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Schedule a session">
            <Calendar className="h-4 w-4" />
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
              <DropdownMenuItem>
                <X className="h-4 w-4 mr-2" />
                Clear conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-hidden bg-accent/20">
        <ScrollArea className="h-full" key={messages?.length || 0}>
          <div className="p-4">
        {messages && messages.length > 0 ? (
          messages.map((message, index) => {
            const isSentByMe = message.sender?.id === user?.id
            const messageSender = message.sender
            const messageDate = message.created_at ? new Date(message.created_at) : new Date()
            const prevMessageDate = index > 0 && messages[index - 1].created_at ? new Date(messages[index - 1].created_at) : null
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
                      {/* Render message content with service link detection */}
                      {(() => {
                        const serviceUrlMatch = message.content?.match(/(?:Book here:|View service:)\s*(https?:\/\/[^\s]+\/services\/[^\s]+)/i)

                        if (serviceUrlMatch) {
                          // Split content: everything before the "Book here:" line
                          const parts = message.content.split(/(?:Book here:|View service:)/i)
                          const textContent = parts[0]?.trim()
                          const serviceUrl = serviceUrlMatch[1]

                          return (
                            <>
                              {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
                              <a
                                href={serviceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                  isSentByMe
                                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }`}
                              >
                                <Calendar className="h-4 w-4" />
                                View & Book Service
                              </a>
                            </>
                          )
                        }

                        return <p className="whitespace-pre-wrap">{message.content}</p>
                      })()}

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment: any, idx: number) => (
                            attachment.type === "image" ? (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <div className="relative rounded-lg overflow-hidden max-w-[280px]">
                                  <Image
                                    src={attachment.url}
                                    alt={attachment.filename || "Image"}
                                    width={280}
                                    height={200}
                                    className="object-cover rounded-lg hover:opacity-90 transition-opacity"
                                    style={{ maxHeight: "200px", width: "auto" }}
                                  />
                                </div>
                              </a>
                            ) : (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center p-2 rounded ${
                                  isSentByMe ? "bg-primary-foreground/10" : "bg-muted"
                                } hover:opacity-80 transition-opacity`}
                              >
                                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm truncate">{attachment.filename}</p>
                                  <p className="text-xs opacity-70">
                                    {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : "File"}
                                  </p>
                                </div>
                              </a>
                            )
                          ))}
                        </div>
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
          </div>
        </ScrollArea>
      </div>

      {/* File preview - Fixed */}
      {selectedFile && (
        <div className="p-3 border-t border-border flex-shrink-0">
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

      {/* Input - Fixed at bottom */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={handleFileButtonClick}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Smile className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[40px] resize-none"
              rows={1}
            />
            {isTyping && (
              <div className="absolute -top-6 left-0 text-xs text-muted-foreground">
                {otherUser?.first_name || 'User'} is typing...
              </div>
            )}
          </div>

          <Button
            variant="default"
            size="icon"
            className="flex-shrink-0"
            onClick={handleSendMessage}
            disabled={(newMessage.trim() === "" && !selectedFile) || sendMessageMutation.isPending || isUploading}
          >
            {isUploading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Share a Service</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground">
            Select a service to share with {otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'this client'}
          </p>

          <ScrollArea className="max-h-[450px] mt-2">
            <div className="space-y-3 pr-4">
              {services.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No active services found</p>
                  <p className="text-sm mt-1">Create a service to share with clients.</p>
                </div>
              ) : (
                services.map((service: any) => {
                  const price = service.price_cents ? `$${(service.price_cents / 100).toFixed(2)}` : 'Price TBD'
                  const duration = service.duration_minutes ? `${service.duration_minutes} min` : ''

                  return (
                    <Card
                      key={service.id}
                      className="cursor-pointer hover:bg-accent/50 hover:border-primary/30 transition-all"
                      onClick={() => handleShareService(service.id)}
                    >
                      <CardContent className="p-4 flex gap-4">
                        {/* Service Image */}
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {service.image_url ? (
                            <Image
                              src={service.image_url}
                              alt={service.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center">
                              {service.service_type === 'Workshop' ? (
                                <Users className="h-8 w-8 text-sage-600" />
                              ) : service.service_type === 'Course' ? (
                                <GraduationCap className="h-8 w-8 text-terracotta-600" />
                              ) : (
                                <User className="h-8 w-8 text-olive-600" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Service Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-semibold text-base leading-tight line-clamp-2">
                            {service.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {service.service_type_display || service.service_type || 'Session'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="font-semibold text-primary">{price}</span>
                            {duration && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{duration}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>

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
