"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Chip } from "@/components/ui/chip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Info, Calendar, FileText, X, Star } from "lucide-react"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

// Mock data for the selected practitioner
const mockPractitioners = {
  "1": {
    id: "1",
    name: "Dr. Sarah Williams",
    avatar: "/practitioner-1.jpg",
    specialty: "Life Coach",
    online: true,
    lastActive: "Just now",
    bio: "Certified life coach with 10+ years of experience helping clients achieve their personal and professional goals.",
    rating: 4.9,
    reviewCount: 124,
  },
  "2": {
    id: "2",
    name: "David Thompson",
    avatar: "/practitioner-2.jpg",
    specialty: "Meditation Instructor",
    online: false,
    lastActive: "3 hours ago",
    bio: "Mindfulness expert specializing in stress reduction and emotional well-being through meditation practices.",
    rating: 4.7,
    reviewCount: 98,
  },
  "3": {
    id: "3",
    name: "Lisa Chen",
    avatar: "/practitioner-3.jpg",
    specialty: "Nutritionist",
    online: true,
    lastActive: "Just now",
    bio: "Registered dietitian helping clients develop sustainable eating habits for optimal health and wellness.",
    rating: 4.8,
    reviewCount: 112,
  },
}

// Mock data for messages
const mockMessages = {
  "1": [
    {
      id: "1",
      sender: "practitioner",
      text: "Hello! How are you feeling after our session yesterday?",
      timestamp: "11:30 AM",
      date: "Today",
    },
    {
      id: "2",
      sender: "user",
      text: "Hi Dr. Williams! I'm feeling much better, thank you. The techniques you taught me really helped with my anxiety.",
      timestamp: "11:35 AM",
      date: "Today",
    },
    {
      id: "3",
      sender: "practitioner",
      text: "That's wonderful to hear! Remember to practice them daily, especially when you feel stressed.",
      timestamp: "11:40 AM",
      date: "Today",
    },
    {
      id: "4",
      sender: "practitioner",
      text: "Would you like to schedule another session next week to continue our progress?",
      timestamp: "11:45 AM",
      date: "Today",
    },
  ],
  "2": [
    {
      id: "1",
      sender: "practitioner",
      text: "Hi there! I wanted to check in on your meditation practice. Have you been able to incorporate the 10-minute morning routine we discussed?",
      timestamp: "2:15 PM",
      date: "Yesterday",
    },
    {
      id: "2",
      sender: "user",
      text: "Yes, I've been doing it every day! It's really helping me start the day with a clear mind.",
      timestamp: "2:30 PM",
      date: "Yesterday",
    },
    {
      id: "3",
      sender: "practitioner",
      text: "Excellent! Remember to focus on your breathing when your mind starts to wander.",
      timestamp: "2:35 PM",
      date: "Yesterday",
    },
    {
      id: "4",
      sender: "practitioner",
      text: "Here's a guided meditation you might find helpful for deeper relaxation.",
      timestamp: "2:40 PM",
      date: "Yesterday",
      attachment: {
        type: "file",
        name: "deep_relaxation.mp3",
        size: "15.4 MB",
      },
    },
  ],
  "3": [
    {
      id: "1",
      sender: "practitioner",
      text: "Hello! I've prepared the meal plan we discussed during our consultation.",
      timestamp: "10:15 AM",
      date: "Monday",
    },
    {
      id: "2",
      sender: "practitioner",
      text: "Here it is. Let me know if you have any questions!",
      timestamp: "10:16 AM",
      date: "Monday",
      attachment: {
        type: "file",
        name: "meal_plan_week1.pdf",
        size: "2.3 MB",
      },
    },
    {
      id: "3",
      sender: "user",
      text: "Thank you so much, Lisa! This looks great. I'll start implementing it right away.",
      timestamp: "11:05 AM",
      date: "Monday",
    },
    {
      id: "4",
      sender: "practitioner",
      text: "Perfect! Remember to drink plenty of water throughout the day and keep track of how you feel after each meal.",
      timestamp: "11:10 AM",
      date: "Monday",
    },
  ],
}

export default function UserMessageDetail() {
  const searchParams = useSearchParams()
  const practitionerId = searchParams.get("practitionerId") || "1"
  const practitioner = mockPractitioners[practitionerId as keyof typeof mockPractitioners]
  const messages = mockMessages[practitionerId as keyof typeof mockMessages] || []

  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showPractitionerInfo, setShowPractitionerInfo] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages, practitionerId])

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

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
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

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
  }

  if (!practitioner) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-6">
        <p className="text-lg text-muted-foreground text-center">
          Select a conversation or find a practitioner to message
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <div className="relative">
            <Avatar>
              <AvatarImage src={practitioner.avatar || "/placeholder.svg"} alt={practitioner.name} />
              <AvatarFallback>{practitioner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {practitioner.online && (
              <Badge className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 p-0 border-2 border-background" />
            )}
          </div>
          <div className="ml-3">
            <p className="font-medium">{practitioner.name}</p>
            <p className="text-sm text-muted-foreground">
              {practitioner.specialty} • {practitioner.online ? "Online" : `Last active: ${practitioner.lastActive}`}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFavorite}>
                  {isFavorite ? (
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <Star className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFavorite ? "Remove from favorites" : "Add to favorites"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice call</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video call</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowPractitionerInfo(true)}>
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Practitioner info</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Book a session</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2">
                <X className="h-4 w-4" />
                <span>Clear conversation</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-auto p-4 bg-accent/30">
        {messages.map((message, index) => {
          const isFirstMessageOfDay = index === 0 || message.date !== messages[index - 1].date

          return (
            <div key={message.id}>
              {isFirstMessageOfDay && (
                <div className="flex justify-center my-4">
                  <Chip variant="outline">{message.date}</Chip>
                </div>
              )}

              <div className={`flex mb-4 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                {message.sender === "practitioner" && (
                  <Avatar className="mr-2 mt-1 h-8 w-8">
                    <AvatarImage src={practitioner.avatar || "/placeholder.svg"} alt={practitioner.name} />
                    <AvatarFallback>{practitioner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}

                <div className="max-w-[70%]">
                  <div
                    className={`p-3 rounded-lg ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card rounded-tl-none"
                    }`}
                  >
                    {message.text && <p>{message.text}</p>}

                    {message.attachment && message.attachment.type === "file" && (
                      <div className="flex items-center mt-2 p-2 bg-background rounded">
                        <FileText className="mr-2 h-5 w-5" />
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
                    className={`text-xs text-muted-foreground mt-1 ${message.sender === "user" ? "text-right" : "text-left"}`}
                  >
                    {message.timestamp}
                  </p>
                </div>

                {message.sender === "user" && (
                  <Avatar className="ml-2 mt-1 h-8 w-8">
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {selectedFile && (
        <div className="p-3 border-t">
          <div className="flex items-center">
            {previewUrl ? (
              <div className="relative w-24 h-24 mr-2">
                <Image src={previewUrl || "/placeholder.svg"} alt="Preview" fill className="object-cover rounded-md" />
              </div>
            ) : (
              <div className="flex items-center mr-2">
                <FileText className="mr-2 h-5 w-5" />
                <p className="text-sm truncate max-w-[200px]">{selectedFile.name}</p>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleClearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleFileButtonClick} className="mr-2">
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="mr-2"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[44px] resize-none mr-2"
            rows={1}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" onClick={handleSendMessage} disabled={newMessage.trim() === "" && !selectedFile}>
                  <Send className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-5 z-10">
            <Picker data={data} onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
      </div>

      {/* Practitioner Info Dialog */}
      <Dialog open={showPractitionerInfo} onOpenChange={setShowPractitionerInfo}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Practitioner Information</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={practitioner.avatar || "/placeholder.svg"} alt={practitioner.name} />
              <AvatarFallback>{practitioner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-medium">{practitioner.name}</h3>
            <p className="text-sm text-muted-foreground">{practitioner.specialty}</p>
            <div className="flex items-center mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-sm">
                {practitioner.rating} ({practitioner.reviewCount} reviews)
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">About</h4>
              <p className="text-sm">{practitioner.bio}</p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button className="w-full" onClick={() => setShowPractitionerInfo(false)}>
              <Calendar className="mr-2 h-4 w-4" />
              Book a Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
