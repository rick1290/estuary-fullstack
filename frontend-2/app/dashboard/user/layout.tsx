import type React from "react"
import UserDashboardNav from "@/components/dashboard/user/user-dashboard-nav"

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <UserDashboardNav />
      <div className="container py-6">{children}</div>
    </>
  )
}
