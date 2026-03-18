import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import JourneysList from "@/components/dashboard/user/journeys/journeys-list"

export default function UserJourneysPage() {
  return (
    <UserDashboardLayout>
      <JourneysList />
    </UserDashboardLayout>
  )
}
