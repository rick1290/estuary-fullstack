"use client"

import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import PractitionerBookingsList from "@/components/dashboard/practitioner/practitioner-bookings-list"

export default function BookingsClient() {
  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Bookings"
        helpLink="/help/practitioner/bookings"
      />

      <div className="px-6 py-4">
        <PractitionerBookingsList />
      </div>
    </>
  )
}