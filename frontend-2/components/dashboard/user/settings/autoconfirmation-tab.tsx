"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export default function AutoconfirmationTab() {
  const [autoConfirm, setAutoConfirm] = useState(false)
  const [autoConfirmThreshold, setAutoConfirmThreshold] = useState(false)
  const [success, setSuccess] = useState("")

  const handleSave = () => {
    setSuccess("Autoconfirmation settings saved successfully")
    setTimeout(() => setSuccess(""), 3000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium">Autoconfirmation Settings</h2>

      {success && (
        <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <p className="text-base">Configure how your bookings are automatically confirmed.</p>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <Switch id="auto-confirm" checked={autoConfirm} onCheckedChange={setAutoConfirm} />
            <Label htmlFor="auto-confirm">Automatically confirm all bookings</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            When enabled, all bookings will be automatically confirmed without requiring your approval.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-confirm-threshold"
              checked={autoConfirmThreshold}
              onCheckedChange={setAutoConfirmThreshold}
            />
            <Label htmlFor="auto-confirm-threshold">
              Automatically confirm bookings from practitioners I've booked before
            </Label>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            When enabled, bookings from practitioners you've previously worked with will be automatically confirmed.
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  )
}
