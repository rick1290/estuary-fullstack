"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, AlertCircle } from "lucide-react"

export default function DeleteAccountTab() {
  const [openDialog, setOpenDialog] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [password, setPassword] = useState("")
  const [reason, setReason] = useState("")
  const [confirmCheckbox, setConfirmCheckbox] = useState(false)
  const [error, setError] = useState("")

  const handleOpenDialog = () => {
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setConfirmText("")
    setPassword("")
    setConfirmCheckbox(false)
    setError("")
  }

  const handleDeleteAccount = () => {
    if (confirmText !== "DELETE") {
      setError("Please type DELETE to confirm")
      return
    }

    if (!password) {
      setError("Please enter your password")
      return
    }

    if (!confirmCheckbox) {
      setError("Please confirm that you understand this action is permanent")
      return
    }

    // Simulate account deletion process
    console.log("Account deletion initiated")
    handleCloseDialog()
    // In a real app, you would redirect to a confirmation page or log the user out
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium text-destructive">Delete Account</h2>

      <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Deleting your account is permanent and cannot be undone. All your data will be permanently removed.
        </AlertDescription>
      </Alert>

      <p className="text-base">Before you delete your account, please consider:</p>

      <ul className="list-disc pl-5 space-y-2">
        <li className="text-sm">All your personal information will be permanently deleted</li>
        <li className="text-sm">You will lose access to all your booking history and messages</li>
        <li className="text-sm">Any upcoming bookings will be automatically cancelled</li>
        <li className="text-sm">This action cannot be reversed</li>
      </ul>

      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="reason">Please tell us why you're leaving (optional)</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>

        <Button variant="destructive" onClick={handleOpenDialog}>
          Delete Account
        </Button>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Account Deletion</DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="confirm-text">Type DELETE to confirm</Label>
              <Input id="confirm-text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Enter your password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="confirm-checkbox"
                checked={confirmCheckbox}
                onCheckedChange={(checked) => setConfirmCheckbox(checked === true)}
              />
              <Label htmlFor="confirm-checkbox" className="text-sm">
                I understand that this action is permanent and cannot be undone
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
