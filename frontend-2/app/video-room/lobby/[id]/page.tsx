"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Mic, MicOff, Video, VideoOff, Volume2, X, CheckCircle2 } from "lucide-react"

// Updated function to get session details with the test room info
async function getSessionDetails(sessionId: string) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    id: sessionId,
    title: "Mindfulness Meditation Session",
    type: "one-on-one",
    practitioner: {
      id: "pract-456",
      name: "Dr. Sarah Williams",
      image: "/practitioner-1.jpg",
    },
    scheduledStartTime: new Date(Date.now()), // Set to now for testing
    scheduledDuration: 60, // minutes
    // Reference to the test room
    roomUrl: "https://estuary.daily.co/my-test-room-name",
  }
}

export default function VideoLobbyPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [sessionDetails, setSessionDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [selectedMic, setSelectedMic] = useState<string>("")
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("")
  const [isAudioTesting, setIsAudioTesting] = useState(false)
  const [practitionerJoined, setPractitionerJoined] = useState(true) // Set to true for testing
  const [countdown, setCountdown] = useState<number | null>(null)
  const [role, setRole] = useState<"practitioner" | "client">("client")

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Fetch session details
    getSessionDetails(params.id)
      .then((details) => {
        setSessionDetails(details)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching session details:", err)
        setError("Failed to load session details. Please try again.")
        setIsLoading(false)
      })

    // For demo purposes, allow toggling between practitioner and client view
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "p") {
        setRole("practitioner")
      } else if (e.key === "c") {
        setRole("client")
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [params.id])

  // Video preview
  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err)
          setVideoEnabled(false)
        })
    }

    return () => {
      // Clean up video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [videoEnabled])

  const handleExit = () => {
    router.push("/dashboard/user")
  }

  const handleJoinSession = () => {
    router.push(`/video-room/${params.id}`)
  }

  const handleTestAudio = () => {
    setIsAudioTesting(true)

    // In a real implementation, you would play a test sound
    setTimeout(() => {
      setIsAudioTesting(false)
    }, 3000)
  }

  const isPractitioner = role === "practitioner"

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Session Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExit} className="w-full">
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-background to-background/80">
      {/* Exit button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
        onClick={handleExit}
        aria-label="Exit lobby"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Session title */}
      <div className="text-center pt-6 px-4">
        <h1 className="text-xl font-semibold">{sessionDetails.title}</h1>
        <p className="text-sm text-muted-foreground">Test Room: my-test-room-name</p>
      </div>

      <div className="flex-1 container max-w-5xl py-6 px-4 grid gap-6 md:grid-cols-3 items-start">
        {/* Main preview area */}
        <div className="md:col-span-2 flex flex-col">
          <Card className="flex-1">
            <CardHeader className="pb-0">
              <CardTitle>Camera Preview</CardTitle>
              <CardDescription>Check how you'll appear in the session</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pt-6">
              <div className="bg-black rounded-lg overflow-hidden flex-1 relative aspect-video">
                {videoEnabled ? (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Avatar className="h-24 w-24 mx-auto mb-4">
                        <AvatarFallback>{isPractitioner ? "ME" : "ME"}</AvatarFallback>
                      </Avatar>
                      <p className="text-muted-foreground">Camera is off</p>
                    </div>
                  </div>
                )}

                {/* Mic indicator */}
                <div className="absolute bottom-4 left-4">
                  <Badge variant={audioEnabled ? "default" : "destructive"} className="h-8 px-3">
                    {audioEnabled ? (
                      <>
                        <Mic className="h-4 w-4 mr-2" /> Microphone On
                      </>
                    ) : (
                      <>
                        <MicOff className="h-4 w-4 mr-2" /> Microphone Off
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <Button
                  variant={audioEnabled ? "outline" : "destructive"}
                  size="lg"
                  className="w-36"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? (
                    <>
                      <Mic className="h-5 w-5 mr-2" /> Mic On
                    </>
                  ) : (
                    <>
                      <MicOff className="h-5 w-5 mr-2" /> Mic Off
                    </>
                  )}
                </Button>

                <Button
                  variant={videoEnabled ? "outline" : "destructive"}
                  size="lg"
                  className="w-36"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                >
                  {videoEnabled ? (
                    <>
                      <Video className="h-5 w-5 mr-2" /> Camera On
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-5 w-5 mr-2" /> Camera Off
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {/* Session info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar>
                  <AvatarImage
                    src={sessionDetails.practitioner.image || "/placeholder.svg"}
                    alt={sessionDetails.practitioner.name}
                  />
                  <AvatarFallback>{sessionDetails.practitioner.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{sessionDetails.practitioner.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPractitioner ? "You" : sessionDetails.type === "one-on-one" ? "Your practitioner" : "Host"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Session type</span>
                  <Badge variant="outline">
                    {sessionDetails.type === "one-on-one"
                      ? "1-on-1 Session"
                      : sessionDetails.type === "workshop"
                        ? "Workshop"
                        : "Course"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span>{sessionDetails.scheduledDuration} minutes</span>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Ready to join
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device settings */}
          <Card>
            <CardHeader>
              <CardTitle>Device Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="microphone">Microphone</Label>
                <Select value={selectedMic} onValueChange={setSelectedMic}>
                  <SelectTrigger id="microphone">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Microphone</SelectItem>
                    <SelectItem value="builtin">Built-in Microphone</SelectItem>
                    <SelectItem value="headset">Headset Microphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="camera">Camera</Label>
                <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                  <SelectTrigger id="camera">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Camera</SelectItem>
                    <SelectItem value="builtin">Built-in Webcam</SelectItem>
                    <SelectItem value="external">External Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speaker">Speaker</Label>
                <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                  <SelectTrigger id="speaker">
                    <SelectValue placeholder="Select speaker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Speaker</SelectItem>
                    <SelectItem value="builtin">Built-in Speakers</SelectItem>
                    <SelectItem value="headphones">Headphones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full" onClick={handleTestAudio} disabled={isAudioTesting}>
                  {isAudioTesting ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2 animate-pulse" /> Testing Audio...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" /> Test Speaker
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join button */}
          <Button size="lg" className="h-16 text-lg" onClick={handleJoinSession}>
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Join Test Session
          </Button>

          <div className="flex items-center text-sm text-green-600 justify-center">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Using test room: my-test-room-name
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="text-center pb-6 text-sm text-muted-foreground">
        <p>
          Having issues?{" "}
          <Button variant="link" className="p-0 h-auto font-normal" size="sm">
            Get Support
          </Button>
        </p>
      </div>
    </div>
  )
}
