"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Bell, Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

interface NotificationOption {
  id: string
  title: string
  description: string
}

const appNotifications: NotificationOption[] = [
  {
    id: "new-booking",
    title: "New Booking",
    description: "Notify me of new bookings",
  },
  {
    id: "rescheduling",
    title: "Rescheduling",
    description: "Notify me when a client reschedules a time",
  },
  {
    id: "cancellation",
    title: "Cancellation of booking",
    description: "Notify me when a client cancels a reservation",
  },
  {
    id: "call-starting",
    title: "Call Starting",
    description: "Notify you when a call starts",
  },
  {
    id: "booking-status",
    title: "Status changes in bookings",
    description: "Notify me when the status of a booking changes",
  },
  {
    id: "sales-status",
    title: "Status changes in sales",
    description: "Notify me of changes in the status of my sales",
  },
  {
    id: "payout-status",
    title: "Status changes in payout",
    description: "Notify me of changes in the status of my transactions",
  },
]

const emailNotifications: NotificationOption[] = [
  {
    id: "email-new-booking",
    title: "New Booking",
    description: "Notify me of new bookings",
  },
  {
    id: "email-rescheduling",
    title: "Rescheduling",
    description: "Notify me when a client reschedules a time",
  },
  {
    id: "email-cancellation",
    title: "Cancellation of booking",
    description: "Notify me when a client cancels a reservation",
  },
  {
    id: "email-booking-status",
    title: "Status changes in bookings",
    description: "Notify me when the status of a booking changes",
  },
  {
    id: "email-sales-status",
    title: "Status changes in sales",
    description: "Notify me of changes in the status of my sales",
  },
]

export function NotificationSettings() {
  const [appChecked, setAppChecked] = useState<string[]>(["new-booking", "call-starting", "payout-status"])
  const [emailChecked, setEmailChecked] = useState<string[]>(["email-new-booking", "email-cancellation"])
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const toggleAppNotification = (id: string) => {
    setAppChecked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleEmailNotification = (id: string) => {
    setEmailChecked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleAllAppNotifications = () => {
    if (appChecked.length === appNotifications.length) {
      setAppChecked([])
    } else {
      setAppChecked(appNotifications.map((item) => item.id))
    }
  }

  const toggleAllEmailNotifications = () => {
    if (emailChecked.length === emailNotifications.length) {
      setEmailChecked([])
    } else {
      setEmailChecked(emailNotifications.map((item) => item.id))
    }
  }

  const handleSave = () => {
    setIsLoading(true)
    setSuccess(false)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setSuccess(true)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    }, 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Manage how and when you receive notifications from the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>Your notification preferences have been saved successfully.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Alerts & Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-app"
                checked={appChecked.length === appNotifications.length}
                onCheckedChange={toggleAllAppNotifications}
              />
              <Label htmlFor="select-all-app" className="text-sm font-medium">
                Select all
              </Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {appNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3">
                <Checkbox
                  id={notification.id}
                  checked={appChecked.includes(notification.id)}
                  onCheckedChange={() => toggleAppNotification(notification.id)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={notification.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {notification.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Email Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-email"
                checked={emailChecked.length === emailNotifications.length}
                onCheckedChange={toggleAllEmailNotifications}
              />
              <Label htmlFor="select-all-email" className="text-sm font-medium">
                Select all
              </Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {emailNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3">
                <Checkbox
                  id={notification.id}
                  checked={emailChecked.includes(notification.id)}
                  onCheckedChange={() => toggleEmailNotification(notification.id)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={notification.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {notification.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
