"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
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
import { useToast } from "@/hooks/use-toast"
import { Loader2, MapPin, Check } from "lucide-react"
import { practitionerLocationsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import {
  AddressAutocomplete,
  type AddressData,
} from "@/components/ui/address-autocomplete"

interface CreateLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLocationCreated: () => void
}

interface FormData {
  name: string
  address_line1: string
  address_line2: string
  postal_code: string
  is_primary: boolean
  is_virtual: boolean
  is_in_person: boolean
  // Address data from Google Places
  addressData: AddressData | null
}

const initialFormData: FormData = {
  name: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  is_primary: false,
  is_virtual: false,
  is_in_person: true,
  addressData: null,
}

export function CreateLocationDialog({
  open,
  onOpenChange,
  onLocationCreated,
}: CreateLocationDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const createMutation = useMutation({
    ...practitionerLocationsCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Location created",
        description: "Your new location has been added successfully.",
      })
      onLocationCreated()
      setFormData(initialFormData)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create location",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      })
    },
  })

  const handleAddressSelect = (address: AddressData) => {
    setFormData((prev) => ({
      ...prev,
      address_line1: address.address_line1,
      postal_code: address.postal_code,
      addressData: address,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const { addressData } = formData

    // Validation
    if (!addressData) {
      toast({
        title: "Address required",
        description: "Please select an address from the suggestions.",
        variant: "destructive",
      })
      return
    }

    if (!formData.postal_code) {
      toast({
        title: "Postal code required",
        description: "Please enter a postal code.",
        variant: "destructive",
      })
      return
    }

    // Submit with name-based location fields
    createMutation.mutate({
      body: {
        name: formData.name || undefined,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || undefined,
        postal_code: formData.postal_code,
        latitude: addressData.latitude.toString(),
        longitude: addressData.longitude.toString(),
        is_primary: formData.is_primary,
        is_virtual: formData.is_virtual,
        is_in_person: formData.is_in_person,
        // Name-based location fields for auto-creation
        input_city_name: addressData.city_name,
        input_state_name: addressData.state_name,
        input_state_code: addressData.state_code,
        input_country_name: addressData.country_name,
        input_country_code: addressData.country_code,
      },
    })
  }

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

          {/* Address Autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="address">Street Address*</Label>
            <AddressAutocomplete
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address..."
              defaultValue={formData.address_line1}
            />
            <p className="text-xs text-muted-foreground">
              Type your address and select from the suggestions
            </p>
          </div>

          {/* Selected Address Display */}
          {formData.addressData && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <Check className="h-4 w-4" />
                Address Selected
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>{formData.addressData.address_line1}</p>
                  <p>
                    {formData.addressData.city_name},{" "}
                    {formData.addressData.state_code}{" "}
                    {formData.addressData.postal_code}
                  </p>
                  <p>{formData.addressData.country_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="address_line2">
              Apartment, Suite, etc. (Optional)
            </Label>
            <Input
              id="address_line2"
              placeholder="Suite 200"
              value={formData.address_line2}
              onChange={(e) => handleChange("address_line2", e.target.value)}
            />
          </div>

          {/* Postal Code - Pre-filled but editable */}
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code*</Label>
            <Input
              id="postal_code"
              placeholder="12345"
              value={formData.postal_code}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              required
            />
            {formData.addressData && !formData.addressData.postal_code && (
              <p className="text-xs text-amber-600">
                Postal code not detected. Please enter it manually.
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  handleChange("is_primary", checked)
                }
              />
              <Label
                htmlFor="is_primary"
                className="text-sm font-normal cursor-pointer"
              >
                Set as primary location
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_in_person"
                checked={formData.is_in_person}
                onCheckedChange={(checked) =>
                  handleChange("is_in_person", checked)
                }
              />
              <Label
                htmlFor="is_in_person"
                className="text-sm font-normal cursor-pointer"
              >
                Offer in-person services at this location
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_virtual"
                checked={formData.is_virtual}
                onCheckedChange={(checked) =>
                  handleChange("is_virtual", checked)
                }
              />
              <Label
                htmlFor="is_virtual"
                className="text-sm font-normal cursor-pointer"
              >
                Offer virtual services from this location
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
