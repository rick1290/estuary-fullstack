"use client"

import type { ReactNode } from "react"

interface UserDashboardLayoutProps {
  children: ReactNode
  title?: string
  fullWidth?: boolean
}

export default function UserDashboardLayout({ children, title, fullWidth = false }: UserDashboardLayoutProps) {
  if (fullWidth) {
    return (
      <div className="w-full">
        {title && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-olive-900">{title}</h1>
          </div>
        )}
        <div className="w-full">{children}</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {title && (
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-olive-900">{title}</h1>
        </div>
      )}
      <div className="w-full">{children}</div>
    </div>
  )
}
