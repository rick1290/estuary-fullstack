import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import PractitionerBookingsList from "@/components/dashboard/practitioner/practitioner-bookings-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-sage-600" />
            Client Bookings
          </CardTitle>
          <CardDescription>
            Manage your appointments, reschedule sessions, and track client attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PractitionerBookingsList />
        </CardContent>
      </Card>
    </PractitionerDashboardPageLayout>
  )
}