import type { Metadata } from "next"
import BookingsPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Bookings | Practitioner Dashboard",
  description: "View and manage all your client bookings.",
}

export default function BookingsPage() {
  return <BookingsPageV2 />
}