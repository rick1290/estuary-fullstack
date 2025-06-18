import type { Metadata } from "next"
import ServiceWizard from "@/components/dashboard/practitioner/service-creation/service-wizard"

export const metadata: Metadata = {
  title: "Edit Service | Practitioner Portal",
  description: "Edit your service offering details",
}

export default function EditServicePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Edit Service</h1>
      <ServiceWizard serviceId={params.id} />
    </div>
  )
}
