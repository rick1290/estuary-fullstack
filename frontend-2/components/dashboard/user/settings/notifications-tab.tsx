"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export default function NotificationsTab() {
  const [emailNotifications, setEmailNotifications] = useState({
    bookingConfirmations: true,
    bookingReminders: true,
    bookingCancellations: true,
    practitionerMessages: true,
    promotions: false,
    newsletter: false,
  })

  const [pushNotifications, setPushNotifications] = useState({
    bookingConfirmations: true,
    bookingReminders: true,
    bookingCancellations: true,
    practitionerMessages: true,
    promotions: false,
  })

  const [success, setSuccess] = useState("")

  const handleEmailChange = (name: string, checked: boolean) => {
    setEmailNotifications({
      ...emailNotifications,
      [name]: checked,
    })
  }

  const handlePushChange = (name: string, checked: boolean) => {
    setPushNotifications({
      ...pushNotifications,
      [name]: checked,
    })
  }

  const handleSave = () => {
    setSuccess("Notification preferences saved successfully")
    setTimeout(() => setSuccess(""), 3000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium">Notification Preferences</h2>

      {success && (
        <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-booking-confirmations" className="flex-1">
              Booking confirmations
            </Label>
            <Switch
              id="email-booking-confirmations"
              checked={emailNotifications.bookingConfirmations}
              onCheckedChange={(checked) => handleEmailChange("bookingConfirmations", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email-booking-reminders" className="flex-1">
              Booking reminders
            </Label>
            <Switch
              id="email-booking-reminders"
              checked={emailNotifications.bookingReminders}
              onCheckedChange={(checked) => handleEmailChange("bookingReminders", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email-booking-cancellations" className="flex-1">
              Booking cancellations
            </Label>
            <Switch
              id="email-booking-cancellations"
              checked={emailNotifications.bookingCancellations}
              onCheckedChange={(checked) => handleEmailChange("bookingCancellations", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email-practitioner-messages" className="flex-1">
              Practitioner messages
            </Label>
            <Switch
              id="email-practitioner-messages"
              checked={emailNotifications.practitionerMessages}
              onCheckedChange={(checked) => handleEmailChange("practitionerMessages", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email-promotions" className="flex-1">
              Promotions and special offers
            </Label>
            <Switch
              id="email-promotions"
              checked={emailNotifications.promotions}
              onCheckedChange={(checked) => handleEmailChange("promotions", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email-newsletter" className="flex-1">
              Newsletter
            </Label>
            <Switch
              id="email-newsletter"
              checked={emailNotifications.newsletter}
              onCheckedChange={(checked) => handleEmailChange("newsletter", checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Push Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push-booking-confirmations" className="flex-1">
              Booking confirmations
            </Label>
            <Switch
              id="push-booking-confirmations"
              checked={pushNotifications.bookingConfirmations}
              onCheckedChange={(checked) => handlePushChange("bookingConfirmations", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-booking-reminders" className="flex-1">
              Booking reminders
            </Label>
            <Switch
              id="push-booking-reminders"
              checked={pushNotifications.bookingReminders}
              onCheckedChange={(checked) => handlePushChange("bookingReminders", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-booking-cancellations" className="flex-1">
              Booking cancellations
            </Label>
            <Switch
              id="push-booking-cancellations"
              checked={pushNotifications.bookingCancellations}
              onCheckedChange={(checked) => handlePushChange("bookingCancellations", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-practitioner-messages" className="flex-1">
              Practitioner messages
            </Label>
            <Switch
              id="push-practitioner-messages"
              checked={pushNotifications.practitionerMessages}
              onCheckedChange={(checked) => handlePushChange("practitionerMessages", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-promotions" className="flex-1">
              Promotions and special offers
            </Label>
            <Switch
              id="push-promotions"
              checked={pushNotifications.promotions}
              onCheckedChange={(checked) => handlePushChange("promotions", checked)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSave}>Save Preferences</Button>
      </div>
    </div>
  )
}
