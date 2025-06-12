import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import StreamsDashboard from "@/components/dashboard/practitioner/streams/streams-dashboard"

export const metadata: Metadata = {
  title: "Streams Management | Practitioner Dashboard",
  description: "Manage your content streams, posts, and subscriber engagement.",
}

export default function StreamsPage() {
  return (
    <PractitionerDashboardPageLayout
      title="Content Streams"
      description="Manage your content streams, posts, and subscriber engagement"
    >
      <StreamsDashboard />
    </PractitionerDashboardPageLayout>
  )
}
