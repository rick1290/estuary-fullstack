"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ServiceReadable } from "@/src/client/types.gen"

interface PricingDurationSectionProps {
  service: ServiceReadable
  data: {
    price?: string | number
    duration_minutes?: number
    max_participants?: number
    min_participants?: number
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

const durationOptions = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
  { value: 480, label: "8 hours (full day)" },
]

export function PricingDurationSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: PricingDurationSectionProps) {
  const [localData, setLocalData] = useState(data)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const isGroupService = service.service_type_info?.type_code === 'workshop' || 
                        service.service_type_info?.type_code === 'course'

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price">Price*</Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price"
              type="number"
              value={localData.price || ""}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="0.00"
              className="pl-8"
              step="0.01"
              min="0"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Set to 0 for free services
          </p>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="duration">Duration*</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total duration of the service</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={localData.duration_minutes?.toString() || ""}
            onValueChange={(value) => handleChange("duration_minutes", parseInt(value))}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Participants - Only show for group services */}
        {isGroupService && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Minimum Participants</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Minimum number needed to run the {service.service_type_info?.display_name?.toLowerCase()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-4 max-w-md">
                  <Slider
                    value={[localData.min_participants || 1]}
                    onValueChange={(value) => handleChange("min_participants", value[0])}
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <div className="w-16 text-center font-medium">
                    {localData.min_participants || 1}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Maximum Participants</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Maximum capacity for this {service.service_type_info?.display_name?.toLowerCase()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-4 max-w-md">
                  <Slider
                    value={[localData.max_participants || 10]}
                    onValueChange={(value) => handleChange("max_participants", value[0])}
                    min={localData.min_participants || 1}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <div className="w-16 text-center font-medium">
                    {localData.max_participants || 10}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pricing Summary */}
        <div className="rounded-lg border bg-muted/50 p-4 max-w-md">
          <h4 className="font-medium mb-2">Pricing Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Service Price:</span>
              <span className="font-medium">${localData.price || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-medium">
                {localData.duration_minutes ? 
                  durationOptions.find(d => d.value === localData.duration_minutes)?.label || 
                  `${localData.duration_minutes} minutes` : 
                  "Not set"}
              </span>
            </div>
            {localData.price && localData.duration_minutes && (
              <div className="flex justify-between pt-2 border-t">
                <span>Hourly Rate:</span>
                <span className="font-medium">
                  ${((parseFloat(localData.price) / localData.duration_minutes) * 60).toFixed(2)}/hour
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}