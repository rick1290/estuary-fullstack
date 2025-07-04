import type { Metadata } from "next"
import ClientsPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Clients | Practitioner Dashboard",
  description: "Manage your client relationships and information.",
}

export default function ClientsPage() {
  return <ClientsPageV2 />
}