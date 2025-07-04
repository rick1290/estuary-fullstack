"use client"

import { useState } from "react"
import Link from "next/link"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  CalendarDays, 
  Droplets, 
  Waves, 
  Activity,
  Clock,
  Calendar,
  CalendarCheck,
  Users,
  Sparkles,
  MessageSquare,
  DollarSign,
  BarChart3,
  Settings,
  Radio,
  User
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import PractitionerFlowTabs from "@/components/dashboard/practitioner/practitioner-flow-tabs"
import PractitionerRecentRipples from "@/components/dashboard/practitioner/practitioner-recent-ripples"
import PractitionerStats from "@/components/dashboard/practitioner/practitioner-stats"

export default function PractitionerDashboardPage() {
  const { user } = useAuth()
  const firstName = user?.firstName || "Practitioner"

  // App shortcuts for quick navigation
  const appShortcuts = [
    {
      title: "Calendar",
      description: "View your schedule",
      icon: Calendar,
      href: "/dashboard/practitioner/calendar",
      color: "bg-sage-100 hover:bg-sage-200 text-sage-700"
    },
    {
      title: "Bookings",
      description: "Manage bookings",
      icon: CalendarCheck,
      href: "/dashboard/practitioner/bookings",
      color: "bg-terracotta-100 hover:bg-terracotta-200 text-terracotta-700"
    },
    {
      title: "Services",
      description: "Your offerings",
      icon: Sparkles,
      href: "/dashboard/practitioner/services",
      color: "bg-olive-100 hover:bg-olive-200 text-olive-700"
    },
    {
      title: "Availability",
      description: "Set your hours",
      icon: Clock,
      href: "/dashboard/practitioner/availability",
      color: "bg-blush-100 hover:bg-blush-200 text-blush-700"
    },
    {
      title: "Clients",
      description: "Client directory",
      icon: Users,
      href: "/dashboard/practitioner/clients",
      color: "bg-sage-100 hover:bg-sage-200 text-sage-700"
    },
    {
      title: "Messages",
      description: "Client conversations",
      icon: MessageSquare,
      href: "/dashboard/practitioner/messages",
      color: "bg-terracotta-100 hover:bg-terracotta-200 text-terracotta-700"
    },
    {
      title: "Streams",
      description: "Content creation",
      icon: Radio,
      href: "/dashboard/practitioner/streams",
      color: "bg-olive-100 hover:bg-olive-200 text-olive-700"
    },
    {
      title: "Finances",
      description: "Earnings & payouts",
      icon: DollarSign,
      href: "/dashboard/practitioner/finances/overview",
      color: "bg-blush-100 hover:bg-blush-200 text-blush-700"
    }
  ]

  return (
    <PractitionerDashboardPageLayout 
      title="" 
      description=""
    >
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-olive-900 mb-2">
          👋 Welcome back, {firstName}
        </h1>
        <p className="text-lg text-muted-foreground">
          Your practice is flowing beautifully. Here's what's rippling through your waters today.
        </p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column - Flow Tabs */}
        <div className="lg:col-span-7">
          <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-sage-600" />
                <CardTitle>Your Flow</CardTitle>
              </div>
              <CardDescription>Navigate your practice's rhythm</CardDescription>
            </CardHeader>
            <CardContent>
              <PractitionerFlowTabs />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Ripples */}
        <div className="lg:col-span-5">
          <Card className="border-2 border-terracotta-200 hover:border-terracotta-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-terracotta-600" />
                <CardTitle>Recent Ripples</CardTitle>
              </div>
              <CardDescription>New energy entering your practice</CardDescription>
            </CardHeader>
            <CardContent>
              <PractitionerRecentRipples />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-6">
        <Card className="border-2 border-olive-200 hover:border-olive-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-olive-600" />
              <CardTitle>Your Practice Pulse</CardTitle>
            </div>
            <CardDescription>How your energy is flowing this month</CardDescription>
          </CardHeader>
          <CardContent>
            <PractitionerStats />
          </CardContent>
        </Card>
      </div>

      {/* Apps Section - Quick Navigation */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-olive-900 mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {appShortcuts.map((app) => {
            const Icon = app.icon
            return (
              <Link key={app.href} href={app.href}>
                <Card className={`${app.color} border-0 hover:shadow-md transition-all cursor-pointer h-full`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 rounded-lg bg-white/50">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{app.title}</p>
                        <p className="text-xs opacity-80">{app.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </PractitionerDashboardPageLayout>
  )
}