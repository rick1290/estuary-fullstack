"use client"

import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export default function MessagesClient() {
  return (
    <>
      <PractitionerPageHeader
        title="Messages"
        helpLink="/help/practitioner/messages"
      />

      <div className="px-4 sm:px-6 py-4 h-[calc(100vh-4rem-6rem)]">
        <div className="flex bg-background border border-sage-200 rounded-lg overflow-hidden h-full">
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
    </>
  )
}
