import { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { CurrentSubscription } from "@/components/dashboard/practitioner/subscription/current-subscription"
import { SubscriptionTiers } from "@/components/dashboard/practitioner/subscription/subscription-tiers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "Subscription Management | Practitioner Dashboard",
  description: "Manage your practitioner subscription and billing",
}

export default function PractitionerSubscriptionPage() {
  return (
    <PractitionerDashboardPageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription plan and billing preferences
          </p>
        </div>

        <Tabs defaultValue="current" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="current">Current Plan</TabsTrigger>
            <TabsTrigger value="upgrade">Change Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <CurrentSubscription />
          </TabsContent>

          <TabsContent value="upgrade" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Choose Your Plan</h2>
              <p className="text-sm text-muted-foreground">
                Select the plan that best fits your practice needs
              </p>
            </div>
            <SubscriptionTiers />
          </TabsContent>
        </Tabs>
      </div>
    </PractitionerDashboardPageLayout>
  )
}