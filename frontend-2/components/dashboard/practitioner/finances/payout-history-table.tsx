"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { Payout } from "@/types/payout"
import { PayoutDetailsDialog } from "./payout-details-dialog"

interface PayoutHistoryTableProps {
  payouts: Payout[]
}

export function PayoutHistoryTable({ payouts }: PayoutHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)

  const filteredPayouts = payouts.filter((payout) => {
    if (statusFilter === "all") return true
    return payout.status.toLowerCase() === statusFilter.toLowerCase()
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-sage-100 text-sage-800"
      case "processing":
        return "bg-terracotta-100 text-terracotta-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-sage-100 text-olive-800"
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

  const handleRowClick = (payout: Payout) => {
    setSelectedPayout(payout)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle className="text-xl">Payout History</CardTitle>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto -mx-2 sm:mx-0">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Payout ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No payouts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayouts.map((payout) => (
                  <TableRow
                    key={payout.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(payout)}
                  >
                    <TableCell>#{payout.id}</TableCell>
                    <TableCell>{formatDate(payout.requestedDate)}</TableCell>
                    <TableCell>{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payout.status)}>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(payout)
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PayoutDetailsDialog
        payout={selectedPayout}
        open={!!selectedPayout}
        onOpenChange={(open) => {
          if (!open) setSelectedPayout(null)
        }}
      />
    </Card>
  )
}
