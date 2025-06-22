import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserStats from "@/components/dashboard/user/user-stats"
import UserUpcomingBookings from "@/components/dashboard/user/user-upcoming-bookings"
import UserRecommendations from "@/components/dashboard/user/user-recommendations"
import UserDashboardFavorites from "@/components/dashboard/user/user-dashboard-favorites"
import UserStreamSubscriptions from "@/components/dashboard/user/user-stream-subscriptions"

export default function UserDashboardPage() {
  return (
    <UserDashboardLayout title="Dashboard">
      <div className="space-y-6">
        <UserStats />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <UserUpcomingBookings />
            <UserStreamSubscriptions />
          </div>
          <div className="space-y-6">
            <UserRecommendations />
            <UserDashboardFavorites />
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
