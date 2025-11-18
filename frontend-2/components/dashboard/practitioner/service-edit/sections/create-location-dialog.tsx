"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import {
  practitionerLocationsCreateMutation,
  countriesListOptions,
  statesListOptions,
  citiesListOptions,
} from "@/src/client/@tanstack/react-query.gen"

interface CreateLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLocationCreated: () => void
}

export function CreateLocationDialog({
  open,
  onOpenChange,
  onLocationCreated,
}: CreateLocationDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    is_primary: false,
    is_virtual: false,
    is_in_person: true,
  })

  // Fetch countries, states, cities
  const { data: countriesData } = useQuery({
    ...countriesListOptions(),
  })

  const { data: statesData } = useQuery({
    ...statesListOptions({
      query: formData.country ? { country: parseInt(formData.country) } : undefined,
    }),
    enabled: !!formData.country,
  })

  const { data: citiesData } = useQuery({
    ...citiesListOptions({
      query: formData.state ? { state: parseInt(formData.state) } : undefined,
    }),
    enabled: !!formData.state,
  })

  const countries = countriesData?.results || []
  const states = statesData?.results || []
  const cities = citiesData?.results || []

  const createMutation = useMutation({
    ...practitionerLocationsCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Location created",
        description: "Your new location has been added successfully.",
      })
      onLocationCreated()
      // Reset form
      setFormData({
        name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        is_primary: false,
        is_virtual: false,
        is_in_person: true,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create location",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.address_line1 || !formData.city || !formData.state || !formData.country || !formData.postal_code) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    createMutation.mutate({
      body: {
        name: formData.name || undefined,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || undefined,
        city: parseInt(formData.city),
        state: parseInt(formData.state),
        country: parseInt(formData.country),
        postal_code: formData.postal_code,
        is_primary: formData.is_primary,
        is_virtual: formData.is_virtual,
        is_in_person: formData.is_in_person,
      },
    })
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      // Reset dependent fields when parent changes
      if (field === "country") {
        newData.state = ""
        newData.city = ""
      }
      if (field === "state") {
        newData.city = ""
      }
      return newData
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Add a physical location where you offer services to clients.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">Location Name (Optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Downtown Office, Main Studio"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Give this location a friendly name for easy identification
            </p>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="address_line1">Street Address*</Label>
            <Input
              id="address_line1"
              placeholder="123 Main Street"
              value={formData.address_line1}
              onChange={(e) => handleChange("address_line1", e.target.value)}
              required
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="address_line2">Apartment, Suite, etc. (Optional)</Label>
            <Input
              id="address_line2"
              placeholder="Suite 200"
              value={formData.address_line2}
              onChange={(e) => handleChange("address_line2", e.target.value)}
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country*</Label>
            <Select value={formData.country} onValueChange={(value) => handleChange("country", value)}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country: any) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state">State / Province*</Label>
            <Select
              value={formData.state}
              onValueChange={(value) => handleChange("state", value)}
              disabled={!formData.country}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder={formData.country ? "Select state" : "Select country first"} />
              </SelectTrigger>
              <SelectContent>
                {states.map((state: any) => (
                  <SelectItem key={state.id} value={state.id.toString()}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City*</Label>
            <Select
              value={formData.city}
              onValueChange={(value) => handleChange("city", value)}
              disabled={!formData.state}
            >
              <SelectTrigger id="city">
                <SelectValue placeholder={formData.state ? "Select city" : "Select state first"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city: any) => (
                  <SelectItem key={city.id} value={city.id.toString()}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Postal Code */}
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code*</Label>
            <Input
              id="postal_code"
              placeholder="12345"
              value={formData.postal_code}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => handleChange("is_primary", checked)}
              />
              <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
                Set as primary location
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_in_person"
                checked={formData.is_in_person}
                onCheckedChange={(checked) => handleChange("is_in_person", checked)}
              />
              <Label htmlFor="is_in_person" className="text-sm font-normal cursor-pointer">
                Offer in-person services at this location
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_virtual"
                checked={formData.is_virtual}
                onCheckedChange={(checked) => handleChange("is_virtual", checked)}
              />
              <Label htmlFor="is_virtual" className="text-sm font-normal cursor-pointer">
                Offer virtual services from this location
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Location"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
