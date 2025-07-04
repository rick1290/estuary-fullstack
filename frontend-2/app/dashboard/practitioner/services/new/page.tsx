import { GuidedServiceWizard } from "@/components/dashboard/practitioner/service-creation/guided-service-wizard"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Service | Practitioner Portal",
  description: "Create a new service offering",
}

export default function NewServicePage() {
  return <GuidedServiceWizard />
}