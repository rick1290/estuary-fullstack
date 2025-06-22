"use client"

import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export default function PractitionerMessagesPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Messages" 
      fullWidth={true}
    >
      <style jsx>{`
        .messages-container {
          height: calc(100vh - 3.5rem - 10rem);
          display: grid;
          grid-template-rows: 1fr;
        }
      `}</style>
      
      <div className="messages-container">
        <div className="flex bg-white border border-sage-200 rounded-lg shadow-sm overflow-hidden min-h-0">
          {/* Conversations List */}
          <div className="w-full md:w-1/3 border-r border-sage-200 overflow-hidden min-h-0">
            <PractitionerMessagesList />
          </div>
          
          {/* Message Thread */}
          <div className="hidden md:block flex-1 overflow-hidden min-h-0">
            <PractitionerMessageDetail />
          </div>
        </div>
      </div>
    </PractitionerDashboardPageLayout>
  )
}
