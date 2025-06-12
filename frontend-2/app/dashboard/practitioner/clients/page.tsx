import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import ClientsList from "@/components/dashboard/practitioner/clients/clients-list"

export const metadata: Metadata = {
  title: "Clients | Practitioner Portal",
  description: "Manage your client relationships and information",
}

export default function PractitionerClientsPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Clients" 
      description="Manage your client relationships and information"
    >
      <ClientsList />
    </PractitionerDashboardPageLayout>
  )
}
