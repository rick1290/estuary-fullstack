"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  Search,
  DollarSign,
  Clock,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Info,
  Lightbulb,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square
} from "lucide-react"
import { servicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { ServiceListReadable } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

export interface PackageSessionItem {
  serviceId: number
  service: ServiceListReadable
  order: number
}

interface PackageStepSessionsProps {
  selectedSessions: PackageSessionItem[]
  onSessionsChange: (sessions: PackageSessionItem[]) => void
}

export function PackageStepSessions({
  selectedSessions,
  onSessionsChange
}: PackageStepSessionsProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch practitioner's session-type services only
  const practitionerId = user?.practitionerId
  const { data: servicesData, isLoading } = useQuery({
    ...servicesListOptions({
      query: {
        practitioner: practitionerId || undefined,
        page_size: 100,
        service_type: "session"
      }
    }),
    enabled: !!practitionerId
  })

  const services = servicesData?.results || []
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate totals for summary
  const totals = useMemo(() => {
    const totalPrice = selectedSessions.reduce((sum, item) => {
      return sum + parseFloat(item.service?.price || "0")
    }, 0)
    const totalDuration = selectedSessions.reduce((sum, item) => {
      return sum + (item.service?.duration_minutes || 0)
    }, 0)
    return { totalPrice, totalDuration }
  }, [selectedSessions])

  // Toggle session selection
  const toggleSession = (service: ServiceListReadable) => {
    if (!service.id) return

    const existingIndex = selectedSessions.findIndex(s => s.serviceId === service.id)

    if (existingIndex >= 0) {
      // Remove session - create new array with updated order (no mutation)
      const updated = selectedSessions
        .filter(s => s.serviceId !== service.id)
        .map((s, i) => ({ ...s, order: i }))
      onSessionsChange(updated)
    } else {
      // Add session
      const newSession: PackageSessionItem = {
        serviceId: service.id,
        service: service,
        order: selectedSessions.length
      }
      onSessionsChange([...selectedSessions, newSession])
    }
  }

  // Move session up or down
  const moveSession = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= selectedSessions.length) return

    const updated = [...selectedSessions]
    const [movedSession] = updated.splice(index, 1)
    updated.splice(newIndex, 0, movedSession)

    // Update order - create new objects to avoid mutation
    const reordered = updated.map((session, i) => ({ ...session, order: i }))
    onSessionsChange(reordered)
  }

  // Check if a service is selected
  const isSelected = (serviceId: number | undefined) => {
    if (!serviceId) return false
    return selectedSessions.some(s => s.serviceId === serviceId)
  }

  // Get position of selected session
  const getSelectedPosition = (serviceId: number | undefined) => {
    if (!serviceId) return -1
    const index = selectedSessions.findIndex(s => s.serviceId === serviceId)
    return index >= 0 ? index + 1 : -1
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Select Sessions for Your Package
        </h2>
        <p className="text-muted-foreground">
          Choose which sessions to include. Click to select multiple sessions, then reorder them below.
        </p>
      </div>

      {/* Tip Alert */}
      <Alert className="border-primary/30 bg-primary/5">
        <Lightbulb className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Pro tip:</strong> Put your intro or discovery session first to give clients a natural starting point.
          Order the remaining sessions to create a logical progression for your clients' journey.
        </AlertDescription>
      </Alert>

      {/* No Services Warning */}
      {services.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need to create at least one session-type service before you can create a package.
            Packages combine multiple session services into a single offering.
          </AlertDescription>
        </Alert>
      )}

      {/* Package Summary - Always visible at top */}
      <Card className={cn(
        "transition-all",
        selectedSessions.length > 0 ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-dashed"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Sessions Selected</p>
                <p className="text-2xl font-semibold">{selectedSessions.length}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-2xl font-semibold">${totals.totalPrice.toFixed(2)}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Total Duration</p>
                <p className="text-2xl font-semibold">{totals.totalDuration}m</p>
              </div>
            </div>
            {selectedSessions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Set discount in next step
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Available Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Available Sessions
            </h3>
            <Badge variant="outline">{services.length} total</Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sessions List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => {
                const selected = isSelected(service.id)
                const position = getSelectedPosition(service.id)

                return (
                  <div
                    key={service.id}
                    onClick={() => toggleSession(service)}
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {/* Selection indicator */}
                    {selected ? (
                      <CheckSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    )}

                    {/* Service Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">{service.name}</h4>
                        {selected && (
                          <Badge className="bg-primary text-primary-foreground shrink-0 text-xs">
                            #{position}
                          </Badge>
                        )}
                      </div>
                      {service.short_description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {service.short_description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          {service.duration_minutes}m
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="mr-1 h-3 w-3" />
                          {service.price}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <Card className="border-dashed">
                <CardContent className="text-center py-6">
                  <p className="text-muted-foreground text-sm">
                    {searchQuery
                      ? "No sessions found matching your search"
                      : "No sessions available. Create some sessions first."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Selected Sessions (Reorderable) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Package Order
            </h3>
            <Badge variant={selectedSessions.length > 0 ? "default" : "outline"}>
              {selectedSessions.length} selected
            </Badge>
          </div>

          {/* Selected Sessions List */}
          {selectedSessions.length > 0 ? (
            <div className="space-y-2">
              {selectedSessions.map((item, index) => (
                <Card key={item.serviceId} className="border-primary/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Order Number & Reorder Controls */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveSession(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {index + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveSession(index, 'down')}
                          disabled={index === selectedSessions.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Session Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.service.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {item.service.duration_minutes}m
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-medium">
                            ${item.service.price}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() => toggleSession(item.service)}
                      >
                        Remove
                      </Button>
                    </div>

                    {/* First Session Tip */}
                    {index === 0 && selectedSessions.length > 1 && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        This will be your clients' first session
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GripVertical className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-medium text-sm mb-1">No Sessions Selected</h3>
                <p className="text-muted-foreground text-xs text-center max-w-[200px]">
                  Click on sessions in the left panel to add them to your package
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
