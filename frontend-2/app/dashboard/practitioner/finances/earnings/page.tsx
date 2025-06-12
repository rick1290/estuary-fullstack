"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TrendingUp, Calendar, Download } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

export default function EarningsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billings & Earnings</h1>
          <p className="text-muted-foreground">Track your revenue streams and billing history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button asChild>
            <Link href="/dashboard/practitioner/finances/payouts">Manage Payouts</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
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
                <div className="text-2xl font-bold">{formatCurrency(3250.5)}</div>
                <p className="text-xs text-muted-foreground">+18% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Previous Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(2750.25)}</div>
                <p className="text-xs text-muted-foreground">+12% from prior month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(2875.45)}</div>
                <p className="text-xs text-muted-foreground">Based on last 6 months</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Earnings</CardTitle>
              <CardDescription>Your earnings for the past 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground">Monthly earnings chart will be displayed here</p>
              </div>
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
                <div className="text-2xl font-bold">{formatCurrency(8750.75)}</div>
                <p className="text-xs text-muted-foreground">+15% from last quarter</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Previous Quarter</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(7600.5)}</div>
                <p className="text-xs text-muted-foreground">+10% from prior quarter</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quarterly Average</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(7250.45)}</div>
                <p className="text-xs text-muted-foreground">Based on last 4 quarters</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quarterly Earnings</CardTitle>
              <CardDescription>Your earnings for the past 8 quarters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground">Quarterly earnings chart will be displayed here</p>
              </div>
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
                <div className="text-2xl font-bold">{formatCurrency(32500.75)}</div>
                <p className="text-xs text-muted-foreground">Projected: {formatCurrency(54250.89)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Previous Year</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(42750.5)}</div>
                <p className="text-xs text-muted-foreground">Complete year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Year-over-Year Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+27%</div>
                <p className="text-xs text-muted-foreground">Based on projected earnings</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Yearly Earnings</CardTitle>
              <CardDescription>Your earnings year over year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground">Yearly earnings chart will be displayed here</p>
              </div>
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
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-[300px] flex items-center justify-center border rounded-md">
              <p className="text-muted-foreground">Revenue distribution chart will be displayed here</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">One-on-One Sessions</p>
                  <p className="font-medium">{formatCurrency(25750.5)} (47.5%)</p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: "47.5%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Group Workshops</p>
                  <p className="font-medium">{formatCurrency(15250.25)} (28.1%)</p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: "28.1%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Courses</p>
                  <p className="font-medium">{formatCurrency(8500.75)} (15.7%)</p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: "15.7%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Digital Products</p>
                  <p className="font-medium">{formatCurrency(4750.39)} (8.7%)</p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-yellow-500" style={{ width: "8.7%" }} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
