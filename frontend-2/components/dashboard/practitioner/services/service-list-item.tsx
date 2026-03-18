"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
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
  MoreVertical, Eye, Trash2, Copy, Globe, EyeOff, Settings, LayoutDashboard,
  Calendar, Clock, DollarSign, Users, ImageIcon, Star, BookOpen, ShoppingBag, AlertTriangle
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

// Status variants — matching service-card.tsx
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  draft: "secondary",
  inactive: "outline",
  archived: "destructive",
}

interface ServiceListItemProps {
  service: any
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  onDuplicate?: (id: string) => void
}

export default function ServiceListItem({ service, onDelete, onToggleStatus, onDuplicate }: ServiceListItemProps) {
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
    <Card className="overflow-hidden border border-sage-200/60 bg-white">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Service image */}
          <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0">
            {service.image_url || service.coverImage ? (
              <Image
                src={service.image_url || service.coverImage}
                alt={service.name || "Service"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center min-h-[8rem]">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Service details */}
          <div className="p-4 flex-grow flex flex-col gap-3 w-full">
            {/* Top row: badges and date */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <ServiceTypeBadge type={service.type} />
                <Badge variant={STATUS_VARIANTS[service.status] || "outline"}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </Badge>
                {service.practitioner_category && (
                  <Badge
                    variant="outline"
                    className="gap-1.5"
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
                )}
                {service.is_featured && (
                  <span className="bg-terracotta-500 text-cream-50 text-xs tracking-widest uppercase rounded-full px-2.5 py-0.5 font-medium leading-5">
                    Featured
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                Updated {formatDate(service.updatedAt)}
              </div>
            </div>

            {/* Content row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-grow space-y-2">
                <Link href={`/dashboard/practitioner/services/${service.id}`}>
                  <h3 className="font-serif font-light text-lg text-olive-900 hover:text-terracotta-600 transition-colors">{service.name}</h3>
                </Link>

                <p className="text-sm text-muted-foreground line-clamp-1 hidden sm:block">{service.description}</p>

                {/* Attention indicator (compact) */}
                {attention && (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                      attention.severity === "error"
                        ? "bg-terracotta-50 text-terracotta-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>{attention.message}</span>
                  </div>
                )}

                {/* Type-specific meta pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {metaItems.map((item: MetaItem) => {
                    const IconComponent = ICON_MAP[item.icon]
                    return (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-1 bg-white border border-sage-200/60 rounded-full px-3 py-1 text-xs font-light text-olive-600"
                      >
                        {IconComponent && <IconComponent className="h-3 w-3" />}
                        <span>{item.value}</span>
                      </span>
                    )
                  })}
                  {/* Rating inline */}
                  {service.average_rating && parseFloat(service.average_rating) > 0 && (
                    <span className="inline-flex items-center gap-1 bg-white border border-sage-200/60 rounded-full px-3 py-1 text-xs font-light text-olive-600">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{parseFloat(service.average_rating).toFixed(1)}</span>
                      {service.total_reviews > 0 && (
                        <span className="text-muted-foreground">({service.total_reviews})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
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
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{service.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
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
