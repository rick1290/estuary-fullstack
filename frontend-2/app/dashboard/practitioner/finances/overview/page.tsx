import type { Metadata } from "next"
import FinancialOverviewPageV2 from "./page-v2"

export const metadata: Metadata = {
  title: "Financial Overview | Practitioner Dashboard",
  description: "Monitor your earnings, payouts, and financial performance.",
}

export default function FinancialOverviewPage() {
  return <FinancialOverviewPageV2 />
}