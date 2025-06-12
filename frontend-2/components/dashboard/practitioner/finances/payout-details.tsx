import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Payout } from "@/types/payout"
import { formatCurrency } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface PayoutDetailsProps {
  payout: Payout
}

export function PayoutDetails({ payout }: PayoutDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Payout #{payout.id}</CardTitle>
              <Badge className={getStatusColor(payout.status)}>
                {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-3xl font-bold">{formatCurrency(payout.amount)}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Requested</p>
                <p className="font-medium">{formatDate(payout.requestedDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="font-medium">{formatDate(payout.processedDate || payout.requestedDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Amount Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Gross Amount</span>
                <span className="font-medium">{formatCurrency(payout.grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Commission ({payout.commissionRate}%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(payout.commissionAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Net Payout</span>
                <span className="font-bold">{formatCurrency(payout.amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payout Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Transactions</span>
                <span className="font-medium">{payout.transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Commission Rate</span>
                <span className="font-medium">{payout.commissionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Processing Time</span>
                <span className="font-medium">{payout.processingTime} days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Included Transactions ({payout.transactions.length})</CardTitle>
          <CardDescription>Transactions included in this payout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payout.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{transaction.serviceType}</p>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.clientName}</TableCell>
                    <TableCell>
                      <div>
                        <p>{formatDate(transaction.date)}</p>
                        <p className="text-xs text-muted-foreground">{transaction.timeSlot || "N/A"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {payout.status === "completed" && (
        <Card className="bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-400">Transfer Completed</h3>
                <p className="text-sm text-green-700 dark:text-green-500">
                  Your funds have been successfully transferred to your connected Stripe account.
                </p>
                <p className="mt-2 text-xs text-green-600 dark:text-green-500">Transfer ID: {payout.transferId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
