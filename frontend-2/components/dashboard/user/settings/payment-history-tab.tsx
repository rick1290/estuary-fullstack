"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { paymentsListOptions } from "@/src/client/@tanstack/react-query.gen"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Receipt, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

// Map payment status to display badges
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  'succeeded': { label: 'Completed', variant: 'default' },
  'completed': { label: 'Completed', variant: 'default' },
  'processing': { label: 'Processing', variant: 'secondary' },
  'pending': { label: 'Pending', variant: 'secondary' },
  'failed': { label: 'Failed', variant: 'destructive' },
  'canceled': { label: 'Canceled', variant: 'outline' },
  'refunded': { label: 'Refunded', variant: 'outline' },
}

export default function PaymentHistoryTab() {
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch payments
  const { data: paymentsData, isLoading, error } = useQuery({
    ...paymentsListOptions({
      query: {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ordering: '-created_at'
      }
    }),
  })

  const payments = paymentsData?.results || []
  const totalCount = paymentsData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Format amount from cents to dollars
  const formatAmount = (amountCents: number) => {
    return (amountCents / 100).toFixed(2)
  }

  // Get status config
  const getStatusConfig = (status: string) => {
    return statusConfig[status.toLowerCase()] || { label: status, variant: 'outline' as const }
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-medium mb-6">Payment History</h2>
        <Card>
          <CardContent className="p-0">
            <div className="p-6">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-medium mb-6">Payment History</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load payment history. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-medium mb-6">Payment History</h2>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment history yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const statusCfg = getStatusConfig(payment.status || 'pending')
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.created_at 
                            ? format(new Date(payment.created_at), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.description || 'Service booking'}</p>
                            {payment.booking && (
                              <p className="text-sm text-muted-foreground">
                                Booking #{payment.booking}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${formatAmount(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.order?.public_uuid ? (
                            <span className="text-sm text-muted-foreground font-mono">
                              #{payment.order.public_uuid.slice(-8).toUpperCase()}
                            </span>
                          ) : payment.public_uuid ? (
                            <span className="text-sm text-muted-foreground font-mono">
                              #{payment.public_uuid.slice(-8).toUpperCase()}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount} payments
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}