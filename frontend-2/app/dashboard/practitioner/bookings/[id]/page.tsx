import { use } from "react"
import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import BookingDetailView from "@/components/dashboard/practitioner/bookings/booking-detail-view"

export const metadata: Metadata = {
  title: "Booking Details | Practitioner Portal",
  description: "View and manage booking details",
}

interface BookingDetailPageProps {
  params: Promise<{ id: string }>
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = use(params)

  return (
    <PractitionerDashboardPageLayout
      title="Booking Details"
      description="View and manage booking information"
    >
      <BookingDetailView bookingId={id} />
    </PractitionerDashboardPageLayout>
  )
}