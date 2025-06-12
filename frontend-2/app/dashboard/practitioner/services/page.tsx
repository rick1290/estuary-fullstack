import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import PractitionerServicesManager from "@/components/dashboard/practitioner/services/practitioner-services-manager"

export const metadata: Metadata = {
  title: "Services | Practitioner Portal",
  description: "Manage your service offerings and packages",
}

export default function PractitionerServicesPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Services" 
      description="Manage your service offerings and packages"
    >
      <PractitionerServicesManager />
    </PractitionerDashboardPageLayout>
  )
}
