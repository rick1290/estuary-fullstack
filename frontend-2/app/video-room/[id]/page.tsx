"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DailyVideoRoom } from "@/components/video/daily-video-room"
import { Skeleton } from "@/components/ui/skeleton"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Updated function to get room details with the test room
async function getRoomDetails(roomId: string) {
  // For testing, we'll use the test room the user created
  // In production, this would fetch from your API
  return {
    id: roomId,
    title: "Mindfulness Meditation Session",
    type: "one-on-one" as "one-on-one" | "workshop" | "course",
    practitioner: {
      id: "pract-456",
      name: "Dr. Sarah Williams",
      image: "/practitioner-1.jpg",
    },
    scheduledDuration: 60, // minutes
    // Use the actual test room URL
    roomUrl: "https://estuary.daily.co/my-test-room-name",
    // Don't include token for public rooms
    // token: undefined, // Remove this line completely
  }
}

export default function VideoRoomPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [roomDetails, setRoomDetails] = useState<any>(null)
  const [role, setRole] = useState<"practitioner" | "client">("client")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch room details
    getRoomDetails(params.id)
      .then((details) => {
        setRoomDetails(details)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching room details:", err)
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

  const handleExit = () => {
    router.push("/dashboard/user")
  }

  if (isLoading) {
    return (
      <div className="h-full w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-[calc(100vh-120px)] w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-4">Session Error</h2>
          <p className="mb-6">{error}</p>
          <Button onClick={handleExit} variant="default">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      {/* Emergency exit button - always visible in corner */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
        onClick={handleExit}
        aria-label="Exit session"
      >
        <X className="h-4 w-4" />
      </Button>

      <DailyVideoRoom
        sessionId={roomDetails.id}
        sessionType={roomDetails.type}
        title={roomDetails.title}
        practitioner={roomDetails.practitioner}
        scheduledDuration={roomDetails.scheduledDuration}
        role={role}
        roomUrl={roomDetails.roomUrl}
        // Only pass token if it exists in roomDetails
        {...(roomDetails.token ? { token: roomDetails.token } : {})}
      />
    </div>
  )
}
