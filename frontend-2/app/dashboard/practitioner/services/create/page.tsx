import type { Metadata } from "next"
import ServiceWizard from "@/components/dashboard/practitioner/service-creation/service-wizard"

export const metadata: Metadata = {
  title: "Create Service | Practitioner Portal",
  description: "Create a new service offering for your clients",
}

export default function CreateServicePage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Create Service</h1>
      <ServiceWizard />
    </div>
  )
}
