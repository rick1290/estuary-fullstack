"use client"

import type { ReactNode } from "react"

interface UserDashboardLayoutProps {
  children: ReactNode
  title?: string
  fullWidth?: boolean
}

export default function UserDashboardLayout({ children, title, fullWidth = false }: UserDashboardLayoutProps) {
  return (
    <div className={`mx-auto py-8 ${fullWidth ? "w-full px-4" : "container"}`}>
      {title && <h1 className="mb-8 text-3xl md:text-4xl font-medium tracking-tight">{title}</h1>}
      <div className="w-full">{children}</div>
    </div>
  )
}
