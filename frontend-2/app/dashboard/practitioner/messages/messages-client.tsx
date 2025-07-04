"use client"

import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export default function MessagesClient() {
  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Messages"
        helpLink="/help/practitioner/messages"
      />

      <div className="px-6 py-4">
        <style jsx>{`
          .messages-container {
            height: calc(100vh - 4rem - 5rem);
            display: grid;
            grid-template-rows: 1fr;
          }
        `}</style>
        
        <div className="messages-container">
          <div className="flex bg-background border rounded-lg shadow-sm overflow-hidden min-h-0">
            {/* Conversations List */}
            <div className="w-full md:w-1/3 border-r overflow-hidden min-h-0">
              <PractitionerMessagesList />
            </div>
            
            {/* Message Thread */}
            <div className="hidden md:block flex-1 overflow-hidden min-h-0">
              <PractitionerMessageDetail />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}