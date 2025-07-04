"use client"

import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, DollarSign, TrendingUp, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { practitionersEarningsRetrieveOptions, practitionersBalanceRetrieveOptions, practitionersTransactionsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parseISO } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function FinancialOverviewClient() {
  // Fetch financial data
  const { data: earningsData, isLoading: earningsLoading } = useQuery(
    practitionersEarningsRetrieveOptions({
      query: {
        group_by: 'month'
      }
    })
  )
  
  const { data: balanceData, isLoading: balanceLoading } = useQuery(
    practitionersBalanceRetrieveOptions()
  )
  
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery(
    practitionersTransactionsRetrieveOptions({
      query: {
        page_size: 3
      }
    })
  )

  // Prepare chart data
  const chartData = earningsData?.time_series?.map(item => ({
    date: item.period ? format(parseISO(item.period), 'MMM') : '',
    earnings: item.net_amount / 100
  })) || []

  const pieData = earningsData?.by_service_type?.map(item => ({
    name: item.service_type,
    value: item.amount / 100
  })) || []

  const COLORS = ['#9CAF88', '#E07A5F', '#7A6F5D', '#F4A261']

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Financial Overview"
        helpLink="/help/practitioner/finances"
        action={{
          label: "View Transactions",
          icon: <FileText className="h-4 w-4" />,
          href: "/dashboard/practitioner/finances/transactions"
        }}
      />

      <div className="px-6 py-4 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {earningsData?.totals?.gross_amount_display || "$0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {balanceData?.available_balance_display || "$0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {balanceData?.can_request_payout ? "Ready for withdrawal" : "Below minimum ($50)"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {balanceData?.pending_balance_display || "$0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">48-hour hold period</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {balanceData?.next_payout_date ? format(parseISO(balanceData.next_payout_date), 'MMM d') : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Weekly automatic payout</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
              <CardDescription>Your earnings over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Line type="monotone" dataKey="earnings" stroke="#9CAF88" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground">No earnings data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Revenue by Service Type</CardTitle>
              <CardDescription>Distribution of your earnings by service type</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground">No revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your most recent financial transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactionsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-4">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                      <div className="text-right space-y-1">
                        <Skeleton className="h-4 w-16 ml-auto" />
                        <Skeleton className="h-2 w-20 ml-auto" />
                      </div>
                    </div>
                  ))
                ) : recentTransactions?.results?.length > 0 ? (
                  recentTransactions.results.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium">{transaction.service?.title}</p>
                        <p className="text-sm text-muted-foreground">Client: {transaction.client?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(transaction.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{transaction.net_amount_display}</p>
                        <p className="text-xs text-muted-foreground">After {balanceData?.commission_rate || 5}% commission</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No recent transactions</p>
                )}
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="/dashboard/practitioner/finances/transactions">
                    View all transactions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Commission Summary</CardTitle>
              <CardDescription>Overview of platform commissions</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Standard Rate</p>
                      <p className="text-sm text-muted-foreground">Base commission rate</p>
                    </div>
                    <p className="font-medium">5.0%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Your Current Rate</p>
                      <p className="text-sm text-muted-foreground">Based on volume</p>
                    </div>
                    <p className="font-medium text-green-600">{balanceData?.commission_rate || 5.0}%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lifetime Earnings</p>
                      <p className="text-sm text-muted-foreground">Total earned</p>
                    </div>
                    <p className="font-medium">{balanceData?.lifetime_earnings_display || "$0.00"}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Total Paid Out</p>
                      <p className="text-sm text-muted-foreground">Withdrawals to date</p>
                    </div>
                    <p className="font-medium">{balanceData?.lifetime_payouts_display || "$0.00"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}