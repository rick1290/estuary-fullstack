"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { practitionersEarningsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Calendar, Download, FileText } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts"
import { format, parseISO } from "date-fns"

export default function EarningsClient() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  
  // Fetch earnings data based on selected period
  const { data: earningsData, isLoading } = useQuery(
    practitionersEarningsRetrieveOptions({
      query: {
        group_by: period
      }
    })
  )
  
  // Prepare chart data
  const chartData = earningsData?.time_series?.map(item => ({
    period: item.period ? (
      period === 'month' ? format(parseISO(item.period), 'MMM yyyy') :
      period === 'quarter' ? `Q${Math.ceil((parseISO(item.period).getMonth() + 1) / 3)} ${format(parseISO(item.period), 'yyyy')}` :
      format(parseISO(item.period), 'yyyy')
    ) : '',
    gross: item.gross_amount / 100,
    net: item.net_amount / 100,
    commission: item.commission_amount / 100
  })) || []
  
  const serviceData = earningsData?.by_service_type?.map(item => ({
    name: item.service_type_display || item.service_type,
    value: item.amount / 100,
    percentage: ((item.amount / 100) / (earningsData?.totals?.gross_amount || 1) * 10000).toFixed(1)
  })) || []
  
  const COLORS = ['#9CAF88', '#E07A5F', '#7A6F5D', '#F4A261']
  
  // Calculate current vs previous period
  const latestPeriods = chartData.slice(-2)
  const currentPeriodData = latestPeriods[1] || { net: 0 }
  const previousPeriodData = latestPeriods[0] || { net: 0 }
  const growth = previousPeriodData.net ? ((currentPeriodData.net - previousPeriodData.net) / previousPeriodData.net * 100).toFixed(1) : 0
  
  // Calculate average
  const average = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.net, 0) / chartData.length : 0

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Billings & Earnings"
        helpLink="/help/practitioner/earnings"
        action={{
          label: "View Transactions",
          icon: <FileText className="h-4 w-4" />,
          href: "/dashboard/practitioner/finances/transactions"
        }}
      />

      <div className="px-6 py-4 space-y-6">
        <Tabs defaultValue="monthly" className="space-y-4" onValueChange={(value) => {
          setPeriod(value === 'monthly' ? 'month' : value === 'quarterly' ? 'quarter' : 'year')
        }}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Month</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${currentPeriodData.net.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {growth !== 0 ? `${Number(growth) > 0 ? '+' : ''}${growth}% from last month` : 'No previous data'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Previous Month</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${previousPeriodData.net.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Previous period earnings
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${average.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on last {chartData.length} months
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Earnings</CardTitle>
                <CardDescription>Your net earnings after commission for the past months</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Line type="monotone" dataKey="net" stroke="#9CAF88" strokeWidth={2} name="Net Earnings" />
                      <Line type="monotone" dataKey="gross" stroke="#E07A5F" strokeWidth={2} name="Gross Earnings" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">No earnings data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="quarterly" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Quarter</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${currentPeriodData.net.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {growth !== 0 ? `${Number(growth) > 0 ? '+' : ''}${growth}% from last quarter` : 'No previous data'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Previous Quarter</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${previousPeriodData.net.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Previous quarter earnings
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quarterly Average</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${average.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on last {chartData.length} quarters
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quarterly Earnings</CardTitle>
                <CardDescription>Your net earnings after commission by quarter</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Bar dataKey="net" fill="#9CAF88" name="Net Earnings" />
                      <Bar dataKey="commission" fill="#E07A5F" name="Commission" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">No earnings data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="yearly" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Year</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${currentPeriodData.net.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Year to date earnings
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Previous Year</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${previousPeriodData.net.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Complete year
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Year-over-Year Growth</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {growth !== 0 ? `${Number(growth) > 0 ? '+' : ''}${growth}%` : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on current vs previous year
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Yearly Earnings</CardTitle>
                <CardDescription>Your earnings year over year</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Bar dataKey="net" fill="#9CAF88" name="Net Earnings" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">No earnings data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>Breakdown of your earnings by service type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[300px] w-full" />
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {serviceData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={serviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percentage }) => `${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {serviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-4">
                      {serviceData.map((service, index) => (
                        <div key={service.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{service.name}</p>
                            <p className="font-medium">${service.value.toFixed(2)} ({service.percentage}%)</p>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${service.percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 h-[300px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">No revenue data available</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}