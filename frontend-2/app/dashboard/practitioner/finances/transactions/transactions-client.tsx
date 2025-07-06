"use client"

import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { PractitionerTransactionsTable } from "@/components/dashboard/practitioner/finances/practitioner-transactions-table"
import { DollarSign } from "lucide-react"

export default function TransactionsClient() {
  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Transactions"
        helpLink="/help/practitioner/transactions"
        action={{
          label: "Financial Overview",
          icon: <DollarSign className="h-4 w-4" />,
          href: "/dashboard/practitioner/finances/overview"
        }}
      />

      <div className="px-6 py-4">
        <PractitionerTransactionsTable />
      </div>
    </>
  )
}