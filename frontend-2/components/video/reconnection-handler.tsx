"use client"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { WifiOff, RefreshCw } from "lucide-react"

interface ReconnectionHandlerProps {
  connectionStatus: "connected" | "reconnecting" | "disconnected"
  onManualReconnect: () => void
  onGiveUp: () => void
  autoReconnectTimeout?: number // in seconds
  maxReconnectAttempts?: number
}

export function ReconnectionHandler({
  connectionStatus,
  onManualReconnect,
  onGiveUp,
  autoReconnectTimeout = 30,
  maxReconnectAttempts = 3,
}: ReconnectionHandlerProps) {
  const [timeRemaining, setTimeRemaining] = useState(autoReconnectTimeout)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [showDialog, setShowDialog] = useState(false)

  // Reset timer when connection status changes
  useEffect(() => {
    if (connectionStatus === "reconnecting") {
      setTimeRemaining(autoReconnectTimeout)
      setShowDialog(true)

      if (reconnectAttempts < maxReconnectAttempts) {
        setReconnectAttempts((prev) => prev + 1)
      }
    } else if (connectionStatus === "connected") {
      setShowDialog(false)
    } else if (connectionStatus === "disconnected") {
      setShowDialog(true)
    }
  }, [connectionStatus, autoReconnectTimeout, maxReconnectAttempts])

  // Countdown timer
  useEffect(() => {
    if (connectionStatus !== "reconnecting" || !showDialog) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [connectionStatus, showDialog])

  // Trigger manual reconnect when timer expires
  useEffect(() => {
    if (timeRemaining === 0 && connectionStatus === "reconnecting") {
      onManualReconnect()
      setTimeRemaining(autoReconnectTimeout)
    }
  }, [timeRemaining, connectionStatus, onManualReconnect, autoReconnectTimeout])

  // Give up after max reconnect attempts
  useEffect(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      onGiveUp()
    }
  }, [reconnectAttempts, maxReconnectAttempts, onGiveUp])

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            {connectionStatus === "reconnecting" ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 mr-2 text-destructive" />
                Connection Lost
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {connectionStatus === "reconnecting" ? (
              <>
                We're trying to reconnect you to your session. Please wait a moment...
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reconnecting automatically in</span>
                    <span>{timeRemaining} seconds</span>
                  </div>
                  <Progress value={(timeRemaining / autoReconnectTimeout) * 100} />
                  <p className="text-xs text-muted-foreground">
                    Attempt {reconnectAttempts} of {maxReconnectAttempts}
                  </p>
                </div>
              </>
            ) : (
              <>You've been disconnected from the session. Would you like to try rejoining?</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onGiveUp}>
            Leave Session
          </Button>
          <AlertDialogAction onClick={onManualReconnect}>
            {connectionStatus === "reconnecting" ? "Reconnect Now" : "Rejoin Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
