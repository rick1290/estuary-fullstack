"use client"
import { useSearchParams } from "next/navigation"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserMessagesList from "@/components/dashboard/user/messages/user-messages-list"
import UserMessageDetail from "@/components/dashboard/user/messages/user-message-detail"

export default function UserMessagesPage() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")

  return (
    <UserDashboardLayout fullWidth>
      <style jsx>{`
        .messages-container {
          height: calc(100vh - 3.5rem - 6rem);
          display: grid;
          grid-template-rows: 1fr;
        }
      `}</style>

      <div className="messages-container">
        <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-sage-200 rounded-lg shadow-sm overflow-hidden min-h-0">
          {/* Conversations List — hidden on mobile when viewing a conversation */}
          <div className={`border-r border-sage-200 overflow-hidden min-h-0 ${conversationId ? 'hidden md:block' : 'block'}`}>
            <UserMessagesList />
          </div>

          {/* Message Thread — hidden on mobile when no conversation selected */}
          <div className={`md:col-span-2 overflow-hidden min-h-0 ${conversationId ? 'block' : 'hidden md:block'}`}>
            <UserMessageDetail />
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
