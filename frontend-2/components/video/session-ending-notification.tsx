"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, X } from "lucide-react"

interface SessionEndingNotificationProps {
  remainingTime: number // in minutes
  onExtendSession?: () => void
  canExtend: boolean
  role: "practitioner" | "client"
}

export function SessionEndingNotification({
  remainingTime,
  onExtendSession,
  canExtend,
  role,
}: SessionEndingNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [localTime, setLocalTime] = useState(remainingTime)

  useEffect(() => {
    setLocalTime(remainingTime)
  }, [remainingTime])

  if (!isVisible || localTime > 5) return null

  const isPractitioner = role === "practitioner"

  return (
    <Card className="fixed bottom-20 right-4 w-80 shadow-lg border-amber-200 animate-slideUp">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 mb-2">
            <Clock className="h-3 w-3 mr-1" />
            {localTime <= 1 ? "Ending Soon" : `${localTime} minutes remaining`}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={() => setIsVisible(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm mb-3">
          {localTime <= 1 ? "This session is about to end." : `This session will end in ${localTime} minutes.`}
        </p>

        {canExtend && isPractitioner && (
          <Button size="sm" variant="outline" onClick={onExtendSession} className="w-full">
            Extend Session Time
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
