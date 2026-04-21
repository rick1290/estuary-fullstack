"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Video, Plus, Loader2, Globe } from "lucide-react"
import { useServiceForm } from "@/hooks/use-service-form"
import { practitionerLocationsListOptions } from "@/src/client/@tanstack/react-query.gen"
import { CreateLocationDialog } from "@/components/dashboard/practitioner/service-edit/sections/create-location-dialog"

export default function LocationStep() {
  const { formState, updateFormField } = useServiceForm()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const locationType = formState.location_type || "virtual"
  const practitionerLocationId = formState.practitioner_location_id

  const { data: locationsData, isLoading: locationsLoading, refetch } = useQuery({
    ...practitionerLocationsListOptions(),
    enabled: locationType === "in_person" || locationType === "hybrid",
  })

  const locations = locationsData?.results || []

  const handleLocationTypeChange = (value: string) => {
    updateFormField("location_type", value)
    if (value === "virtual") {
      updateFormField("practitioner_location_id", undefined)
    }
  }

  const handleLocationCreated = () => {
    setShowCreateDialog(false)
    refetch()
  }

  const needsPhysicalLocation = locationType === "in_person" || locationType === "hybrid"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Location</h2>
        <p className="text-muted-foreground">Specify where your service will take place.</p>
      </div>

      <div className="space-y-3">
        <Label>Service Location*</Label>
        <RadioGroup value={locationType} onValueChange={handleLocationTypeChange}>
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
              <Globe className="h-4 w-4" />
              <div>
                <div className="font-medium">Hybrid</div>
                <div className="text-sm text-muted-foreground">
                  Available both online and in-person
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {needsPhysicalLocation && (
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
                  value={practitionerLocationId?.toString()}
                  onValueChange={(value) =>
                    updateFormField("practitioner_location_id", parseInt(value))
                  }
                >
                  <SelectTrigger id="address">
                    <SelectValue placeholder="Choose a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: any) => {
                      const displayName =
                        location.name ||
                        `${location.address_line1}, ${location.city_name || ""}, ${location.state_code || ""}`
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

                {practitionerLocationId && (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    {(() => {
                      const selectedLocation = locations.find(
                        (l: any) => l.id === practitionerLocationId
                      )
                      if (!selectedLocation) return null
                      return (
                        <div className="text-sm space-y-1">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">
                                {selectedLocation.name || "Location"}
                              </p>
                              <p className="text-muted-foreground">
                                {selectedLocation.address_line1}
                              </p>
                              {selectedLocation.address_line2 && (
                                <p className="text-muted-foreground">
                                  {selectedLocation.address_line2}
                                </p>
                              )}
                              <p className="text-muted-foreground">
                                {selectedLocation.city_name}, {selectedLocation.state_code}{" "}
                                {selectedLocation.postal_code}
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
                    You haven't added any locations yet. Add your first location to offer
                    in-person services.
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

      {(locationType === "virtual" || locationType === "hybrid") && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Online Details
            </h3>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">How it works:</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Secure meeting rooms are created for each session</li>
                <li>• Links are sent automatically to participants</li>
                <li>• No need to manage your own video platform</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="locationNotes">Additional Location Notes</Label>
        <Textarea
          id="locationNotes"
          placeholder="Parking, access instructions, meeting instructions, etc."
          rows={3}
          value={formState.locationNotes || ""}
          onChange={(e) => updateFormField("locationNotes", e.target.value)}
        />
      </div>

      <CreateLocationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onLocationCreated={handleLocationCreated}
      />
    </div>
  )
}
