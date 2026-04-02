"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MoreVertical, Eye, Archive, Copy, Globe, EyeOff, Settings, LayoutDashboard,
  Calendar, Clock, DollarSign, ImageIcon, Star, Users, BookOpen, ShoppingBag, AlertTriangle
} from "lucide-react"
import { getServiceTypeConfig } from "@/lib/service-type-config"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"
import { getServiceDetailUrl } from "@/lib/service-utils"
import { getTypeSpecificMeta, getAttentionState } from "@/lib/service-card-utils"
import type { MetaItem } from "@/lib/service-card-utils"

// Icon mapping for meta pills
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign, Clock, Calendar, Users, Star, BookOpen, ShoppingBag,
}

// Status variants
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  draft: "secondary",
  inactive: "outline",
  archived: "destructive",
}

interface ServiceCardProps {
  service: any
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  onDuplicate?: (id: string) => void
}

export default function ServiceCard({ service, onDelete, onToggleStatus, onDuplicate }: ServiceCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const handleDeleteConfirm = () => {
    onDelete(service.id)
    setDeleteDialogOpen(false)
  }

  const handleStatusConfirm = () => {
    onToggleStatus(service.id)
    setStatusDialogOpen(false)
  }

  const typeConfig = getServiceTypeConfig(service.type)
  const metaItems = getTypeSpecificMeta(service)
  const attention = getAttentionState(service)

  return (
    <Card className="overflow-hidden flex flex-col h-full border border-sage-200/60 bg-white">
      {/* Service image */}
      <div className="relative aspect-video">
        {service.image_url || service.coverImage ? (
          <Image
            src={service.image_url || service.coverImage}
            alt={service.name || "Service"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Type and status badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between">
          <div className="flex items-center gap-1.5">
            {service.is_featured && (
              <span className="bg-terracotta-500 text-cream-50 text-xs tracking-widest uppercase rounded-full px-2.5 py-0.5 font-medium">
                Featured
              </span>
            )}
            <ServiceTypeBadge type={service.type} />
          </div>
          <Badge variant={STATUS_VARIANTS[service.status] || "outline"}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Card content */}
      <CardContent className="flex-grow p-4">
        <Link href={`/dashboard/practitioner/services/${service.id}`} className="block">
          <h3 className="font-serif font-normal text-lg line-clamp-1 mb-1 text-olive-900 hover:text-terracotta-600 transition-colors">{service.name}</h3>
        </Link>

        {/* Category badge */}
        {service.practitioner_category && (
          <div className="mb-2">
            <Badge
              variant="outline"
              className="gap-1.5 text-xs"
              style={{
                borderColor: service.practitioner_category.color || "#9CAF88",
                color: service.practitioner_category.color || "#9CAF88",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: service.practitioner_category.color || "#9CAF88" }}
              />
              {service.practitioner_category.name}
            </Badge>
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>

        {/* Attention banner */}
        {attention && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs ${
              attention.severity === "error"
                ? "bg-terracotta-50 text-terracotta-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{attention.message}</span>
          </div>
        )}

        {/* Type-specific meta pills */}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {metaItems.map((item: MetaItem) => {
            const IconComponent = ICON_MAP[item.icon]
            return (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 bg-white border border-sage-200/60 rounded-full px-3 py-1.5 text-xs font-light text-olive-600"
              >
                {IconComponent && <IconComponent className="h-3 w-3" />}
                <span>{item.value}</span>
              </span>
            )
          })}
        </div>

        {/* Rating display */}
        {service.average_rating && parseFloat(service.average_rating) > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-olive-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{parseFloat(service.average_rating).toFixed(1)}</span>
            {service.total_reviews > 0 && (
              <span className="text-muted-foreground">({service.total_reviews} review{service.total_reviews !== 1 ? "s" : ""})</span>
            )}
          </div>
        )}
      </CardContent>

      {/* Action buttons */}
      <CardFooter className="p-4 pt-0 flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild title="Manage">
            <Link href={`/dashboard/practitioner/services/${service.id}`}>
              <LayoutDashboard className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild title="Settings" className="hidden sm:inline-flex">
            <Link href={`/dashboard/practitioner/services/${service.id}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild title="View public page" className="hidden sm:inline-flex">
            <Link href={getServiceDetailUrl(service)} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusDialogOpen(true)}>
              {service.status === "active" ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  <span>Unpublish</span>
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>Publish</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/practitioner/services/${service.id}`}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Manage</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/practitioner/services/${service.id}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(service.id)}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Duplicate</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" />
              <span>Archive</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      {/* Archive confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Service?</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &quot;{service.name}&quot;? Archived services are hidden from clients but can be restored later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status change confirmation dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{service.status === "active" ? "Unpublish Service?" : "Publish Service?"}</DialogTitle>
            <DialogDescription>
              {service.status === "active"
                ? "This service will no longer be visible to clients and will return to draft status. Are you sure you want to unpublish it?"
                : "This service will become active and visible to clients. Are you sure you want to publish it?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusConfirm}>{service.status === "active" ? "Unpublish" : "Publish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
