"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, X, Package } from "lucide-react"
import { servicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import type { ServiceReadable } from "@/src/client/types.gen"

interface PackageItem {
  child_service_id: number
  quantity: number
  discount_percentage?: number
  order: number
}

interface PackageCompositionSectionProps {
  service: ServiceReadable
  data: {
    child_service_configs?: PackageItem[]
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function PackageCompositionSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: PackageCompositionSectionProps) {
  const { user } = useAuth()
  const [localData, setLocalData] = useState(data)
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [discount, setDiscount] = useState(0)

  // Fetch practitioner's services that can be included in the package
  const { data: availableServices, isLoading: isLoadingServices } = useQuery(
    servicesListOptions({
      query: {
        practitioner: user?.practitioner_profile?.id,
        page_size: 100,
      }
    })
  )

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const addService = () => {
    if (!selectedServiceId) return

    const currentItems = localData.child_service_configs || []
    const newItem: PackageItem = {
      child_service_id: parseInt(selectedServiceId),
      quantity: quantity,
      discount_percentage: discount || undefined,
      order: currentItems.length
    }

    handleChange('child_service_configs', [...currentItems, newItem])
    
    // Reset form
    setSelectedServiceId("")
    setQuantity(1)
    setDiscount(0)
  }

  const removeService = (index: number) => {
    const currentItems = localData.child_service_configs || []
    const updatedItems = currentItems.filter((_, i) => i !== index)
    // Reorder remaining items
    updatedItems.forEach((item, i) => {
      item.order = i
    })
    handleChange('child_service_configs', updatedItems)
  }

  const getServiceById = (serviceId: number) => {
    // First check in available services
    const found = availableServices?.results?.find(s => s.id === serviceId)
    if (found) return found
    
    // If not found, check if it's in the service's child relationships
    // This handles the case where the child service might not be in the current page of results
    const childRel = service.child_relationships?.find(rel => rel.child_service?.id === serviceId)
    return childRel?.child_service
  }

  const calculateTotalValue = () => {
    let total = 0
    localData.child_service_configs?.forEach(item => {
      const service = getServiceById(item.child_service_id)
      if (service?.price) {
        const itemTotal = parseFloat(service.price) * item.quantity
        total += itemTotal * (1 - (item.discount_percentage || 0) / 100)
      }
    })
    return total
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Package Contents
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Select the services to include in this package
        </p>
      </div>

      {/* Package Summary */}
      {localData.child_service_configs?.length > 0 && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Package Value:</span>
              <span className="text-lg font-bold">${calculateTotalValue().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Your Package Price:</span>
              <span>${service.price || '0.00'}</span>
            </div>
            {service.price && calculateTotalValue() > parseFloat(service.price) && (
              <div className="flex justify-between items-center text-sm text-green-600">
                <span>Customer Savings:</span>
                <span>${(calculateTotalValue() - parseFloat(service.price)).toFixed(2)} ({((1 - parseFloat(service.price) / calculateTotalValue()) * 100).toFixed(0)}% off)</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Included Services */}
      <div className="space-y-3">
        {(localData.child_service_configs || []).map((item, index) => {
          const includedService = getServiceById(item.child_service_id)
          if (!includedService) return null

          return (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{includedService.name}</span>
                    <Badge variant="outline">x{item.quantity}</Badge>
                    {item.discount_percentage && (
                      <Badge variant="secondary">{item.discount_percentage}% off</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {includedService.duration_minutes} min • ${includedService.price}
                    {item.quantity > 1 && ` × ${item.quantity} = $${(parseFloat(includedService.price) * item.quantity).toFixed(2)}`}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeService(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Add Service Form */}
      <Card className="p-4 border-dashed">
        <div className="space-y-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Select Service</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service to include" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingServices ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading services...
                  </div>
                ) : (
                  <>
                    {(() => {
                      const filteredServices = availableServices?.results
                        ?.filter(svc => 
                          // Exclude packages and bundles from being included
                          svc.service_type_code !== 'package' && 
                          svc.service_type_code !== 'bundle' &&
                          // Exclude current service
                          svc.id !== service.id &&
                          // Don't show services already included
                          !localData.child_service_configs?.some(
                            item => item.child_service_id === svc.id
                          )
                        )
                      
                      if (!filteredServices || filteredServices.length === 0) {
                        return (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No services available to add
                          </div>
                        )
                      }
                      
                      return filteredServices.map((svc) => (
                        <SelectItem key={svc.id} value={String(svc.id)}>
                          <div className="flex items-center justify-between w-full">
                            <span>{svc.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ${svc.price} • {svc.duration_minutes}min
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    })()}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
              />
            </div>

            {/* Discount */}
            <div className="space-y-2">
              <Label>Discount % (optional)</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                placeholder="0"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addService}
            disabled={!selectedServiceId}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service to Package
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !localData.child_service_configs?.length}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}