import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentIntegrationSettings } from "@/components/dashboard/practitioner/settings/payment-integration-settings"
import { PasswordSettings } from "@/components/dashboard/practitioner/settings/password-settings"
import { NotificationSettings } from "@/components/dashboard/practitioner/settings/notification-settings"
import { BillingSettings } from "@/components/dashboard/practitioner/settings/billing-settings"

export const metadata: Metadata = {
  title: "Settings | Practitioner Portal",
  description: "Manage your account settings, payment integrations, and notification preferences",
}

export default function PractitionerSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings, payment integrations, and notification preferences.
        </p>
      </div>

      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="payment">Payment Integration</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <PaymentIntegrationSettings />
        </TabsContent>

        <TabsContent value="password" className="space-y-4">
          <PasswordSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
