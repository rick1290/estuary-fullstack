"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import RoleSwitcherBanner from "@/components/shared/role-switcher-banner"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't show navbar/footer in practitioner dashboard or checkout
  const isInPractitionerDashboard = pathname.startsWith("/dashboard/practitioner")
  const isInCheckout = pathname.startsWith("/checkout")

  return (
    <div className="flex min-h-screen flex-col">
      <RoleSwitcherBanner />
      {!isInPractitionerDashboard && !isInCheckout && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isInPractitionerDashboard && !isInCheckout && <Footer />}
    </div>
  )
}
