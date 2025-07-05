import type { Metadata } from "next"
import TransactionsClient from "./transactions-client"

export const metadata: Metadata = {
  title: "Transactions | Practitioner Portal",
  description: "View and manage your financial transactions",
}

export default function PractitionerTransactionsPage() {
  return <TransactionsClient />
}