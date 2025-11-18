"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Video, Users, Plus, Loader2 } from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"
import { practitionerLocationsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { CreateLocationDialog } from "./create-location-dialog"

interface LocationSectionProps {
  service: ServiceReadable
  data: {
    location_type?: string
    practitioner_location_id?: number
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}


export function LocationSection({
  service,
  data,
  onChange,
  onSave,
  hasChanges,
  isSaving
}: LocationSectionProps) {
  const [localData, setLocalData] = useState(data)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Fetch practitioner locations
  const { data: locationsData, isLoading: locationsLoading, refetch } = useQuery({
    ...practitionerLocationsListOptions(),
  })

  const locations = locationsData?.results || []

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const handleLocationCreated = () => {
    setShowCreateDialog(false)
    refetch() // Refresh the locations list
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Location Type */}
        <div className="space-y-3">
          <Label>Service Location*</Label>
          <RadioGroup
            value={localData.location_type || "virtual"}
            onValueChange={(value) => handleChange("location_type", value)}
          >
            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="virtual" id="virtual" />
              <Label htmlFor="virtual" className="flex items-center gap-2 cursor-pointer flex-1">
                <Video className="h-4 w-4" />
                <div>
                  <div className="font-medium">Online</div>
                  <div className="text-sm text-muted-foreground">
                    Service delivered via video call
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="in_person" id="in_person" />
              <Label htmlFor="in_person" className="flex items-center gap-2 cursor-pointer flex-1">
                <MapPin className="h-4 w-4" />
                <div>
                  <div className="font-medium">In-Person</div>
                  <div className="text-sm text-muted-foreground">
                    Service at your physical location
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="hybrid" id="hybrid" />
              <Label htmlFor="hybrid" className="flex items-center gap-2 cursor-pointer flex-1">
                <Users className="h-4 w-4" />
                <div>
                  <div className="font-medium">Hybrid</div>
                  <div className="text-sm text-muted-foreground">
                    Both online and in-person options
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>


        {/* In-Person Details */}
        {(localData.location_type === "in_person" || localData.location_type === "hybrid") && (
          <div className="space-y-4 pl-6 border-l-2">
            <h4 className="font-medium">Physical Location</h4>

            <div className="space-y-3">
              <Label htmlFor="address">Select Address*</Label>

              {locationsLoading ? (
                <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading locations...</span>
                </div>
              ) : locations.length > 0 ? (
                <div className="space-y-3">
                  <Select
                    value={localData.practitioner_location_id?.toString()}
                    onValueChange={(value) => handleChange("practitioner_location_id", parseInt(value))}
                  >
                    <SelectTrigger id="address">
                      <SelectValue placeholder="Choose a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location: any) => {
                        const displayName = location.name ||
                          `${location.address_line1}, ${location.city_name || ''}, ${location.state_code || ''}`
                        return (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{displayName}</span>
                              {location.name && (
                                <span className="text-xs text-muted-foreground">
                                  {location.address_line1}, {location.city_name}, {location.state_code}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {/* Show selected location details */}
                  {localData.practitioner_location_id && (
                    <div className="p-3 border rounded-lg bg-muted/30">
                      {(() => {
                        const selectedLocation = locations.find((l: any) => l.id === localData.practitioner_location_id)
                        if (!selectedLocation) return null
                        return (
                          <div className="text-sm space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-medium">{selectedLocation.name || 'Location'}</p>
                                <p className="text-muted-foreground">{selectedLocation.address_line1}</p>
                                {selectedLocation.address_line2 && (
                                  <p className="text-muted-foreground">{selectedLocation.address_line2}</p>
                                )}
                                <p className="text-muted-foreground">
                                  {selectedLocation.city_name}, {selectedLocation.state_code} {selectedLocation.postal_code}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Location
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-3">
                      You haven't added any locations yet. Add your first location to offer in-person services.
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Location
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Create Location Dialog */}
      <CreateLocationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onLocationCreated={handleLocationCreated}
      />
    </div>
  )
}