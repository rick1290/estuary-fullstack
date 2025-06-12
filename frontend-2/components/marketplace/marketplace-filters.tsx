"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Filter } from "lucide-react"

// Mock categories for the demo
const CATEGORIES = [
  "Meditation",
  "Yoga",
  "Therapy",
  "Coaching",
  "Healing",
  "Nutrition",
  "Fitness",
  "Mindfulness",
  "Spiritual",
]

interface MarketplaceFiltersProps {
  initialCategories?: string[]
  initialLocation?: string
  initialType?: string
  showServiceTypeFilter?: boolean
}

export default function MarketplaceFilters({
  initialCategories = [],
  initialLocation = "",
  initialType = "",
  showServiceTypeFilter = true,
}: MarketplaceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories)
  const [priceRange, setPriceRange] = useState<number[]>([0, 500])
  const [serviceType, setServiceType] = useState<string>(initialType || "all")
  const [location, setLocation] = useState<string>(initialLocation || "")
  const [rating, setRating] = useState<string>("any")

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handlePriceChange = (value: number[]) => {
    setPriceRange(value)
  }

  const handleServiceTypeChange = (value: string) => {
    setServiceType(value)

    // If user selects a specific service type and we're on the marketplace page,
    // we can optionally redirect them to the dedicated page
    if (pathname === "/marketplace" && value !== "all") {
      const typeToPathMap: Record<string, string> = {
        courses: "/courses",
        workshops: "/workshops",
        "one-on-one": "/sessions",
        packages: "/sessions",
      }

      if (typeToPathMap[value]) {
        // Preserve other search params
        const params = new URLSearchParams(searchParams.toString())
        params.delete("type") // Remove type since we're navigating to type-specific page
        const queryString = params.toString() ? `?${params.toString()}` : ""
        router.push(`${typeToPathMap[value]}${queryString}`)
        return
      }
    }
  }

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    // Clear existing filter params
    params.delete("category")
    params.delete("minPrice")
    params.delete("maxPrice")
    params.delete("type")
    params.delete("location")
    params.delete("rating")

    // Add new filter params
    selectedCategories.forEach((category) => {
      params.append("category", category)
    })

    params.set("minPrice", priceRange[0].toString())
    params.set("maxPrice", priceRange[1].toString())

    if (serviceType !== "all") {
      params.set("type", serviceType)
    }

    if (location) {
      params.set("location", location)
    }

    if (rating !== "any") {
      params.set("rating", rating)
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const resetFilters = () => {
    setSelectedCategories([])
    setPriceRange([0, 500])
    setServiceType("all")
    setLocation("")
    setRating("any")

    // Keep only the search query if it exists
    const params = new URLSearchParams()
    const query = searchParams.get("q")
    if (query) params.set("q", query)

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium mb-6">Refine Results</h2>
        
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          </div>

          {showServiceTypeFilter && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Service Type</Label>
              <RadioGroup value={serviceType} onValueChange={handleServiceTypeChange} className="space-y-2.5">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" className="border-gray-300" />
                  <Label htmlFor="all" className="text-sm font-normal text-gray-700 cursor-pointer">All Services</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-on-one" id="one-on-one" className="border-gray-300" />
                  <Label htmlFor="one-on-one" className="text-sm font-normal text-gray-700 cursor-pointer">One-on-One Sessions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="packages" id="packages" className="border-gray-300" />
                  <Label htmlFor="packages" className="text-sm font-normal text-gray-700 cursor-pointer">Packages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="workshops" id="workshops" className="border-gray-300" />
                  <Label htmlFor="workshops" className="text-sm font-normal text-gray-700 cursor-pointer">Workshops</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="courses" id="courses" className="border-gray-300" />
                  <Label htmlFor="courses" className="text-sm font-normal text-gray-700 cursor-pointer">Courses</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900">Categories</Label>
            <div className="space-y-2.5">
              {CATEGORIES.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                    className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                  />
                  <Label htmlFor={`category-${category}`} className="text-sm font-normal text-gray-700 cursor-pointer">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900">Price Range</Label>
            <div className="space-y-4">
              <Slider
                defaultValue={[0, 500]}
                value={priceRange}
                onValueChange={handlePriceChange}
                min={0}
                max={500}
                step={10}
                className="mt-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">${priceRange[0]}</span>
                <span className="text-sm text-gray-600">${priceRange[1]}+</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900">Minimum Rating</Label>
            <RadioGroup value={rating} onValueChange={setRating} className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="any-rating" className="border-gray-300" />
                <Label htmlFor="any-rating" className="text-sm font-normal text-gray-700 cursor-pointer">Any Rating</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4+" id="four-plus" className="border-gray-300" />
                <Label htmlFor="four-plus" className="text-sm font-normal text-gray-700 cursor-pointer">4+ Stars</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4.5+" id="four-five-plus" className="border-gray-300" />
                <Label htmlFor="four-five-plus" className="text-sm font-normal text-gray-700 cursor-pointer">4.5+ Stars</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator className="my-6" />
          
          <div className="space-y-3">
            <Button className="w-full" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button variant="ghost" onClick={resetFilters} className="w-full text-gray-600">
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
