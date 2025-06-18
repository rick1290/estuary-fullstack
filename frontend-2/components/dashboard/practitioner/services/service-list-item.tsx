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
import { MoreVertical, Edit, Eye, Trash2, Copy, Globe, EyeOff, Calendar, Clock, DollarSign, Users } from "lucide-react"
import { getServiceTypeConfig } from "@/lib/service-type-config"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"
import type { Service } from "@/types/service"

// Status variants
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  draft: "outline",
  inactive: "secondary",
  archived: "destructive",
}

interface ServiceListItemProps {
  service: Service
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
}

export default function ServiceListItem({ service, onDelete, onToggleStatus }: ServiceListItemProps) {
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    onDelete(service.id)
    setDeleteDialogOpen(false)
  }

  // Handle status toggle confirmation
  const handleStatusConfirm = () => {
    onToggleStatus(service.id)
    setStatusDialogOpen(false)
  }

  // Get service type config
  const typeConfig = getServiceTypeConfig(service.type)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Service image (only visible on larger screens) */}
          <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0">
            <Image
              src={service.coverImage || "/placeholder.svg?height=200&width=400&query=service"}
              alt={service.name || "Service"}
              fill
              className="object-cover"
            />
          </div>

          {/* Service details */}
          <div className="p-4 flex-grow flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
            <div className="flex-grow space-y-2">
              <div className="flex flex-wrap gap-2 mb-2">
                <ServiceTypeBadge type={service.type} />
                <Badge variant={STATUS_VARIANTS[service.status] || "outline"}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </Badge>
              </div>

              <h3 className="font-semibold text-lg">{service.name}</h3>

              <p className="text-sm text-muted-foreground line-clamp-1 hidden sm:block">{service.description}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>${service.price}</span>
                </div>

                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{service.duration || "60"} min</span>
                </div>

                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    {service.sessions || "1"} session{service.sessions !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>
                    {service.bookings || "0"} booking{service.bookings !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Updated {formatDate(service.updatedAt)}
              </div>

              <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/practitioner/services/edit/${service.id}`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>

              <Button variant="outline" size="icon" asChild>
                <Link href={`/services/${service.id}`} target="_blank">
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
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/practitioner/services/edit/${service.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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
      </CardContent>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{service.name}"? This action cannot be undone.
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
            <DialogTitle>{service.status === "active" ? "Deactivate Service?" : "Activate Service?"}</DialogTitle>
            <DialogDescription>
              {service.status === "active"
                ? "This service will no longer be visible to clients. Are you sure you want to deactivate it?"
                : "This service will be visible to clients. Are you sure you want to activate it?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusConfirm}>{service.status === "active" ? "Deactivate" : "Activate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
