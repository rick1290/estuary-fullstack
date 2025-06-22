import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export const metadata: Metadata = {
  title: "Messages | Practitioner Portal",
  description: "Manage your client communications",
}

export default function PractitionerMessagesPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Messages" 
      description="Manage your client communications"
      fullWidth={true}
    >
      <div className="flex h-[calc(100vh-10rem)] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden border-2 border-sage-200 rounded-xl bg-white/80 backdrop-blur-sm">
        <div className="w-full md:w-1/3 border-r border-sage-200 overflow-hidden">
          <PractitionerMessagesList />
        </div>
        <div className="hidden md:block w-2/3 overflow-hidden">
          <PractitionerMessageDetail />
        </div>
      </div>
    </PractitionerDashboardPageLayout>
  )
}
