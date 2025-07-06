import { Metadata } from "next"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserStreamSubscriptions from "@/components/dashboard/user/user-stream-subscriptions"

export const metadata: Metadata = {
  title: "My Streams | User Dashboard",
  description: "Manage your stream subscriptions and view your content",
}

export default function UserStreamsPage() {
  return (
    <UserDashboardLayout title="My Streams">
      <UserStreamSubscriptions />
    </UserDashboardLayout>
  )
}