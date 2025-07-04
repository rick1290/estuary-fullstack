import type { Metadata } from "next"
import BookingsClient from "./bookings-client"

export const metadata: Metadata = {
  title: "Bookings | Practitioner Dashboard",
  description: "View and manage all your client bookings.",
}

export default function BookingsPage() {
  return <BookingsClient />
}