"use client"

import type { ReactNode } from "react"

interface PractitionerDashboardPageLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  fullWidth?: boolean
}

export default function PractitionerDashboardPageLayout({ 
  children, 
  title, 
  description,
  fullWidth = false 
}: PractitionerDashboardPageLayoutProps) {
  return (
    <div className={fullWidth ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
      {title && (
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-olive-900">{title}</h1>
          {description && (
            <p className="mt-2 text-olive-600">{description}</p>
          )}
        </div>
      )}
      <div className="w-full">{children}</div>
    </div>
  )
}