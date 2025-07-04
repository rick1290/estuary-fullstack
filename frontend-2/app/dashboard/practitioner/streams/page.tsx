import type { Metadata } from "next"
import StreamsDashboardV2 from "@/components/dashboard/practitioner/streams/streams-dashboard-v2"

export const metadata: Metadata = {
  title: "Streams Management | Practitioner Dashboard",
  description: "Manage your content streams, posts, and subscriber engagement.",
}

export default function StreamsPage() {
  return <StreamsDashboardV2 />
}
