import type { Metadata } from "next"
import ClientsList from "@/components/dashboard/practitioner/clients/clients-list"

export const metadata: Metadata = {
  title: "Clients | Practitioner Portal",
  description: "Manage your client relationships and information",
}

export default function PractitionerClientsPage() {
  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Clients</h1>
      <ClientsList />
    </div>
  )
}
