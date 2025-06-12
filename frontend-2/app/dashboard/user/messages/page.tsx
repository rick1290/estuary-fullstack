"use client"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import UserMessagesList from "@/components/dashboard/user/messages/user-messages-list"
import UserMessageDetail from "@/components/dashboard/user/messages/user-message-detail"

export default function UserMessagesPage() {
  const searchParams = useSearchParams()
  const practitionerId = searchParams.get("practitionerId")

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-200px)]">
          <div className="border-r border-border">
            <UserMessagesList />
          </div>
          <div className="col-span-2 h-full">
            <UserMessageDetail />
          </div>
        </div>
      </Card>
    </div>
  )
}
