import type { Metadata } from "next"
import FeatureRequestForm from "@/components/dashboard/practitioner/feature-requests/feature-request-form"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"

export const metadata: Metadata = {
  title: "Feature Requests | Practitioner Portal",
  description: "Submit feature requests and feedback",
}

export default function FeatureRequestsPage() {
  return (
    <PractitionerDashboardPageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Requests</h1>
          <p className="text-muted-foreground mt-2">
            Help us improve the platform by sharing your ideas and feedback
          </p>
        </div>

        <FeatureRequestForm />
      </div>
    </PractitionerDashboardPageLayout>
  )
}
