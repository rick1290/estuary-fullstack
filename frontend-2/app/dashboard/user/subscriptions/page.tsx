import { Metadata } from "next"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserSubscriptions from "@/components/dashboard/user/user-subscriptions"

export const metadata: Metadata = {
  title: "My Subscriptions | User Dashboard",
  description: "Manage your stream subscriptions and billing",
}

export default function UserSubscriptionsPage() {
  return (
    <UserDashboardLayout title="My Subscriptions">
      <UserSubscriptions />
    </UserDashboardLayout>
  )
}