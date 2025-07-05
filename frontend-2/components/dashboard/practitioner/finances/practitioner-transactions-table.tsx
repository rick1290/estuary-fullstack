"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { payoutsEarningsTransactionsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusConfig = {
  'projected': { label: 'Projected', variant: 'secondary' },
  'pending': { label: 'Pending', variant: 'warning' },
  'available': { label: 'Available', variant: 'success' },
  'paid': { label: 'Paid', variant: 'default' },
  'reversed': { label: 'Reversed', variant: 'destructive' },
}

export function PractitionerTransactionsTable() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all")

  // Build query parameters
  const queryParams: any = {
    limit,
    offset: (page - 1) * limit,
    ordering: '-created_at'
  }

  if (dateRange.from) {
    queryParams.start_date = format(dateRange.from, 'yyyy-MM-dd')
  }
  if (dateRange.to) {
    queryParams.end_date = format(dateRange.to, 'yyyy-MM-dd')
  }
  if (statusFilter && statusFilter !== "all") {
    queryParams.status = statusFilter
  }
  if (serviceTypeFilter && serviceTypeFilter !== "all") {
    queryParams.service_type = serviceTypeFilter
  }

  // Fetch transactions
  const { data, isLoading, error } = useQuery({
    ...payoutsEarningsTransactionsRetrieveOptions({ query: queryParams }),
  })

  const transactions = data?.results || []
  const totalCount = data?.count || 0

  // Calculate totals from current page data
  const totalEarnings = transactions
    .filter((tx: any) => tx.status !== 'reversed')
    .reduce((sum: number, tx: any) => sum + (tx.net_amount_cents || 0), 0) / 100

  const totalCommission = transactions
    .filter((tx: any) => tx.status !== 'reversed')
    .reduce((sum: number, tx: any) => sum + (tx.commission_amount_cents || 0), 0) / 100

  const totalAvailable = transactions
    .filter((tx: any) => tx.status === 'available')
    .reduce((sum: number, tx: any) => sum + (tx.net_amount_cents || 0), 0) / 100

  // Reset all filters
  const resetFilters = () => {
    setDateRange({ from: undefined, to: undefined })
    setStatusFilter("all")
    setServiceTypeFilter("all")
    setPage(1)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Failed to load transactions. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">${totalEarnings.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">${totalCommission.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-green-600">${totalAvailable.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-full md:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={new Date()}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>

          {/* Service Type Filter */}
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Service Types</SelectItem>
              <SelectItem value="session">Sessions</SelectItem>
              <SelectItem value="workshop">Workshops</SelectItem>
              <SelectItem value="course">Courses</SelectItem>
              <SelectItem value="package">Packages</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters Button */}
          <Button variant="ghost" onClick={resetFilters} className="w-full md:w-auto">
            Reset Filters
          </Button>
        </div>

        {/* Export Button */}
        <Button className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Transactions</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalCount} transactions found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {format(new Date(tx.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      #{tx.booking?.public_uuid?.slice(-8) || tx.booking_id}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.booking?.service?.name || 'Service'}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {tx.booking?.service?.service_type || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.booking?.user?.full_name || tx.booking?.user?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[tx.status as keyof typeof statusConfig]?.variant as any}>
                        {statusConfig[tx.status as keyof typeof statusConfig]?.label || tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(tx.gross_amount_cents / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      -${(tx.commission_amount_cents / 100).toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tx.commission_rate}%)
                      </span>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      tx.status === 'reversed' ? "text-red-600" : "text-green-600"
                    )}>
                      ${(tx.net_amount_cents / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalCount > limit && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                variant="outline"
                size="sm"
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(totalCount / limit)}
              </span>
              <Button
                onClick={() => setPage(prev => prev + 1)}
                variant="outline"
                size="sm"
                disabled={!data?.next || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}