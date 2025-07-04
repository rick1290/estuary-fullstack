import type { Metadata } from "next"
import ClientsClient from "./clients-client"

export const metadata: Metadata = {
  title: "Clients | Practitioner Dashboard",
  description: "Manage your client relationships and information.",
}

export default function ClientsPage() {
  return <ClientsClient />
}