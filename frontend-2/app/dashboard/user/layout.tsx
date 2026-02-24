import type React from "react"
import UserDashboardNav from "@/components/dashboard/user/user-dashboard-nav"

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cream-50">
      <UserDashboardNav />
      <main className="pt-8 pb-8">
        {children}
      </main>
    </div>
  )
}
