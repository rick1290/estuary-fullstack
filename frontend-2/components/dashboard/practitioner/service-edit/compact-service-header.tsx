"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronLeft,
  Settings,
  Eye,
  MoreVertical,
  Archive,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getServiceDetailUrl } from "@/lib/service-utils"
import type { ServiceDetailReadable as ServiceReadable } from "@/src/client/types.gen"
import type { ReactNode } from "react"

// Status badge variants
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  draft: "secondary",
  inactive: "outline",
  archived: "destructive",
}

interface CompactServiceHeaderProps {
  service?: ServiceReadable | null
  backHref?: string
  backLabel?: string
  title?: string
  actions?: ReactNode
  children?: ReactNode
  isLoading?: boolean
}

export function CompactServiceHeader({
  service,
  backHref = "/dashboard/practitioner/services",
  backLabel = "Services",
  title,
  actions,
  children,
  isLoading,
}: CompactServiceHeaderProps) {
  const router = useRouter()

  const displayTitle = title || service?.name || "Untitled Service"
  const status = service?.status || "draft"
  const typeDisplay = service?.service_type_display || service?.service_type_code || ""

  if (isLoading) {
    return (
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center h-12 px-4 gap-3">
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          <div className="h-5 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="flex items-center h-12 px-4 gap-2">
        {/* Back breadcrumb */}
        <Link
          href={backHref}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>

        {/* Separator */}
        <div className="h-4 w-px bg-border shrink-0" />

        {/* Service name */}
        <h1 className="font-serif text-lg font-light text-olive-900 truncate min-w-0">
          {displayTitle}
        </h1>

        {/* Inline badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant={STATUS_VARIANTS[status] || "outline"}
            className="text-xs px-1.5 py-0 h-5"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          {typeDisplay && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
              {typeDisplay}
            </Badge>
          )}
          {service?.is_featured && (
            <Badge className="bg-blush-100 text-terracotta-800 text-xs px-1.5 py-0 h-5">
              Featured
            </Badge>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right-side actions */}
        {actions ? (
          actions
        ) : service ? (
          <DefaultServiceActions service={service} />
        ) : null}
      </div>

      {/* Optional children below header line (e.g. subtitle, tabs) */}
      {children}
    </div>
  )
}

function DefaultServiceActions({ service }: { service: ServiceReadable }) {
  const router = useRouter()

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* Settings gear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/dashboard/practitioner/services/${service.id}/settings`)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        {/* View public page */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={getServiceDetailUrl(service)} target="_blank">
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Public Page</TooltipContent>
        </Tooltip>

        {/* Overflow menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={getServiceDetailUrl(service)} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              // TODO: wire up duplicate mutation from parent
            }}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}
