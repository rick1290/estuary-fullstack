"use client"

import Link from "next/link"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Clock,
  Calendar,
  CalendarCheck,
  Users,
  MessageSquare,
  DollarSign,
  Radio,
  User,
  CreditCard,
  ArrowRight
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useStripeConnectStatus } from "@/hooks/use-stripe-connect-status"
import PractitionerFlowTabs from "@/components/dashboard/practitioner/practitioner-flow-tabs"
import PractitionerRecentRipples from "@/components/dashboard/practitioner/practitioner-recent-ripples"
import PractitionerStats from "@/components/dashboard/practitioner/practitioner-stats"
import SetupChecklist from "@/components/dashboard/practitioner/setup-checklist"

export default function PractitionerDashboardPage() {
  const { user } = useAuth()
  const firstName = user?.firstName || "Practitioner"
  const { showWarning, needsSetup, noAccount, hasRequirements, isLoading: stripeLoading } = useStripeConnectStatus()

  // App shortcuts for quick navigation
  const appShortcuts = [
    {
      title: "Schedule",
      description: "View your schedule",
      icon: Calendar,
      href: "/dashboard/practitioner/schedule",
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
      icon: CalendarDays,
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
        <h1 className="font-serif text-3xl font-light text-olive-900 mb-2">
          Welcome back, <em className="italic text-terracotta-600">{firstName}</em>
        </h1>
        <p className="text-base font-light text-olive-600">
          Your practice is flowing beautifully. Here's what's rippling through your waters today.
        </p>
      </div>

      {/* Pulse Bar */}
      <div className="mb-6">
        <PractitionerStats />
      </div>

      {/* Setup Checklist */}
      <SetupChecklist />

      {/* Stripe Connect Warning */}
      {!stripeLoading && showWarning && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">
                  {noAccount ? "Connect Your Payment Account" : "Complete Your Payment Setup"}
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  {noAccount
                    ? "Connect your Stripe account to start receiving payments from clients."
                    : hasRequirements
                    ? "Stripe needs additional information to enable payments. Please complete your account setup."
                    : "Your Stripe account is connected but payments are not yet enabled. Please complete the setup."
                  }
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-700"
                >
                  <Link href="/dashboard/practitioner/settings?tab=payment">
                    {noAccount ? "Connect Stripe" : "Complete Setup"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column - Flow Tabs */}
        <div className="lg:col-span-7">
          <Card className="border border-sage-200/60 bg-white h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium tracking-widest uppercase text-sage-600">Schedule</span>
                  <CardTitle className="font-serif text-xl font-light text-olive-900">Your <em className="italic text-terracotta-600">Flow</em></CardTitle>
                  <CardDescription className="text-sm font-light text-olive-600">Navigate your practice's rhythm</CardDescription>
                </div>
                <Link href="/dashboard/practitioner/schedule" className="text-xs font-normal text-olive-500 border-b border-sage-200/60 pb-px hover:text-terracotta-600 hover:border-terracotta-400 transition-colors whitespace-nowrap">
                  Full schedule &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <PractitionerFlowTabs />
            </CardContent>
            <div className="px-6 py-3 border-t border-sage-200/40 bg-cream-50/50">
              <Link href="/dashboard/practitioner/availability" className="text-xs font-light text-olive-500 hover:text-terracotta-600 transition-colors">
                + Add availability block
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column - Recent Ripples */}
        <div className="lg:col-span-5">
          <Card className="border border-sage-200/60 bg-white h-full flex flex-col">
            <CardHeader className="pb-4">
              <span className="text-xs font-medium tracking-widest uppercase text-sage-600">New Energy</span>
              <CardTitle className="font-serif text-xl font-light text-olive-900">Recent <em className="italic text-terracotta-600">Ripples</em></CardTitle>
              <CardDescription className="text-sm font-light text-olive-600">Who just booked or subscribed?</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <PractitionerRecentRipples />
            </CardContent>
            <div className="px-6 py-3 border-t border-sage-200/40 bg-cream-50/50">
              <Link href="/dashboard/practitioner/bookings" className="text-xs font-light text-olive-500 hover:text-terracotta-600 transition-colors">
                View all activity &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Apps Section - Quick Navigation */}
      <div className="mt-8">
        <span className="text-xs font-medium tracking-widest uppercase text-olive-500 mb-4 block">Quick Navigation</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {appShortcuts.map((app) => {
            const Icon = app.icon
            return (
              <Link key={app.href} href={app.href}>
                <Card className="border border-sage-200/60 bg-white hover:bg-sage-50 hover:border-sage-300/60 transition-colors cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-olive-700" />
                      </div>
                      <div>
                        <p className="font-medium text-xs text-olive-900">{app.title}</p>
                        <p className="text-[10px] font-light text-olive-500">{app.description}</p>
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