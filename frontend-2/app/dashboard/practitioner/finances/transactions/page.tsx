import type { Metadata } from "next"
import { PractitionerTransactionsTable } from "@/components/dashboard/practitioner/finances/practitioner-transactions-table"

export const metadata: Metadata = {
  title: "Transactions | Practitioner Portal",
  description: "View and manage your financial transactions",
}

export default function PractitionerTransactionsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">View and manage your financial transactions</p>
      </div>

      <PractitionerTransactionsTable />
    </div>
  )
}
