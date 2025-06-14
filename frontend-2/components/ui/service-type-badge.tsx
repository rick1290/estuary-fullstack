"use client"

import { Badge } from "@/components/ui/badge"
import { getServiceTypeConfig } from "@/lib/service-type-config"
import { User, ShoppingBag, Calendar, GraduationCap, Package, Circle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Map of icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  User,
  ShoppingBag,
  Calendar,
  GraduationCap,
  Package,
  Circle,
}

interface ServiceTypeBadgeProps {
  type: string
  className?: string
  showIcon?: boolean
  size?: "default" | "sm"
}

export function ServiceTypeBadge({ type, className, showIcon = true, size = "default" }: ServiceTypeBadgeProps) {
  const config = getServiceTypeConfig(type)
  const Icon = iconMap[config.icon] || Circle

  return (
    <Badge
      variant={config.variant as "default" | "secondary" | "outline" | "destructive"}
      className={cn("font-medium", size === "sm" ? "text-xs px-2 py-0" : "px-2.5 py-0.5", className)}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />}
      {config.label}
    </Badge>
  )
}
