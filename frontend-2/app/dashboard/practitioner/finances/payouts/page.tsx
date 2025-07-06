import type { Metadata } from "next"
import PayoutsClient from "./payouts-client"

export const metadata: Metadata = {
  title: "Payouts | Practitioner Portal",
  description: "Manage your withdrawal requests and payout history",
}

export default function PayoutsPage() {
  return <PayoutsClient />
}