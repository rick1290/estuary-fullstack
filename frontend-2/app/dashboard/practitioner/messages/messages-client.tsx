"use client"

import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export default function MessagesClient() {
  return (
    <div className="h-[calc(100vh-4rem-3rem)]">
      <div className="flex bg-background border rounded-lg shadow-sm overflow-hidden h-full">
        {/* Conversations List */}
        <div className="w-full md:w-1/3 border-r overflow-hidden">
          <PractitionerMessagesList />
        </div>

        {/* Message Thread */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <PractitionerMessageDetail />
        </div>
      </div>
    </div>
  )
}