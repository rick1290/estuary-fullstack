"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Send, Paperclip, MoreVertical, Phone, Video, Info, Calendar, FileText, X, MessageSquare, Wifi, WifiOff } from "lucide-react"
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
import { useWebSocketMessaging } from "@/hooks/use-websocket-messaging"
import { toast } from "sonner"
import type { MessageReadable } from "@/src/client/types.gen"

export default function UserMessageDetail() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [newMessage, setNewMessage] = useState("")
  const [showPractitionerInfo, setShowPractitionerInfo] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

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
      console.log('UserMessageDetail received WebSocket message:', message)
      
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

  // Get the other user (practitioner) from conversation
  const practitioner = conversation?.participants?.find(
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

  if (!conversationId) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-6 text-center">
        <div className="mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Select a conversation</h3>
        <p className="text-muted-foreground mt-1">Choose a practitioner from the list to start messaging</p>
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

  if (!conversation || !practitioner) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-6 text-center">
        <h3 className="text-lg font-medium">Conversation not found</h3>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center">
          <Avatar>
            <AvatarImage 
              src={practitioner?.avatar_url || "/placeholder.svg"} 
              alt={`${practitioner?.first_name} ${practitioner?.last_name}`} 
            />
            <AvatarFallback>
              {practitioner?.first_name?.charAt(0) || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {practitioner ? `${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim() : 'Unknown Practitioner'}
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
            <p className="text-xs text-muted-foreground">Practitioner</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Voice call">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Video call">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Practitioner info" onClick={() => setShowPractitionerInfo(true)}>
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
                <Calendar className="h-4 w-4 mr-2" />
                Book a session
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
                        {messageSender?.first_name?.charAt(0) || 'P'}
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
          </div>
        </ScrollArea>
      </div>

      {/* File preview - Fixed */}
      {selectedFile && (
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex items-center">
            {previewUrl ? (
              <div className="relative w-20 h-20 mr-2 rounded overflow-hidden">
                <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
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
                {practitioner?.first_name || 'Practitioner'} is typing...
              </div>
            )}
          </div>

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

      {/* Practitioner Info Dialog */}
      <Dialog open={showPractitionerInfo} onOpenChange={setShowPractitionerInfo}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Practitioner Information</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage 
                src={practitioner?.avatar_url || "/placeholder.svg"} 
                alt={`${practitioner?.first_name} ${practitioner?.last_name}`} 
              />
              <AvatarFallback>
                {practitioner?.first_name?.charAt(0) || 'P'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">
              {practitioner ? `${practitioner.first_name || ''} ${practitioner.last_name || ''}`.trim() : 'Unknown Practitioner'}
            </h3>
            <p className="text-sm text-muted-foreground">Practitioner</p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Email</h4>
              <p className="text-sm">{practitioner?.email || 'No email'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Member Since</h4>
              <p className="text-sm">
                {practitioner?.created_at ? 
                  new Date(practitioner.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
                  'Unknown'
                }
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowPractitionerInfo(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowPractitionerInfo(false)
              // Navigate to practitioner profile
              window.location.href = `/practitioners/${conversation?.participants?.find(p => p.user?.id !== user?.id)?.practitioner?.slug || practitioner?.id}`
            }}>
              View Full Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}