"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function DashboardBreadcrumb() {
  const pathname = usePathname()
  
  // Don't show breadcrumb on main dashboard page
  if (pathname === '/dashboard/user') return null
  
  const segments = pathname.split('/').filter(Boolean)
  
  const breadcrumbItems = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`
    
    // Format segment for display
    const formatSegment = (seg: string) => {
      // Handle special cases
      if (seg === 'user') return 'Dashboard'
      if (seg === 'practitioner') return 'Practitioner Dashboard'
      
      // Capitalize and replace hyphens with spaces
      return seg
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    
    const isLast = index === segments.length - 1
    const label = formatSegment(segment)
    
    return {
      label,
      path,
      isLast
    }
  })
  
  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <BreadcrumbItem key={item.path}>
            {item.isLast ? (
              <span className="text-olive-900 font-medium">{item.label}</span>
            ) : (
              <>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href={item.path}>{item.label}</Link>
                </BreadcrumbLink>
                {index < breadcrumbItems.length - 1 && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
                  </BreadcrumbSeparator>
                )}
              </>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}