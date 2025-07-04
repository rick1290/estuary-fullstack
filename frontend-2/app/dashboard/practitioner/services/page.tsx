import type { Metadata } from "next"
import PractitionerServicesManagerV2 from "@/components/dashboard/practitioner/services/practitioner-services-manager-v2"

export const metadata: Metadata = {
  title: "Services | Practitioner Portal",
  description: "Manage your service offerings and packages",
}

export default function PractitionerServicesPage() {
  return <PractitionerServicesManagerV2 />
}
