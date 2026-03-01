import type { Metadata } from "next"
import { ServiceOverviewPage } from "@/components/dashboard/practitioner/service-edit/service-overview-page"

export const metadata: Metadata = {
  title: "Service Overview | Practitioner Portal",
  description: "Manage your service",
}

export default function ServicePage({ params }: { params: { id: string } }) {
  return <ServiceOverviewPage serviceId={params.id} />
}
