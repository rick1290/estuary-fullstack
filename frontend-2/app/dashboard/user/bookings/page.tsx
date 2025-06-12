import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserBookingsList from "@/components/dashboard/user/user-bookings-list"

export default function UserBookingsPage() {
  return (
    <UserDashboardLayout title="My Bookings">
      <UserBookingsList />
    </UserDashboardLayout>
  )
}
