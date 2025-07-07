"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import RoleSwitcherBanner from "@/components/shared/role-switcher-banner"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't show navbar/footer in practitioner dashboard, checkout, or room pages
  const isInPractitionerDashboard = pathname.startsWith("/dashboard/practitioner")
  const isInCheckout = pathname.startsWith("/checkout")
  const isInRoom = pathname.startsWith("/room")

  const shouldHideNavAndFooter = isInPractitionerDashboard || isInCheckout || isInRoom
  const shouldHideRoleSwitcher = isInRoom // Hide role switcher in room for immersive experience

  return (
    <div className="flex min-h-screen flex-col">
      {!shouldHideRoleSwitcher && <RoleSwitcherBanner />}
      {!shouldHideNavAndFooter && <Navbar />}
      <main className="flex-1">{children}</main>
      {!shouldHideNavAndFooter && <Footer />}
    </div>
  )
}
