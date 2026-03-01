import type { Metadata } from "next"
import { SessionDetailPage } from "@/components/dashboard/practitioner/service-edit/session-detail-page"

export const metadata: Metadata = {
  title: "Session Detail | Practitioner Portal",
  description: "Manage session participants and details",
}

export default function SessionPage({ params }: { params: { id: string; sessionId: string } }) {
  return <SessionDetailPage serviceId={params.id} sessionId={params.sessionId} />
}
