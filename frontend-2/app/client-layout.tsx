"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't show navbar/footer in practitioner dashboard, checkout, room, or landing pages
  const isInPractitionerDashboard = pathname.startsWith("/dashboard/practitioner")
  const isInCheckout = pathname.startsWith("/checkout")
  const isInRoom = pathname.startsWith("/room")
  const isInOnboarding = pathname.startsWith("/become-practitioner/onboarding")
  const isLandingPage = pathname.startsWith("/for")

  const shouldHideNavAndFooter = isInPractitionerDashboard || isInCheckout || isInRoom || isInOnboarding || isLandingPage

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      {!shouldHideNavAndFooter && <Navbar />}
      <main className="flex-1">{children}</main>
      {!shouldHideNavAndFooter && <Footer />}
    </div>
  )
}
