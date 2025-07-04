import type { Metadata } from "next"
import CalendarClient from "./calendar-client"

export const metadata: Metadata = {
  title: "Calendar | Practitioner Dashboard",
  description: "View and manage your upcoming calendar and bookings.",
}

export default function CalendarPage() {
  return <CalendarClient />
}