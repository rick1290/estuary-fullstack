"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export default function CalendarTab() {
  const [calendarProvider, setCalendarProvider] = useState("")
  const [calendarEmail, setCalendarEmail] = useState("")
  const [success, setSuccess] = useState("")

  const handleSave = () => {
    setSuccess("Calendar settings saved successfully")
    setTimeout(() => setSuccess(""), 3000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium">Calendar Integration</h2>

      {success && (
        <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <p className="text-base">Connect your calendar to automatically sync your bookings.</p>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="calendar-provider">Calendar Provider</Label>
          <Select value={calendarProvider} onValueChange={setCalendarProvider}>
            <SelectTrigger id="calendar-provider" className="w-full">
              <SelectValue placeholder="Select calendar provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google Calendar</SelectItem>
              <SelectItem value="outlook">Microsoft Outlook</SelectItem>
              <SelectItem value="apple">Apple Calendar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {calendarProvider && (
          <div className="space-y-2">
            <Label htmlFor="calendar-email">Calendar Email</Label>
            <Input
              id="calendar-email"
              value={calendarEmail}
              onChange={(e) => setCalendarEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
            <p className="text-sm text-muted-foreground">Enter the email associated with your calendar</p>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button onClick={handleSave} disabled={!calendarProvider || !calendarEmail}>
            Connect Calendar
          </Button>
        </div>
      </div>
    </div>
  )
}
