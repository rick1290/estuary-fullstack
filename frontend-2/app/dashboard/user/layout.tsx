import type React from "react"
import UserDashboardNav from "@/components/dashboard/user/user-dashboard-nav"
import FeedbackWidget from "@/components/dashboard/feedback-widget"

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cream-50">
      <UserDashboardNav />
      <main className="pt-4 pb-4 sm:pt-8 sm:pb-8">
        {children}
      </main>
      <FeedbackWidget />
    </div>
  )
}
