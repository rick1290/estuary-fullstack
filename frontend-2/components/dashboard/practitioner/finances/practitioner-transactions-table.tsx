"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Mock data for transactions
const mockTransactions = [
  {
    id: "tx-1",
    date: new Date(2023, 4, 15),
    type: "Payment",
    transactionType: "Credit Card",
    serviceType: "Session",
    serviceName: "Mindfulness Meditation",
    client: "Emma Thompson",
    amount: 120.0,
  },
  {
    id: "tx-2",
    date: new Date(2023, 4, 16),
    type: "Payment",
    transactionType: "Bank Transfer",
    serviceType: "Course",
    serviceName: "Stress Management Course",
    client: "John Davis",
    amount: 350.0,
  },
  {
    id: "tx-3",
    date: new Date(2023, 4, 17),
    type: "Refund",
    transactionType: "Credit Card",
    serviceType: "Workshop",
    serviceName: "Yoga for Beginners",
    client: "Sarah Miller",
    amount: -75.0,
  },
  {
    id: "tx-4",
    date: new Date(2023, 4, 18),
    type: "Payment",
    transactionType: "PayPal",
    serviceType: "Session",
    serviceName: "Career Coaching",
    client: "Michael Brown",
    amount: 150.0,
  },
  {
    id: "tx-5",
    date: new Date(2023, 4, 19),
    type: "Payment",
    transactionType: "Credit Card",
    serviceType: "Session",
    serviceName: "Mindfulness Meditation",
    client: "Jessica Wilson",
    amount: 120.0,
  },
  {
    id: "tx-6",
    date: new Date(2023, 4, 20),
    type: "Platform Fee",
    transactionType: "Automatic",
    serviceType: "Fee",
    serviceName: "Monthly Platform Fee",
    client: "Estuary",
    amount: -45.0,
  },
  {
    id: "tx-7",
    date: new Date(2023, 4, 21),
    type: "Payout",
    transactionType: "Bank Transfer",
    serviceType: "Payout",
    serviceName: "Weekly Payout",
    client: "Estuary",
    amount: -620.0,
  },
  {
    id: "tx-8",
    date: new Date(2023, 4, 22),
    type: "Payment",
    transactionType: "Credit Card",
    serviceType: "Workshop",
    serviceName: "Meditation Workshop",
    client: "David Clark",
    amount: 85.0,
  },
  {
    id: "tx-9",
    date: new Date(2023, 4, 23),
    type: "Payment",
    transactionType: "Credit Card",
    serviceType: "Course",
    serviceName: "Mindful Leadership",
    client: "Robert Johnson",
    amount: 400.0,
  },
  {
    id: "tx-10",
    date: new Date(2023, 4, 24),
    type: "Refund",
    transactionType: "PayPal",
    serviceType: "Session",
    serviceName: "Life Coaching",
    client: "Jennifer Adams",
    amount: -150.0,
  },
]

// Generate transactions for the current month
const generateCurrentTransactions = () => {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  return mockTransactions.map((tx) => ({
    ...tx,
    date: new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1),
  }))
}

export function PractitionerTransactionsTable() {
  const [transactions] = useState(generateCurrentTransactions())
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [clientFilter, setClientFilter] = useState<string>("")
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("")

  // Get unique values for filter dropdowns
  const clients = Array.from(new Set(transactions.map((tx) => tx.client)))
  const serviceTypes = Array.from(new Set(transactions.map((tx) => tx.serviceType)))
  const transactionTypes = Array.from(new Set(transactions.map((tx) => tx.transactionType)))

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter((tx) => {
    // Date range filter
    if (dateRange.from && dateRange.to) {
      if (tx.date < dateRange.from || tx.date > dateRange.to) {
        return false
      }
    }

    // Client filter
    if (clientFilter && tx.client !== clientFilter) {
      return false
    }

    // Service type filter
    if (serviceTypeFilter && tx.serviceType !== serviceTypeFilter) {
      return false
    }

    // Transaction type filter
    if (transactionTypeFilter && tx.transactionType !== transactionTypeFilter) {
      return false
    }

    return true
  })

  // Calculate totals
  const totalIncome = filteredTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpenses = filteredTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0)

  const netAmount = totalIncome + totalExpenses

  // Reset all filters
  const resetFilters = () => {
    setDateRange({ from: undefined, to: undefined })
    setClientFilter("")
    setServiceTypeFilter("")
    setTransactionTypeFilter("")
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">${totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", netAmount >= 0 ? "text-emerald-600" : "text-red-600")}>
              ${netAmount.toFixed(2)}
            </div>
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

          {/* Client Filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Service Type Filter */}
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Service Types</SelectItem>
              {serviceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Transaction Type Filter */}
          <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transaction Types</SelectItem>
              {transactionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
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
          <CardTitle>Transactions</CardTitle>
          <CardDescription>{filteredTransactions.length} transactions found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell>{tx.transactionType}</TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.serviceType}</div>
                      <div className="text-sm text-muted-foreground">{tx.serviceName}</div>
                    </TableCell>
                    <TableCell>{tx.client}</TableCell>
                    <TableCell
                      className={cn("text-right font-medium", tx.amount > 0 ? "text-emerald-600" : "text-red-600")}
                    >
                      ${Math.abs(tx.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
