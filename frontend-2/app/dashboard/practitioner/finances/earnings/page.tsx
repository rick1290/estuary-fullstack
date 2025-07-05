import type { Metadata } from "next"
import EarningsClient from "./earnings-client"

export const metadata: Metadata = {
  title: "Billings & Earnings | Practitioner Portal",
  description: "Track your revenue streams and billing history",
}

export default function EarningsPage() {
  return <EarningsClient />
}