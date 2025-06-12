import type { Metadata } from "next"
import PractitionerStats from "@/components/dashboard/practitioner/practitioner-stats"
import PractitionerUpcomingBookings from "@/components/dashboard/practitioner/practitioner-upcoming-bookings"
import PractitionerMessages from "@/components/dashboard/practitioner/practitioner-messages"
import PractitionerEarnings from "@/components/dashboard/practitioner/practitioner-earnings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Users, MessageSquare, DollarSign } from "lucide-react"

export const metadata: Metadata = {
  title: "Dashboard | Practitioner Portal",
  description: "Manage your practice, bookings, clients, and earnings in one place.",
}

export default function PractitionerDashboardPage() {
  return (
    <div className="flex-1 space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Last updated: Just now</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-auto bg-gray-100 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Earnings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PractitionerStats />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-1 md:col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Upcoming Bookings
                </CardTitle>
                <CardDescription>Your scheduled sessions for the coming days</CardDescription>
              </CardHeader>
              <CardContent>
                <PractitionerUpcomingBookings />
              </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Recent Messages
                </CardTitle>
                <CardDescription>Stay connected with your clients</CardDescription>
              </CardHeader>
              <CardContent>
                <PractitionerMessages />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Earnings Overview
              </CardTitle>
              <CardDescription>Track your revenue and financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <PractitionerEarnings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>View and manage your client relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visit the{" "}
                <a href="/dashboard/practitioner/clients" className="text-primary underline">
                  Clients page
                </a>{" "}
                for detailed client management.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communicate with your clients</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visit the{" "}
                <a href="/dashboard/practitioner/messages" className="text-primary underline">
                  Messages page
                </a>{" "}
                for full messaging functionality.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle>Financial Management</CardTitle>
              <CardDescription>Track your earnings and manage your finances</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visit the{" "}
                <a href="/dashboard/practitioner/finances/overview" className="text-primary underline">
                  Finances page
                </a>{" "}
                for detailed financial management.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
