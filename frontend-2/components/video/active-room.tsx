"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  UserPlus,
  Settings,
  Users,
  MessageSquare,
  Phone,
  Clock,
} from "lucide-react"
import { ExitConfirmationDialog } from "./exit-confirmation-dialog"
import { ReconnectionHandler } from "./reconnection-handler"
import { SessionEndingNotification } from "./session-ending-notification"
import { SessionCompletionScreen } from "./session-completion-screen"

interface ActiveRoomProps {
  sessionId: string
  sessionType: "one-on-one" | "workshop" | "course"
  title: string
  practitioner: {
    id: string
    name: string
    image?: string
  }
  scheduledDuration: number // in minutes
  role: "practitioner" | "client"
}

type ConnectionStatus = "connected" | "reconnecting" | "disconnected"

export function ActiveRoom({ sessionId, sessionType, title, practitioner, scheduledDuration, role }: ActiveRoomProps) {
  // States for video controls
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isParticipantListOpen, setIsParticipantListOpen] = useState(false)

  // States for connection and session status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connected")
  const [remainingTime, setRemainingTime] = useState(scheduledDuration)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)

  // Simulate countdown timer
  useEffect(() => {
    if (remainingTime <= 0 || sessionEnded) return

    const timer = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1 / 60)) // Update every second (1/60 of a minute)
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingTime, sessionEnded])

  // Auto-end session when time runs out
  useEffect(() => {
    if (remainingTime <= 0 && !sessionEnded) {
      setSessionEnded(true)
    }
  }, [remainingTime, sessionEnded])

  // Handle exit confirmation
  const handleExitClick = () => {
    setShowExitDialog(true)
  }

  const handleConfirmExit = (reason?: string) => {
    console.log("Exit reason:", reason)
    setSessionEnded(true)
    setShowExitDialog(false)
  }

  // Connection handlers
  const handleManualReconnect = () => {
    // Simulate reconnection attempt
    setConnectionStatus("reconnecting")
    setTimeout(() => {
      setConnectionStatus("connected")
    }, 2000)
  }

  const handleGiveUp = () => {
    setSessionEnded(true)
  }

  // For demo, simulate a connection issue after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Comment out this line to prevent the connection issue simulation
      // setConnectionStatus('reconnecting')
    }, 30000)

    return () => clearTimeout(timeout)
  }, [])

  // If session has ended, show completion screen
  if (sessionEnded) {
    return (
      <SessionCompletionScreen
        sessionId={sessionId}
        sessionType={sessionType}
        title={title}
        practitioner={practitioner}
        duration={scheduledDuration - Math.floor(remainingTime)}
        hasRecording={true}
        hasResources={true}
        isSeriesSession={sessionType === "course"}
        nextSessionDate={sessionType === "course" ? "May 16th, 2025 at 3:00 PM" : undefined}
        role={role}
      />
    )
  }

  const isPractitioner = role === "practitioner"

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with session info */}
      <header className="p-4 border-b flex justify-between items-center bg-background z-10">
        <div className="flex items-center">
          <h1 className="font-semibold mr-3">{title}</h1>
          <Badge variant="outline">
            {sessionType === "one-on-one" ? "1-on-1 Session" : sessionType === "workshop" ? "Workshop" : "Course"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{Math.floor(remainingTime)} min remaining</span>
          </div>

          {connectionStatus === "connected" ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
              Reconnecting...
            </Badge>
          )}
        </div>
      </header>

      {/* Main video area */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 flex flex-col">
          {/* Primary video display */}
          <div className="flex-1 relative mb-4 bg-muted rounded-lg overflow-hidden">
            {/* Simulated remote participant */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isPractitioner ? (
                <div className="text-center">
                  <Avatar className="h-28 w-28 mx-auto mb-4">
                    <AvatarFallback>CL</AvatarFallback>
                  </Avatar>
                  <p className="text-lg font-medium">Client</p>
                </div>
              ) : (
                <div className="text-center">
                  <Avatar className="h-28 w-28 mx-auto mb-4">
                    <AvatarImage src={practitioner.image || "/placeholder.svg"} alt={practitioner.name} />
                    <AvatarFallback>{practitioner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="text-lg font-medium">{practitioner.name}</p>
                </div>
              )}
            </div>

            {/* Self-view (smaller video) */}
            <div className="absolute bottom-4 right-4 h-36 w-64 bg-background rounded-lg overflow-hidden shadow-md">
              {isVideoOn ? (
                <div className="absolute inset-0 bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">Your camera</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>{isPractitioner ? "ME" : "ME"}</AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="absolute bottom-2 right-2">
                <Badge variant={isMicOn ? "default" : "destructive"} className="h-6">
                  {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel (chat or participant list) */}
        {(isChatOpen || isParticipantListOpen) && (
          <Card className="w-80 border-l border-t-0 border-r-0 border-b-0 rounded-none">
            <div className="flex border-b">
              <Button
                variant={isChatOpen ? "default" : "ghost"}
                className="flex-1 rounded-none"
                onClick={() => {
                  setIsChatOpen(true)
                  setIsParticipantListOpen(false)
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={isParticipantListOpen ? "default" : "ghost"}
                className="flex-1 rounded-none"
                onClick={() => {
                  setIsParticipantListOpen(true)
                  setIsChatOpen(false)
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                People
              </Button>
            </div>

            <div className="p-4 h-full">
              {isChatOpen && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto mb-4">
                    <p className="text-center text-sm text-muted-foreground mb-4">Chat messages will appear here</p>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                    <Button size="sm" className="absolute right-1 top-1">
                      Send
                    </Button>
                  </div>
                </div>
              )}

              {isParticipantListOpen && (
                <div>
                  <p className="font-medium mb-2">In this session (2)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback>{isPractitioner ? "ME" : "ME"}</AvatarFallback>
                        </Avatar>
                        <span>You (Host)</span>
                      </div>
                      <div className="flex gap-1">
                        <Badge
                          variant={isMicOn ? "outline" : "destructive"}
                          className="h-6 w-6 p-0 flex items-center justify-center"
                        >
                          {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                        </Badge>
                        <Badge
                          variant={isVideoOn ? "outline" : "destructive"}
                          className="h-6 w-6 p-0 flex items-center justify-center"
                        >
                          {isVideoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          {isPractitioner ? (
                            <AvatarFallback>CL</AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage src={practitioner.image || "/placeholder.svg"} alt={practitioner.name} />
                              <AvatarFallback>{practitioner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <span>{isPractitioner ? "Client" : practitioner.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                          <Mic className="h-3 w-3" />
                        </Badge>
                        <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                          <Video className="h-3 w-3" />
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {isPractitioner && sessionType !== "one-on-one" && (
                    <Button className="w-full mt-4" size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite More People
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </main>

      {/* Control bar */}
      <footer className="p-4 border-t bg-background">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMicOn ? "outline" : "destructive"}
                    size="icon"
                    onClick={() => setIsMicOn(!isMicOn)}
                  >
                    {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMicOn ? "Mute Microphone" : "Unmute Microphone"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isVideoOn ? "outline" : "destructive"}
                    size="icon"
                    onClick={() => setIsVideoOn(!isVideoOn)}
                  >
                    {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isVideoOn ? "Turn Off Camera" : "Turn On Camera"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isPractitioner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isScreenSharing ? "default" : "outline"}
                      size="icon"
                      onClick={() => setIsScreenSharing(!isScreenSharing)}
                    >
                      <MonitorUp className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isChatOpen ? "default" : "outline"}
                    size="icon"
                    onClick={() => {
                      setIsChatOpen(!isChatOpen)
                      if (!isChatOpen) setIsParticipantListOpen(false)
                    }}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isParticipantListOpen ? "default" : "outline"}
                    size="icon"
                    onClick={() => {
                      setIsParticipantListOpen(!isParticipantListOpen)
                      if (!isParticipantListOpen) setIsChatOpen(false)
                    }}
                  >
                    <Users className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Participants</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={handleExitClick}>
                  <Phone className="h-5 w-5 rotate-135" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPractitioner ? "End Session" : "Leave Session"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </footer>

      {/* Session ending notification */}
      <SessionEndingNotification
        remainingTime={Math.floor(remainingTime)}
        onExtendSession={() => setRemainingTime((prev) => prev + 15)} // Add 15 minutes
        canExtend={isPractitioner}
        role={role}
      />

      {/* Exit confirmation dialog */}
      <ExitConfirmationDialog
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onConfirmExit={handleConfirmExit}
        sessionType={sessionType}
        role={role}
        remainingTime={Math.floor(remainingTime)}
      />

      {/* Reconnection handler */}
      <ReconnectionHandler
        connectionStatus={connectionStatus}
        onManualReconnect={handleManualReconnect}
        onGiveUp={handleGiveUp}
      />
    </div>
  )
}
