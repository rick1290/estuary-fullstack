"use client"

import { useSearchParams } from "next/navigation"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import PractitionerMessagesList from "@/components/dashboard/practitioner/messages/practitioner-messages-list"
import PractitionerMessageDetail from "@/components/dashboard/practitioner/messages/practitioner-message-detail"

export default function MessagesClient() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")

  return (
    <>
      <PractitionerPageHeader
        title="Messages"
        helpLink="/help/practitioner/messages"
      />

      <div className="px-4 sm:px-6 py-4 h-[calc(100vh-4rem-6rem)]">
        <div className="flex bg-background border border-sage-200 rounded-lg overflow-hidden h-full">
          {/* Conversations List — hidden on mobile when viewing a conversation */}
          <div className={`w-full md:w-1/3 border-r overflow-hidden ${conversationId ? 'hidden md:block' : 'block'}`}>
            <PractitionerMessagesList />
          </div>

          {/* Message Thread — hidden on mobile when no conversation selected */}
          <div className={`flex-1 overflow-hidden ${conversationId ? 'flex' : 'hidden md:flex'}`}>
            <PractitionerMessageDetail />
          </div>
        </div>
      </div>
    </>
  )
}
