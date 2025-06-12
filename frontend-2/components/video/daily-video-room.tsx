"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { ExitConfirmationDialog } from "./exit-confirmation-dialog"
import { SessionCompletionScreen } from "./session-completion-screen"
import { SessionEndingNotification } from "./session-ending-notification"
import { ReconnectionHandler } from "./reconnection-handler"

interface DailyVideoRoomProps {
  sessionId: string
  sessionType: "one-on-one" | "workshop" | "course"
  title: string
  practitioner: {
    id: string
    name: string
    image: string
  }
  scheduledDuration: number // in minutes
  role: "practitioner" | "client"
  roomUrl: string
  token?: string
}

export function DailyVideoRoom({
  sessionId,
  sessionType,
  title,
  practitioner,
  scheduledDuration,
  role,
  roomUrl,
  token,
}: DailyVideoRoomProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const callFrameRef = useRef<any>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const [showEndingNotification, setShowEndingNotification] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const [sessionEndReason, setSessionEndReason] = useState<
    "completed" | "left_early" | "practitioner_ended" | "error" | "timed_out"
  >("completed")

  // Initialize Daily call frame when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current) return

    // Only create the call frame once
    if (!callFrameRef.current) {
      console.log("Creating Daily.co call frame for room:", roomUrl)

      // @ts-ignore - Daily is loaded via script
      callFrameRef.current = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "0",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      })

      // Set up event listeners
      callFrameRef.current
        .on("joining-meeting", () => {
          console.log("Joining meeting...")
        })
        .on("joined-meeting", () => {
          console.log("Joined meeting!")
          setIsCallActive(true)
        })
        .on("left-meeting", (event: any) => {
          console.log("Left meeting", event)
          setIsCallActive(false)

          // Determine why the session ended
          if (event?.errorMsg) {
            setSessionEndReason("error")
          } else {
            setSessionEndReason("left_early")
          }

          setShowCompletionScreen(true)
        })
        .on("error", (e: any) => {
          console.error("Daily error:", e)
          setDisconnected(true)
        })
        .on("network-connection", (event: any) => {
          if (event?.type === "disconnected") {
            setDisconnected(true)
          } else if (event?.type === "connected") {
            setDisconnected(false)
          }
        })

      // Join the call - FIX: Only include token if it's a string
      console.log("Joining room:", roomUrl)

      // Create join options object
      const joinOptions: any = {
        url: roomUrl,
        userName: role === "practitioner" ? practitioner.name : "Client",
      }

      // Only add token if it's a string
      if (typeof token === "string") {
        joinOptions.token = token
      }

      callFrameRef.current.join(joinOptions)
    }

    // Set up session duration timer
    if (scheduledDuration) {
      const warningTime = scheduledDuration * 60 * 1000 - 5 * 60 * 1000 // 5 minutes before end
      const endTime = scheduledDuration * 60 * 1000

      const warningTimer = setTimeout(() => {
        setShowEndingNotification(true)
      }, warningTime)

      return () => {
        clearTimeout(warningTimer)
        if (callFrameRef.current) {
          callFrameRef.current.destroy()
          callFrameRef.current = null
        }
      }
    }
  }, [isScriptLoaded, roomUrl, token, role, practitioner.name, scheduledDuration])

  // Handle beforeunload event to prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCallActive) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isCallActive])

  const handleExitConfirm = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave()
    }
    setShowExitConfirmation(false)
  }

  const handleExitCancel = () => {
    setShowExitConfirmation(false)
  }

  const handleEndSession = () => {
    setShowExitConfirmation(true)
  }

  const handleCompletionExit = () => {
    router.push("/dashboard/user")
  }

  const handleReconnect = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave().then(() => {
        // Create join options object again
        const joinOptions: any = {
          url: roomUrl,
          userName: role === "practitioner" ? practitioner.name : "Client",
        }

        // Only add token if it's a string
        if (typeof token === "string") {
          joinOptions.token = token
        }

        callFrameRef.current.join(joinOptions)
      })
    }
    setDisconnected(false)
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@daily-co/daily-js"
        onLoad={() => {
          console.log("Daily.co script loaded")
          setIsScriptLoaded(true)
        }}
      />

      {/* Video container - takes full height and width */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Exit confirmation dialog */}
      <ExitConfirmationDialog
        open={showExitConfirmation}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        role={role}
        sessionType={sessionType}
        remainingTime={scheduledDuration} // This should be calculated based on elapsed time
      />

      {/* Session completion screen */}
      {showCompletionScreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <SessionCompletionScreen
            sessionId={sessionId}
            title={title}
            practitioner={practitioner}
            sessionType={sessionType}
            endReason={sessionEndReason}
            onExit={handleCompletionExit}
          />
        </div>
      )}

      {/* Session ending notification */}
      <SessionEndingNotification
        show={showEndingNotification}
        onClose={() => setShowEndingNotification(false)}
        minutesRemaining={5}
      />

      {/* Reconnection handler */}
      <ReconnectionHandler
        show={disconnected}
        onReconnect={handleReconnect}
        onCancel={() => router.push("/dashboard/user")}
      />
    </>
  )
}
