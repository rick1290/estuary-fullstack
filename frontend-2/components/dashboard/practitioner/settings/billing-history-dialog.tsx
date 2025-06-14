"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileDown } from "lucide-react"

// Mock billing history data
const billingHistory = [
  {
    id: "INV-2025-0412",
    date: "2025-04-12",
    amount: 79.0,
    description: "Professional Plan - Monthly Subscription",
    status: "paid",
    receiptUrl: "#",
  },
  {
    id: "INV-2025-0312",
    date: "2025-03-12",
    amount: 79.0,
    description: "Professional Plan - Monthly Subscription",
    status: "paid",
    receiptUrl: "#",
  },
  {
    id: "INV-2025-0212",
    date: "2025-02-12",
    amount: 79.0,
    description: "Professional Plan - Monthly Subscription",
    status: "paid",
    receiptUrl: "#",
  },
  {
    id: "INV-2025-0112",
    date: "2025-01-12",
    amount: 79.0,
    description: "Professional Plan - Monthly Subscription",
    status: "paid",
    receiptUrl: "#",
  },
  {
    id: "INV-2024-1212",
    date: "2024-12-12",
    amount: 29.0,
    description: "Basic Plan - Monthly Subscription",
    status: "paid",
    receiptUrl: "#",
  },
  {
    id: "INV-2024-1112",
    date: "2024-11-12",
    amount: 29.0,
    description: "Basic Plan - Monthly Subscription",
    status: "paid",
    receiptUrl: "#",
  },
]

interface BillingHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BillingHistoryDialog({ open, onOpenChange }: BillingHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Billing History</DialogTitle>
          <DialogDescription>View your subscription billing history and download receipts.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.description}</TableCell>
                  <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={invoice.status === "paid" ? "success" : "destructive"}
                      className={invoice.status === "paid" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                    >
                      {invoice.status === "paid" ? "Paid" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={invoice.receiptUrl} download>
                        <FileDown className="h-4 w-4" />
                        <span className="sr-only">Download receipt</span>
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
