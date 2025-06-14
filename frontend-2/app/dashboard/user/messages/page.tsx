"use client"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserMessagesList from "@/components/dashboard/user/messages/user-messages-list"
import UserMessageDetail from "@/components/dashboard/user/messages/user-message-detail"

export default function UserMessagesPage() {
  const searchParams = useSearchParams()
  const practitionerId = searchParams.get("practitionerId")

  return (
    <UserDashboardLayout title="Messages" fullWidth>
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-280px)]">
            <div className="border-r border-sage-200">
              <UserMessagesList />
            </div>
            <div className="col-span-2 h-full">
              <UserMessageDetail />
            </div>
          </div>
        </Card>
      </div>
    </UserDashboardLayout>
  )
}
