"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Package2, Info } from "lucide-react"
import { servicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import type { ServiceReadable } from "@/src/client/types.gen"

interface BundleConfigurationSectionProps {
  service: ServiceReadable
  data: {
    sessions_included?: number
    child_service_configs?: Array<{
      child_service_id: number
      quantity: number
    }>
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function BundleConfigurationSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: BundleConfigurationSectionProps) {
  const { user } = useAuth()
  const [localData, setLocalData] = useState(data)

  // Fetch practitioner's session services
  const { data: availableServices } = useQuery(
    servicesListOptions({
      query: {
        practitioner: user?.practitioner_profile?.id,
        service_type: 'session',
        page_size: 100
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

  const handleServiceSelection = (serviceId: string) => {
    const config = [{
      child_service_id: parseInt(serviceId),
      quantity: 1
    }]
    handleChange('child_service_configs', config)
  }

  const selectedService = localData.child_service_configs?.[0]
  const selectedServiceDetails = availableServices?.results?.find(
    s => s.id === selectedService?.child_service_id
  )

  const calculatePricePerSession = () => {
    if (!service.price || !localData.sessions_included) return 0
    return parseFloat(service.price) / localData.sessions_included
  }

  const calculateSavings = () => {
    if (!selectedServiceDetails?.price || !localData.sessions_included) return 0
    const regularTotal = parseFloat(selectedServiceDetails.price) * localData.sessions_included
    const bundlePrice = parseFloat(service.price || '0')
    return regularTotal - bundlePrice
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Label className="flex items-center gap-2">
          <Package2 className="h-4 w-4" />
          Bundle Configuration
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which session service this bundle includes
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A bundle allows customers to pre-purchase multiple sessions of the same service at a discounted rate.
          For example: "10-Class Yoga Pass" or "5-Session Massage Package"
        </AlertDescription>
      </Alert>

      {/* Session Service Selection */}
      <div className="space-y-2">
        <Label>Session Service</Label>
        <Select 
          value={selectedService?.child_service_id?.toString() || ""} 
          onValueChange={handleServiceSelection}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select the session service for this bundle" />
          </SelectTrigger>
          <SelectContent>
            {availableServices?.results?.map((service) => (
              <SelectItem key={service.id} value={String(service.id)}>
                <div className="flex flex-col">
                  <span>{service.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${service.price} per session • {service.duration_minutes} min
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Number of Sessions */}
      <div className="space-y-2">
        <Label>Number of Sessions Included</Label>
        <Input
          type="number"
          value={localData.sessions_included || ''}
          onChange={(e) => handleChange('sessions_included', parseInt(e.target.value) || undefined)}
          min={2}
          max={100}
          placeholder="e.g., 10 for a 10-class pass"
        />
        <p className="text-sm text-muted-foreground">
          How many sessions can the customer book with this bundle?
        </p>
      </div>

      {/* Pricing Summary */}
      {selectedServiceDetails && localData.sessions_included && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-3">
            <h4 className="font-medium">Bundle Summary</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Selected Service:</span>
                <span className="font-medium">{selectedServiceDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Regular Price per Session:</span>
                <span>${selectedServiceDetails.price}</span>
              </div>
              <div className="flex justify-between">
                <span>Sessions Included:</span>
                <span>{localData.sessions_included}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Total Regular Price:</span>
                <span className="line-through text-muted-foreground">
                  ${(parseFloat(selectedServiceDetails.price) * localData.sessions_included).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bundle Price:</span>
                <span className="font-bold text-lg">${service.price || '0.00'}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Customer Saves:</span>
                <span className="font-medium">
                  ${calculateSavings().toFixed(2)} ({((calculateSavings() / (parseFloat(selectedServiceDetails.price) * localData.sessions_included)) * 100).toFixed(0)}% off)
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Price per Session:</span>
                <span className="font-medium">${calculatePricePerSession().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Validity Period */}
      <div className="space-y-2">
        <Label>Validity Period (days)</Label>
        <Input
          type="number"
          value={service.validity_days || 365}
          disabled
          className="max-w-[200px]"
        />
        <p className="text-sm text-muted-foreground">
          How long customers have to use their sessions (set in Advanced Settings)
        </p>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !selectedService || !localData.sessions_included}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}