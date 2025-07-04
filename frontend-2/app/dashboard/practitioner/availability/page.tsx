import type { Metadata } from "next"
import AvailabilityClient from "./availability-client"

export const metadata: Metadata = {
  title: "Availability | Practitioner Dashboard",
  description: "Manage your working hours and availability schedules.",
}

export default function AvailabilityPage() {
  return <AvailabilityClient />
}