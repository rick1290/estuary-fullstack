import type { Metadata } from "next"
import AvailabilityPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Availability | Practitioner Dashboard",
  description: "Manage your working hours and availability schedules.",
}

export default function AvailabilityPage() {
  return <AvailabilityPageV2 />
}