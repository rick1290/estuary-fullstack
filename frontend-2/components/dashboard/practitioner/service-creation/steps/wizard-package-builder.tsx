"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  Plus,
  Trash2,
  Search,
  DollarSign,
  Clock,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Check,
  Info
} from "lucide-react"
import { servicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { ServiceListReadable } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

export interface PackageServiceItem {
  serviceId: number
  service?: ServiceListReadable
  quantity: number
  discountPercentage: number
  order: number
}

interface PackageConfig {
  selectedServices: PackageServiceItem[]
  totalValue: number
}

interface WizardPackageBuilderProps {
  config: PackageConfig
  onConfigChange: (config: PackageConfig) => void
  currentPrice?: string
  onPriceChange?: (price: string) => void
  onNameSuggestion?: (name: string) => void
}

export function WizardPackageBuilder({
  config,
  onConfigChange,
  currentPrice,
  onPriceChange,
  onNameSuggestion
}: WizardPackageBuilderProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("available")

  // Fetch practitioner's session-type services only (bundles and packages can only contain sessions)
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

  // Calculate package pricing
  const pricing = useMemo(() => {
    let originalTotal = 0
    let discountedTotal = 0

    config.selectedServices.forEach(selected => {
      const price = parseFloat(selected.service?.price || "0")
      const quantity = selected.quantity
      const discount = selected.discountPercentage / 100

      const itemTotal = price * quantity
      originalTotal += itemTotal
      discountedTotal += itemTotal * (1 - discount)
    })

    const packagePrice = parseFloat(currentPrice || "0")
    const savingsAmount = discountedTotal > 0 ? discountedTotal - packagePrice : 0
    const savingsPercentage = discountedTotal > 0
      ? ((savingsAmount / discountedTotal) * 100)
      : 0

    return {
      originalTotal,
      discountedTotal,
      packagePrice,
      savingsAmount,
      savingsPercentage,
      totalSessions: config.selectedServices.reduce((sum, s) => sum + s.quantity, 0)
    }
  }, [config.selectedServices, currentPrice])

  // Update total value when services change
  useEffect(() => {
    onConfigChange({
      ...config,
      totalValue: pricing.discountedTotal
    })

    // Auto-suggest a price if not set
    if (!currentPrice && pricing.discountedTotal > 0 && onPriceChange) {
      // Suggest 10% off the discounted total
      const suggestedPrice = pricing.discountedTotal * 0.9
      onPriceChange(suggestedPrice.toFixed(2))
    }
  }, [pricing.discountedTotal])

  // Generate name suggestion
  useEffect(() => {
    if (config.selectedServices.length > 0 && onNameSuggestion) {
      if (config.selectedServices.length === 1) {
        const service = config.selectedServices[0].service
        onNameSuggestion(`${service?.name} Package`)
      } else {
        onNameSuggestion(`${config.selectedServices.length}-Service Wellness Package`)
      }
    }
  }, [config.selectedServices.length, onNameSuggestion])

  const addService = (service: ServiceListReadable) => {
    if (!service.id || config.selectedServices.find(s => s.serviceId === service.id)) {
      return // Already added or no ID
    }

    const newService: PackageServiceItem = {
      serviceId: service.id,
      service: service,
      quantity: 1,
      discountPercentage: 0,
      order: config.selectedServices.length
    }

    onConfigChange({
      ...config,
      selectedServices: [...config.selectedServices, newService]
    })

    // Switch to selected tab after adding
    setActiveTab("selected")
  }

  const updateService = (index: number, updates: Partial<PackageServiceItem>) => {
    const updated = [...config.selectedServices]
    updated[index] = { ...updated[index], ...updates }
    onConfigChange({
      ...config,
      selectedServices: updated
    })
  }

  const removeService = (index: number) => {
    const updated = config.selectedServices.filter((_, i) => i !== index)
    // Reorder
    updated.forEach((service, i) => {
      service.order = i
    })
    onConfigChange({
      ...config,
      selectedServices: updated
    })
  }

  const moveService = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= config.selectedServices.length) return

    const updated = [...config.selectedServices]
    const [movedService] = updated.splice(index, 1)
    updated.splice(newIndex, 0, movedService)

    // Update order
    updated.forEach((service, i) => {
      service.order = i
    })
    onConfigChange({
      ...config,
      selectedServices: updated
    })
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
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Build Your Package
        </h2>
        <p className="text-muted-foreground">
          Select session services to include in your package. You can set quantities and optional discounts for each.
        </p>
      </div>

      {/* No Services Warning */}
      {services.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need to create at least one session-type service before you can create a package.
            Packages combine multiple session services into a single offering at a discounted rate.
          </AlertDescription>
        </Alert>
      )}

      {/* Package Summary */}
      <Card className={cn(
        "border-2 transition-colors",
        config.selectedServices.length > 0 ? "border-primary/50" : "border-border"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Package Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config.selectedServices.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Services</p>
                  <p className="text-2xl font-semibold">{config.selectedServices.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-semibold">{pricing.totalSessions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-semibold">${pricing.discountedTotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Package Price</p>
                  <div className="flex items-center gap-1">
                    <span className="text-lg text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentPrice || ""}
                      onChange={(e) => onPriceChange?.(e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-9 text-lg font-semibold"
                    />
                  </div>
                </div>
              </div>

              {pricing.savingsAmount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Customers save ${pricing.savingsAmount.toFixed(2)} ({pricing.savingsPercentage.toFixed(0)}%)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No services added yet. Add services from the "Available Services" tab.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Services Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">
            Available Services ({services.length})
          </TabsTrigger>
          <TabsTrigger value="selected">
            In Package ({config.selectedServices.length})
          </TabsTrigger>
        </TabsList>

        {/* Available Services Tab */}
        <TabsContent value="available" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredServices.map((service) => {
                const isSelected = config.selectedServices.find(s => s.serviceId === service.id)
                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "relative transition-all cursor-pointer hover:shadow-md",
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    )}
                    onClick={() => !isSelected && addService(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{service.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {service.short_description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {service.service_type_display}
                            </Badge>
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
                        {isSelected ? (
                          <Badge className="bg-primary shrink-0">
                            <Check className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" className="shrink-0">
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No services found matching your search"
                    : "No services available. Create some services first."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Selected Services Tab */}
        <TabsContent value="selected" className="space-y-4">
          {config.selectedServices.length > 0 ? (
            <div className="space-y-3">
              {config.selectedServices.map((selected, index) => (
                <Card key={selected.serviceId}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveService(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveService(index, 'down')}
                          disabled={index === config.selectedServices.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Service Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium">{selected.service?.name}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {selected.service?.service_type_display}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                ${selected.service?.price}/ea
                              </Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeService(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={selected.quantity}
                              onChange={(e) => updateService(index, {
                                quantity: Math.max(1, parseInt(e.target.value) || 1)
                              })}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Discount: {selected.discountPercentage}%
                            </Label>
                            <Slider
                              min={0}
                              max={50}
                              step={5}
                              value={[selected.discountPercentage]}
                              onValueChange={(value) => updateService(index, {
                                discountPercentage: value[0]
                              })}
                              className="mt-2"
                            />
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t text-sm">
                          <span className="text-muted-foreground">Item total:</span>
                          <div className="text-right">
                            <span className="font-medium">
                              ${(selected.quantity * parseFloat(selected.service?.price || "0") * (1 - selected.discountPercentage / 100)).toFixed(2)}
                            </span>
                            {selected.discountPercentage > 0 && (
                              <span className="text-xs text-muted-foreground ml-2 line-through">
                                ${(selected.quantity * parseFloat(selected.service?.price || "0")).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Services Selected</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Switch to "Available Services" to add services to your package
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("available")}
                >
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Package Building Tips:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Combine complementary session services for a complete experience</li>
            <li>• Offer 10-20% overall savings to incentivize package purchases</li>
            <li>• Order sessions logically (e.g., intro session first, then deeper work)</li>
            <li>• Consider themed packages like "New Client Special" or "Wellness Journey"</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
