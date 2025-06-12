import type { Metadata } from "next"
import PractitionerServicesManager from "@/components/dashboard/practitioner/services/practitioner-services-manager"

export const metadata: Metadata = {
  title: "Services | Practitioner Portal",
  description: "Manage your service offerings and packages",
}

export default function PractitionerServicesPage() {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Services</h1>
      <PractitionerServicesManager />
    </div>
  )
}
