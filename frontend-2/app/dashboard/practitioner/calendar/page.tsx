import type { Metadata } from "next"
import CalendarPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Calendar | Practitioner Dashboard",
  description: "View and manage your upcoming calendar and bookings.",
}

export default function CalendarPage() {
  return <CalendarPageV2 />
}