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
import { MoreVertical, Edit, Eye, Trash2, Copy, Globe, EyeOff, Calendar, Clock, DollarSign } from "lucide-react"
import { getServiceTypeConfig } from "@/lib/service-type-config"
import { ServiceTypeBadge } from "@/components/ui/service-type-badge"

// Status variants
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  draft: "outline",
  inactive: "secondary",
  archived: "destructive",
}

interface ServiceCardProps {
  service: any
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
}

export default function ServiceCard({ service, onDelete, onToggleStatus }: ServiceCardProps) {
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
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Service image */}
      <div className="relative aspect-video">
        <Image
          src={service.coverImage || "/placeholder.svg?height=200&width=400&query=service"}
          alt={service.name || "Service"}
          fill
          className="object-cover"
        />

        {/* Type and status badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between">
          <ServiceTypeBadge type={service.type} />
          <Badge variant={STATUS_VARIANTS[service.status] || "outline"}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Card content */}
      <CardContent className="flex-grow p-4">
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{service.name}</h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{service.description}</p>

        {/* Service details */}
        <div className="mt-auto space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>${service.price}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{service.duration || "60"} min</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>
                {service.sessions || "1"} session{service.sessions !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Updated {formatDate(service.updatedAt)}</div>
          </div>
        </div>
      </CardContent>

      {/* Action buttons */}
      <CardFooter className="p-4 pt-0 flex justify-between">
        <div className="flex gap-2">
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
      </CardFooter>

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
