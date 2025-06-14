"use client"

import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, DollarSign, TrendingUp, Calendar } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

export default function FinancesOverviewPage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Financial Overview" 
      description="Monitor your earnings, payouts, and financial performance"
    >
      <div className="space-y-6">
        <div className="flex gap-2 justify-end">
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-sage-300 text-sage-700 hover:bg-sage-50">
            <Link href="/dashboard/practitioner/finances/transactions">View Transactions</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800">
            <Link href="/dashboard/practitioner/finances/payouts">Manage Payouts</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-sage-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-olive-900">{formatCurrency(54250.89)}</div>
            <p className="text-xs text-olive-600">+{formatCurrency(1250)} from last month</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-sage-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-olive-900">{formatCurrency(50767.89)}</div>
            <p className="text-xs text-olive-600">Ready for withdrawal</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-sage-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-olive-900">+12.5%</div>
            <p className="text-xs text-olive-600">Compared to last month</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
            <Calendar className="h-4 w-4 text-sage-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-olive-900">{formatCurrency(2500)}</div>
            <p className="text-xs text-olive-600">Processing (Est. 2 days)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm lg:col-span-4">
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
            <CardDescription>Your earnings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border rounded-md">
              <p className="text-muted-foreground">Earnings chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm lg:col-span-3">
          <CardHeader>
            <CardTitle>Revenue by Service Type</CardTitle>
            <CardDescription>Distribution of your earnings by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border rounded-md">
              <p className="text-muted-foreground">Revenue distribution chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your most recent financial transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium">Mindfulness Session</p>
                    <p className="text-sm text-muted-foreground">Client: Emma Thompson</p>
                    <p className="text-xs text-olive-600">2 days ago</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(75)}</p>
                    <p className="text-xs text-olive-600">After 5% commission</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/dashboard/practitioner/finances/transactions">
                  View all transactions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Commission Summary</CardTitle>
            <CardDescription>Overview of platform commissions</CardDescription>
          </CardHeader>
          <CardContent>
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
                <p className="font-medium text-green-600">5.0%</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Next Tier</p>
                  <p className="text-sm text-muted-foreground">$75,000 in sales</p>
                </div>
                <p className="font-medium text-green-600">4.5%</p>
              </div>
              <div className="mt-4 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: "72%" }} />
              </div>
              <p className="text-xs text-center text-muted-foreground">$54,250 / $75,000 to next tier (72%)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PractitionerDashboardPageLayout>
  )
}
