"use client"

import { useState } from "react"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
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
import { ArrowDown, ArrowUp, CalendarIcon, Download, Info, RefreshCw } from "lucide-react"

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

export default function PractitionerAnalyticsPage() {
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: subDays(new Date(), 13),
    to: new Date(),
  })

  return (
    <PractitionerDashboardPageLayout 
      title="Analytics" 
      description="Track your performance and gain insights to grow your practice"
    >
      <div className="space-y-6">
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
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profile Views</CardDescription>
            <CardTitle className="text-2xl">2,487</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-sm font-medium text-emerald-500 flex items-center mr-2">
                <ArrowUp className="h-4 w-4 mr-1" />
                12%
              </div>
              <div className="text-sm text-muted-foreground">vs previous period</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
            <CardTitle className="text-2xl">87</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-sm font-medium text-emerald-500 flex items-center mr-2">
                <ArrowUp className="h-4 w-4 mr-1" />
                15%
              </div>
              <div className="text-sm text-muted-foreground">vs previous period</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-2xl">3.5%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-sm font-medium text-emerald-500 flex items-center mr-2">
                <ArrowUp className="h-4 w-4 mr-1" />
                0.8%
              </div>
              <div className="text-sm text-muted-foreground">vs previous period</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attendance Rate</CardDescription>
            <CardTitle className="text-2xl">92.5%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-sm font-medium text-emerald-500 flex items-center mr-2">
                <ArrowUp className="h-4 w-4 mr-1" />
                2.1%
              </div>
              <div className="text-sm text-muted-foreground">vs previous period</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile Analytics</TabsTrigger>
          <TabsTrigger value="bookings">Booking Analytics</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profile Views Trend</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    views: {
                      label: "Profile Views",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profileViewsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="var(--color-views)"
                        fillOpacity={1}
                        fill="url(#colorViews)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bookings Trend</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    bookings: {
                      label: "Bookings",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="var(--color-bookings)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

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
                <ChartContainer
                  config={{
                    rate: {
                      label: "Conversion Rate (%)",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionRateData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} />
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
                <CardDescription>
                  Visualization of your customer journey from profile views to completed bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8">
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">Profile Views</p>
                    <p className="text-2xl font-bold">2,487</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Service Page Clicks</p>
                    <p className="text-2xl font-bold">1,245</p>
                    <p className="text-xs text-muted-foreground">50.1% of views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Added to Cart</p>
                    <p className="text-2xl font-bold">430</p>
                    <p className="text-xs text-muted-foreground">34.5% of clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Completed Booking</p>
                    <p className="text-2xl font-bold">87</p>
                    <p className="text-xs text-muted-foreground">20.2% of cart adds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Traffic Sources</CardTitle>
                <CardDescription>Where your profile visitors are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Direct", value: 45 },
                          { name: "Search", value: 30 },
                          { name: "Referral", value: 15 },
                          { name: "Social", value: 10 },
                        ]}
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

            <Card>
              <CardHeader>
                <CardTitle>Profile Engagement</CardTitle>
                <CardDescription>How visitors interact with your profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Average Time on Profile</p>
                      <p className="text-sm font-medium">3:24 minutes</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "68%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Service Page Clicks</p>
                      <p className="text-sm font-medium">50.1%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "50.1%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Contact Button Clicks</p>
                      <p className="text-sm font-medium">12.3%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "12.3%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Gallery Views</p>
                      <p className="text-sm font-medium">35.7%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "35.7%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Reviews Section Views</p>
                      <p className="text-sm font-medium">42.9%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "42.9%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Visitor Demographics</CardTitle>
                <CardDescription>Age and location breakdown of your profile visitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Age Distribution</h3>
                    <ChartContainer
                      config={{
                        visitors: {
                          label: "Visitors",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-[250px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { age: "18-24", visitors: 15 },
                            { age: "25-34", visitors: 35 },
                            { age: "35-44", visitors: 25 },
                            { age: "45-54", visitors: 15 },
                            { age: "55+", visitors: 10 },
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="age" />
                          <YAxis />
                          <CartesianGrid strokeDasharray="3 3" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="visitors" fill="var(--color-visitors)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-4">Top Locations</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm">New York, NY</p>
                          <p className="text-sm font-medium">32%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: "32%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm">Los Angeles, CA</p>
                          <p className="text-sm font-medium">18%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: "18%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm">Chicago, IL</p>
                          <p className="text-sm font-medium">12%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: "12%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm">San Francisco, CA</p>
                          <p className="text-sm font-medium">10%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: "10%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm">Other</p>
                          <p className="text-sm font-medium">28%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: "28%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Distribution by Service</CardTitle>
                <CardDescription>Which of your services are most popular</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
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

            <Card>
              <CardHeader>
                <CardTitle>Booking Patterns</CardTitle>
                <CardDescription>When clients are most likely to book</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Popular Booking Days</h3>
                    <ChartContainer
                      config={{
                        bookings: {
                          label: "Bookings",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[120px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { day: "Mon", bookings: 12 },
                            { day: "Tue", bookings: 15 },
                            { day: "Wed", bookings: 18 },
                            { day: "Thu", bookings: 14 },
                            { day: "Fri", bookings: 20 },
                            { day: "Sat", bookings: 25 },
                            { day: "Sun", bookings: 16 },
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="day" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="bookings" fill="var(--color-bookings)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Popular Booking Times</h3>
                    <ChartContainer
                      config={{
                        bookings: {
                          label: "Bookings",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-[120px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { time: "6-9 AM", bookings: 8 },
                            { time: "9-12 PM", bookings: 22 },
                            { time: "12-3 PM", bookings: 15 },
                            { time: "3-6 PM", bookings: 18 },
                            { time: "6-9 PM", bookings: 24 },
                            { time: "9-12 AM", bookings: 5 },
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="time" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="bookings" fill="var(--color-bookings)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Lead Time</CardTitle>
                <CardDescription>How far in advance clients book your services</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    bookings: {
                      label: "Bookings",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { time: "Same day", bookings: 12 },
                        { time: "1-2 days", bookings: 18 },
                        { time: "3-7 days", bookings: 25 },
                        { time: "1-2 weeks", bookings: 20 },
                        { time: "2-4 weeks", bookings: 10 },
                        { time: "1+ month", bookings: 2 },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="time" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="var(--color-bookings)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cancellation Analysis</CardTitle>
                <CardDescription>Reasons for booking cancellations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Schedule Conflict</p>
                      <p className="text-sm font-medium">42%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "42%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Personal Emergency</p>
                      <p className="text-sm font-medium">23%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "23%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Changed Mind</p>
                      <p className="text-sm font-medium">15%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "15%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Found Alternative</p>
                      <p className="text-sm font-medium">12%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "12%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Other</p>
                      <p className="text-sm font-medium">8%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "8%" }}></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Cancellation Rate</h4>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">7.5%</div>
                    <div className="ml-2 text-sm font-medium text-emerald-500 flex items-center">
                      <ArrowDown className="h-4 w-4 mr-1" />
                      2.1%
                    </div>
                    <div className="ml-1 text-sm text-muted-foreground">vs previous period</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate by Service</CardTitle>
                <CardDescription>Which services convert best from views to bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    rate: {
                      label: "Conversion Rate (%)",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Meditation Sessions", rate: 4.2 },
                        { name: "Yoga Classes", rate: 3.8 },
                        { name: "Life Coaching", rate: 5.1 },
                        { name: "Wellness Workshops", rate: 2.9 },
                        { name: "Other Services", rate: 1.8 },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="rate" fill="var(--color-rate)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Abandoned Cart Analysis</CardTitle>
                <CardDescription>Where clients drop off in the booking process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">At Payment Information</p>
                      <p className="text-sm font-medium">45%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">At Time Selection</p>
                      <p className="text-sm font-medium">28%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "28%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">At Personal Information</p>
                      <p className="text-sm font-medium">15%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "15%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">At Confirmation</p>
                      <p className="text-sm font-medium">12%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "12%" }}></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Abandoned Cart Rate</h4>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">33%</div>
                    <div className="ml-2 text-sm font-medium text-emerald-500 flex items-center">
                      <ArrowDown className="h-4 w-4 mr-1" />
                      5%
                    </div>
                    <div className="ml-1 text-sm text-muted-foreground">vs previous period</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Conversion Optimization Opportunities</CardTitle>
                <CardDescription>Areas where you can improve your conversion rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Profile Completion</h3>
                    <div className="flex items-center mb-4">
                      <div className="text-2xl font-bold">85%</div>
                      <div className="ml-2 text-sm font-medium text-amber-500">Complete</div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Adding more testimonials and credentials could increase your conversion rate by up to 15%.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Pricing Strategy</h3>
                    <div className="flex items-center mb-4">
                      <div className="text-2xl font-bold">Medium</div>
                      <div className="ml-2 text-sm font-medium text-amber-500">Effectiveness</div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Consider offering introductory packages or bundles to increase first-time bookings.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Response Time</h3>
                    <div className="flex items-center mb-4">
                      <div className="text-2xl font-bold">4.2 hrs</div>
                      <div className="ml-2 text-sm font-medium text-red-500">Needs Improvement</div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Faster response times (under 1 hour) can increase your booking rate by up to 25%.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Recommendations</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-primary font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Simplify Checkout Process</h4>
                        <p className="text-sm text-muted-foreground">
                          Reduce the number of steps in your booking process to decrease cart abandonment.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-primary font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Add More Availability</h4>
                        <p className="text-sm text-muted-foreground">
                          Clients are most likely to book during evenings and weekends. Consider adding more slots
                          during these times.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-primary font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Implement Cart Recovery</h4>
                        <p className="text-sm text-muted-foreground">
                          Send follow-up emails to clients who abandon their booking to encourage completion.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </PractitionerDashboardPageLayout>
  )
}
