import type React from "react"
import UserDashboardNav from "@/components/dashboard/user/user-dashboard-nav"
import DashboardBreadcrumb from "@/components/dashboard/user/dashboard-breadcrumb"

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-cream-100 relative">
      {/* Subtle background texture */}
      <div className="absolute inset-0 texture-grain opacity-20" />
      
      <UserDashboardNav />
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <DashboardBreadcrumb />
        </div>
        <div className="pb-8">
          {children}
        </div>
      </main>
    </div>
  )
}
