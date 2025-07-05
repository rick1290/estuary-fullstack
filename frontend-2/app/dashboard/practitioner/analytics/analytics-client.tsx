"use client"

import { useState } from "react"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays } from "date-fns"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ArrowDown, ArrowUp, CalendarIcon, Download, Info, RefreshCw, TrendingUp } from "lucide-react"

// Mock data for the charts
const profileViewsData = [
  { name: "Jan 1", views: 400 },
  { name: "Jan 2", views: 300 },
  { name: "Jan 3", views: 500 },
  { name: "Jan 4", views: 280 },
  { name: "Jan 5", views: 590 },
  { name: "Jan 6", views: 390 },
  { name: "Jan 7", views: 490 },
  { name: "Jan 8", views: 600 },
  { name: "Jan 9", views: 700 },
  { name: "Jan 10", views: 500 },
  { name: "Jan 11", views: 600 },
  { name: "Jan 12", views: 700 },
  { name: "Jan 13", views: 650 },
  { name: "Jan 14", views: 800 },
]

const bookingsData = [
  { name: "Jan 1", bookings: 4 },
  { name: "Jan 2", bookings: 3 },
  { name: "Jan 3", bookings: 5 },
  { name: "Jan 4", bookings: 2 },
  { name: "Jan 5", bookings: 7 },
  { name: "Jan 6", bookings: 4 },
  { name: "Jan 7", bookings: 5 },
  { name: "Jan 8", bookings: 6 },
  { name: "Jan 9", bookings: 8 },
  { name: "Jan 10", bookings: 5 },
  { name: "Jan 11", bookings: 6 },
  { name: "Jan 12", bookings: 7 },
  { name: "Jan 13", bookings: 6 },
  { name: "Jan 14", bookings: 9 },
]

const conversionRateData = [
  { name: "Jan 1", rate: 2.1 },
  { name: "Jan 2", rate: 2.3 },
  { name: "Jan 3", rate: 2.5 },
  { name: "Jan 4", rate: 1.8 },
  { name: "Jan 5", rate: 3.2 },
  { name: "Jan 6", rate: 2.9 },
  { name: "Jan 7", rate: 3.0 },
  { name: "Jan 8", rate: 3.2 },
  { name: "Jan 9", rate: 3.5 },
  { name: "Jan 10", rate: 2.8 },
  { name: "Jan 11", rate: 3.2 },
  { name: "Jan 12", rate: 3.8 },
  { name: "Jan 13", rate: 3.5 },
  { name: "Jan 14", rate: 4.0 },
]

const servicePopularityData = [
  { name: "Meditation Sessions", value: 35 },
  { name: "Yoga Classes", value: 25 },
  { name: "Life Coaching", value: 20 },
  { name: "Wellness Workshops", value: 15 },
  { name: "Other Services", value: 5 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const funnelData = [
  { name: "Profile Views", value: 2487 },
  { name: "Service Page Clicks", value: 1245 },
  { name: "Added to Cart", value: 430 },
  { name: "Completed Booking", value: 87 },
]

export default function AnalyticsClient() {
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: subDays(new Date(), 13),
    to: new Date(),
  })

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Analytics"
        helpLink="/help/practitioner/analytics"
        action={{
          label: "Export Report",
          icon: <Download className="h-4 w-4" />,
          onClick: () => {
            // Handle export
          }
        }}
      />

      <div className="px-6 py-4 space-y-6">
        <div className="flex items-center gap-2 justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profile Views</CardDescription>
            <CardTitle className="text-2xl">2,487</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center text-sm">
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">12.5%</span>
              <span className="text-muted-foreground ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
            <CardTitle className="text-2xl">87</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center text-sm">
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">23.2%</span>
              <span className="text-muted-foreground ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-2xl">3.5%</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center text-sm">
              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-500 font-medium">2.1%</span>
              <span className="text-muted-foreground ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Revenue per Booking</CardDescription>
            <CardTitle className="text-2xl">$125</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center text-sm">
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">8.3%</span>
              <span className="text-muted-foreground ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

        <Tabs defaultValue="profile-views" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile-views">Profile Views</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="profile-views" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profile Views Over Time</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profileViewsData}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="views" stroke="#8884d8" fillOpacity={1} fill="url(#colorViews)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bookings Over Time</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversion" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Conversion Rate Trend</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionRateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="rate" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Retention</CardTitle>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { month: "Jan", retention: 65 },
                    { month: "Feb", retention: 68 },
                    { month: "Mar", retention: 72 },
                    { month: "Apr", retention: 70 },
                    { month: "May", retention: 75 },
                    { month: "Jun", retention: 78 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="retention" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Service Popularity</CardTitle>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={servicePopularityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {servicePopularityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conversion Funnel</CardTitle>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((stage, index) => {
                  const percentage = (stage.value / funnelData[0].value) * 100
                  const previousValue = index > 0 ? funnelData[index - 1].value : stage.value
                  const dropOff = index > 0 ? ((previousValue - stage.value) / previousValue) * 100 : 0

                  return (
                    <div key={stage.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{stage.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          {stage.value} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="relative h-8 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-primary transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {index > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {dropOff.toFixed(1)}% drop-off from previous step
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}