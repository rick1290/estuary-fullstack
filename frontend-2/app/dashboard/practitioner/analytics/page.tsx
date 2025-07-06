import type { Metadata } from "next"
import AnalyticsClient from "./analytics-client"

export const metadata: Metadata = {
  title: "Analytics | Practitioner Portal",
  description: "Track your performance and gain insights to grow your practice",
}

export default function PractitionerAnalyticsPage() {
  return <AnalyticsClient />
}