import type { Metadata } from "next"
import { ServiceSettingsView } from "@/components/dashboard/practitioner/service-edit/service-settings-view"

export const metadata: Metadata = {
  title: "Service Settings | Practitioner Portal",
  description: "Configure your service settings",
}

export default function ServiceSettingsPage({ params }: { params: { id: string } }) {
  return <ServiceSettingsView serviceId={params.id} />
}
