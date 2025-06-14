"use client"

import { useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useServiceForm } from "@/hooks/use-service-form"

export default function LocationStep() {
  const { formState, updateFormField } = useServiceForm()
  const [locationType, setLocationType] = useState(formState.locationType || "online")
  const [address, setAddress] = useState(formState.address || "")
  const [city, setCity] = useState(formState.city || "")
  const [state, setState] = useState(formState.state || "")
  const [zipCode, setZipCode] = useState(formState.zipCode || "")
  const [meetingLink, setMeetingLink] = useState(formState.meetingLink || "")
  const [meetingPlatform, setMeetingPlatform] = useState(formState.meetingPlatform || "")
  const [locationNotes, setLocationNotes] = useState(formState.locationNotes || "")

  const handleLocationTypeChange = (value: string) => {
    setLocationType(value)
    updateFormField("locationType", value)
  }

  const updateAddressField = (field: string, value: string) => {
    switch (field) {
      case "address":
        setAddress(value)
        updateFormField("address", value)
        break
      case "city":
        setCity(value)
        updateFormField("city", value)
        break
      case "state":
        setState(value)
        updateFormField("state", value)
        break
      case "zipCode":
        setZipCode(value)
        updateFormField("zipCode", value)
        break
      case "meetingLink":
        setMeetingLink(value)
        updateFormField("meetingLink", value)
        break
      case "meetingPlatform":
        setMeetingPlatform(value)
        updateFormField("meetingPlatform", value)
        break
      case "locationNotes":
        setLocationNotes(value)
        updateFormField("locationNotes", value)
        break
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Location</h2>
        <p className="text-muted-foreground">Specify where your service will take place.</p>
      </div>

      <RadioGroup value={locationType} onValueChange={handleLocationTypeChange} className="space-y-4">
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="online" id="online" />
          <div className="grid gap-1.5">
            <Label htmlFor="online" className="font-medium">
              Online
            </Label>
            <p className="text-sm text-muted-foreground">Service will be delivered virtually via video conferencing.</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <RadioGroupItem value="in_person" id="in_person" />
          <div className="grid gap-1.5">
            <Label htmlFor="in_person" className="font-medium">
              In Person
            </Label>
            <p className="text-sm text-muted-foreground">Service will be delivered at a physical location.</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <RadioGroupItem value="hybrid" id="hybrid" />
          <div className="grid gap-1.5">
            <Label htmlFor="hybrid" className="font-medium">
              Hybrid
            </Label>
            <p className="text-sm text-muted-foreground">Service will be available both online and in person.</p>
          </div>
        </div>
      </RadioGroup>

      {(locationType === "online" || locationType === "hybrid") && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">Online Details</h3>

            <div className="space-y-2">
              <Label htmlFor="meetingPlatform">Platform</Label>
              <Input
                id="meetingPlatform"
                placeholder="e.g., Zoom, Google Meet, Microsoft Teams"
                value={meetingPlatform}
                onChange={(e) => updateAddressField("meetingPlatform", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link (optional)</Label>
              <Input
                id="meetingLink"
                placeholder="e.g., https://zoom.us/j/123456789"
                value={meetingLink}
                onChange={(e) => updateAddressField("meetingLink", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">You can add this now or provide it to participants later.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(locationType === "in_person" || locationType === "hybrid") && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">Physical Location</h3>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                value={address}
                onChange={(e) => updateAddressField("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={city}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={state}
                  onChange={(e) => updateAddressField("state", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                placeholder="ZIP Code"
                value={zipCode}
                onChange={(e) => updateAddressField("zipCode", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="locationNotes">Additional Location Notes</Label>
        <Textarea
          id="locationNotes"
          placeholder="Provide any additional details about the location, parking, access, etc."
          rows={3}
          value={locationNotes}
          onChange={(e) => updateAddressField("locationNotes", e.target.value)}
        />
      </div>
    </div>
  )
}
