import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
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
    <PractitionerDashboardPageLayout 
      title="Settings" 
      description="Manage your account settings, payment integrations, and notification preferences"
    >
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto bg-sage-100 p-1 rounded-lg">
          <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">Billing</TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">Payment Integration</TabsTrigger>
          <TabsTrigger value="password" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">Password</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">Notifications</TabsTrigger>
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
    </PractitionerDashboardPageLayout>
  )
}
