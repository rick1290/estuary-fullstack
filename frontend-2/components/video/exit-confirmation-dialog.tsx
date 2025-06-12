"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Clock } from "lucide-react"

interface ExitConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirmExit: (reason?: string) => void
  sessionType: "one-on-one" | "workshop" | "course"
  role: "practitioner" | "client"
  remainingTime?: number // in minutes
}

export function ExitConfirmationDialog({
  isOpen,
  onClose,
  onConfirmExit,
  sessionType,
  role,
  remainingTime,
}: ExitConfirmationDialogProps) {
  const [exitReason, setExitReason] = useState("")

  const isPractitioner = role === "practitioner"
  const hasRemainingTime = remainingTime && remainingTime > 5

  const handleConfirmExit = () => {
    onConfirmExit(exitReason)
    setExitReason("")
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{isPractitioner ? "End session for everyone?" : "Leave this session?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isPractitioner ? (
              <>
                This will end the session for all participants.
                {hasRemainingTime && (
                  <div className="flex items-center mt-2 text-amber-500">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>There are still {remainingTime} minutes remaining in the scheduled session.</span>
                  </div>
                )}
              </>
            ) : (
              <>
                You're about to leave this session.
                {hasRemainingTime && sessionType === "one-on-one" && (
                  <div className="flex items-center mt-2 text-amber-500">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>There are still {remainingTime} minutes remaining in your scheduled session.</span>
                  </div>
                )}
                {sessionType !== "one-on-one" && (
                  <span className="block mt-2">You can rejoin if the session is still in progress.</span>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isPractitioner && (
          <div className="mt-4">
            <label htmlFor="exit-reason" className="text-sm font-medium">
              Reason for ending early (optional)
            </label>
            <Textarea
              id="exit-reason"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="Add a note about why you're ending the session early..."
              className="mt-1"
            />
          </div>
        )}

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmExit}
            className={isPractitioner ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isPractitioner ? "End Session" : "Leave Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
