"use client"

import type React from "react"
import PractitionerDashboardLayout from "@/components/dashboard/practitioner-dashboard-layout"

export default function PractitionerDashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <PractitionerDashboardLayout>{children}</PractitionerDashboardLayout>
}
