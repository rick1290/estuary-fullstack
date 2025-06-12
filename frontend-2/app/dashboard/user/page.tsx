import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserStats from "@/components/dashboard/user/user-stats"
import UserUpcomingBookings from "@/components/dashboard/user/user-upcoming-bookings"
import UserRecommendations from "@/components/dashboard/user/user-recommendations"

export default function UserDashboardPage() {
  return (
    <UserDashboardLayout title="Dashboard">
      <div className="space-y-6">
        <UserStats />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UserUpcomingBookings />
          <UserRecommendations />
        </div>
      </div>
    </UserDashboardLayout>
  )
}
