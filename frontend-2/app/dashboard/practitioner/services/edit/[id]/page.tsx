import type { Metadata } from "next"
import { ServiceEditSplitView } from "@/components/dashboard/practitioner/service-edit/service-edit-split-view"

export const metadata: Metadata = {
  title: "Edit Service | Practitioner Portal",
  description: "Edit your service offering details",
}

export default function EditServicePage({ params }: { params: { id: string } }) {
  return <ServiceEditSplitView serviceId={params.id} />
}
