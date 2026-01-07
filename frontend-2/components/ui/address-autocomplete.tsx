"use client"

import * as React from "react"
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete"
import { useLoadScript } from "@react-google-maps/api"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Loader2, MapPin } from "lucide-react"

const libraries: ("places")[] = ["places"]

export interface AddressData {
  address_line1: string
  city_name: string
  state_name: string
  state_code: string
  country_name: string
  country_code: string
  postal_code: string
  latitude: number
  longitude: number
  formatted_address: string
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressData) => void
  placeholder?: string
  defaultValue?: string
  className?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Start typing an address...",
  defaultValue = "",
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "",
    libraries,
  })

  if (loadError) {
    return (
      <Input
        placeholder="Error loading address search"
        disabled
        className={cn("text-destructive", className)}
      />
    )
  }

  if (!isLoaded) {
    return (
      <div className={cn("relative", className)}>
        <Input placeholder="Loading address search..." disabled />
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <PlacesAutocompleteInput
      onAddressSelect={onAddressSelect}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className={className}
      disabled={disabled}
    />
  )
}

function PlacesAutocompleteInput({
  onAddressSelect,
  placeholder,
  defaultValue,
  className,
  disabled,
}: AddressAutocompleteProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["address"],
    },
    debounce: 300,
    defaultValue,
  })

  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    setShowSuggestions(true)
  }

  const handleSelect = async (description: string, placeId: string) => {
    setValue(description, false)
    clearSuggestions()
    setShowSuggestions(false)

    try {
      // Get detailed place info
      const results = await getGeocode({ placeId })
      const { lat, lng } = await getLatLng(results[0])

      // Parse address components
      const addressData = parseAddressComponents(
        results[0].address_components,
        lat,
        lng,
        description
      )

      onAddressSelect(addressData)
    } catch (error) {
      console.error("Error fetching place details:", error)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={handleInput}
        onFocus={() => setShowSuggestions(true)}
        disabled={disabled || !ready}
        placeholder={ready ? placeholder : "Loading..."}
        className="w-full"
      />

      {showSuggestions && status === "OK" && data.length > 0 && (
        <ul className="absolute z-[10000] mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion

            return (
              <li
                key={place_id}
                onClick={() => handleSelect(suggestion.description, place_id)}
                className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{main_text}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {secondary_text}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
  lat: number,
  lng: number,
  formattedAddress: string
): AddressData {
  let streetNumber = ""
  let route = ""
  let city = ""
  let state = ""
  let stateCode = ""
  let country = ""
  let countryCode = ""
  let postalCode = ""

  for (const component of components) {
    const types = component.types

    if (types.includes("street_number")) {
      streetNumber = component.long_name
    }
    if (types.includes("route")) {
      route = component.long_name
    }
    if (types.includes("locality")) {
      city = component.long_name
    }
    // Fallback to sublocality if no locality
    if (types.includes("sublocality_level_1") && !city) {
      city = component.long_name
    }
    // Fallback to administrative_area_level_3 for smaller towns
    if (types.includes("administrative_area_level_3") && !city) {
      city = component.long_name
    }
    // Fallback to neighborhood
    if (types.includes("neighborhood") && !city) {
      city = component.long_name
    }
    if (types.includes("administrative_area_level_1")) {
      state = component.long_name
      stateCode = component.short_name
    }
    if (types.includes("country")) {
      country = component.long_name
      countryCode = component.short_name
    }
    if (types.includes("postal_code")) {
      postalCode = component.long_name
    }
  }

  // Construct address_line1
  const addressLine1 = streetNumber
    ? `${streetNumber} ${route}`
    : route || formattedAddress.split(",")[0]

  return {
    address_line1: addressLine1.trim(),
    city_name: city,
    state_name: state,
    state_code: stateCode,
    country_name: country,
    country_code: countryCode,
    postal_code: postalCode,
    latitude: Math.round(lat * 1000000) / 1000000, // Max 6 decimal places
    longitude: Math.round(lng * 1000000) / 1000000, // Max 6 decimal places
    formatted_address: formattedAddress,
  }
}
