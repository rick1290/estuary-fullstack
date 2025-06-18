import type { Metadata } from "next"
import { ServiceEditAccordion } from "@/components/dashboard/practitioner/service-edit/service-edit-accordion"

export const metadata: Metadata = {
  title: "Edit Service | Practitioner Portal",
  description: "Edit your service offering details",
}

export default function EditServicePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-7xl">
      <ServiceEditAccordion serviceId={params.id} />
    </div>
  )
}
