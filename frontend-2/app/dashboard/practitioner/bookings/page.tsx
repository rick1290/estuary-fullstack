import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import PractitionerBookingsList from "@/components/dashboard/practitioner/practitioner-bookings-list"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Bookings | Practitioner Portal",
  description: "View and manage all your client bookings.",
}

export default function PractitionerBookingsPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="All Bookings" 
      description="View and manage all your client bookings in one place."
    >
      <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <PractitionerBookingsList />
        </CardContent>
      </Card>
    </PractitionerDashboardPageLayout>
  )
}