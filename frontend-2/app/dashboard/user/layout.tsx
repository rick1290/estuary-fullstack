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
      <div className="container py-8 relative z-10">
        <DashboardBreadcrumb />
        {children}
      </div>
    </div>
  )
}
