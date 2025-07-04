import type { Metadata } from "next"
import FinancialOverviewClient from "./overview-client"

export const metadata: Metadata = {
  title: "Financial Overview | Practitioner Dashboard",
  description: "Monitor your earnings, payouts, and financial performance.",
}

export default function FinancialOverviewPage() {
  return <FinancialOverviewClient />
}