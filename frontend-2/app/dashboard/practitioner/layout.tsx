"use client"

import type React from "react"
import PractitionerDashboardLayout from "@/components/dashboard/practitioner-dashboard-layout"
import FeedbackWidget from "@/components/dashboard/feedback-widget"

export default function PractitionerDashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PractitionerDashboardLayout>
      {children}
      <FeedbackWidget />
    </PractitionerDashboardLayout>
  )
}
