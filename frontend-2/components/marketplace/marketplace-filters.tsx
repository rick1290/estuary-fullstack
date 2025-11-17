"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { MapPin, Globe, Users, Navigation, Tag } from "lucide-react"
import { useMarketplaceFilters } from "@/hooks/use-marketplace-filters"
import { modalitiesListOptions, serviceCategoriesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { Skeleton } from "@/components/ui/skeleton"

interface MarketplaceFiltersProps {
  showServiceTypeFilter?: boolean
}

export default function MarketplaceFilters({
  showServiceTypeFilter = true,
}: MarketplaceFiltersProps) {
  const { filters, updateFilter, resetFilters, toggleArrayFilter } = useMarketplaceFilters()

  // Fetch modalities from API
  const { data: modalitiesData, isLoading: isLoadingModalities } = useQuery({
    ...modalitiesListOptions({}),
  })

  // Fetch service categories from API
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    ...serviceCategoriesListOptions({}),
  })

  const modalities = modalitiesData?.results || []
  const categories = categoriesData?.results || []


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-olive-900 mb-6">Refine Results</h2>

        <div className="space-y-8">
          {/* Service Format Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-olive-900">Service Format</Label>
            <RadioGroup
              value={filters.locationFormat}
              onValueChange={(value) => updateFilter('locationFormat', value)}
              className="space-y-2.5"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="format-all" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                <Label htmlFor="format-all" className="text-sm font-normal text-olive-700 cursor-pointer flex items-center gap-2">
                  All Services
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="format-online" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                <Label htmlFor="format-online" className="text-sm font-normal text-olive-700 cursor-pointer flex items-center gap-2">
                  <Globe className="h-4 w-4 text-sage-600" />
                  Online Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in-person" id="format-in-person" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                <Label htmlFor="format-in-person" className="text-sm font-normal text-olive-700 cursor-pointer flex items-center gap-2">
                  <Users className="h-4 w-4 text-sage-600" />
                  In-Person Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Location section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-olive-900">
              Location
              {filters.locationFormat === "in-person" && <span className="text-sage-600 ml-1">*</span>}
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-sage-600" strokeWidth="1.5" />
              <Input
                placeholder={filters.locationFormat === "in-person" ? "Enter city, state or zip" : "Enter location (optional)"}
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                className="pl-10 bg-white border-sage-300 focus:border-sage-500 focus:ring-0 rounded-xl"
                required={filters.locationFormat === "in-person"}
              />
            </div>

            {/* Distance slider for in-person services */}
            {filters.locationFormat === "in-person" && filters.location && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-olive-700">Search radius</Label>
                  <span className="text-xs font-medium text-sage-600">{filters.distance} miles</span>
                </div>
                <Slider
                  value={[filters.distance]}
                  onValueChange={([value]) => updateFilter('distance', value)}
                  min={5}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-olive-600">
                  <span>5 mi</span>
                  <span>100 mi</span>
                </div>
              </div>
            )}

            {/* Use current location button */}
            {filters.locationFormat === "in-person" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-sage-300 text-sage-700 hover:bg-sage-50"
                onClick={() => updateFilter('location', 'Current Location')}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Use my current location
              </Button>
            )}
          </div>

          {showServiceTypeFilter && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-olive-900">Service Type</Label>
              <RadioGroup
                value={filters.serviceType}
                onValueChange={(value) => updateFilter('serviceType', value)}
                className="space-y-2.5"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                  <Label htmlFor="all" className="text-sm font-normal text-olive-700 cursor-pointer">All Services</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="session" id="session" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                  <Label htmlFor="session" className="text-sm font-normal text-olive-700 cursor-pointer">One-on-One Sessions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bundle" id="bundle" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                  <Label htmlFor="bundle" className="text-sm font-normal text-olive-700 cursor-pointer">Session Bundles</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="package" id="package" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                  <Label htmlFor="package" className="text-sm font-normal text-olive-700 cursor-pointer">Packages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="workshop" id="workshop" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                  <Label htmlFor="workshop" className="text-sm font-normal text-olive-700 cursor-pointer">Workshops</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="course" id="course" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                  <Label htmlFor="course" className="text-sm font-normal text-olive-700 cursor-pointer">Courses</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Modalities Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-olive-900 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Modalities
            </Label>
            {isLoadingModalities ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : modalities.length > 0 ? (
              <div className="space-y-2.5">
                {modalities.map((modality: any) => (
                  <div key={modality.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`modality-${modality.id}`}
                      checked={filters.modalities.includes(String(modality.id))}
                      onCheckedChange={() => toggleArrayFilter('modalities', String(modality.id))}
                      className="border-sage-300 data-[state=checked]:bg-sage-600 data-[state=checked]:border-sage-600"
                    />
                    <Label htmlFor={`modality-${modality.id}`} className="text-sm font-normal text-olive-700 cursor-pointer">
                      {modality.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No modalities available</p>
            )}
          </div>

          {/* Categories Filter */}
          {categories.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-olive-900">Categories</Label>
              {isLoadingCategories ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {categories.map((category: any) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={filters.categories.includes(String(category.id))}
                        onCheckedChange={() => toggleArrayFilter('categories', String(category.id))}
                        className="border-sage-300 data-[state=checked]:bg-sage-600 data-[state=checked]:border-sage-600"
                      />
                      <Label htmlFor={`category-${category.id}`} className="text-sm font-normal text-olive-700 cursor-pointer">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-olive-900">Price Range</Label>
            <div className="space-y-4">
              <Slider
                value={[filters.minPrice, filters.maxPrice]}
                onValueChange={([min, max]) => updateFilter('minPrice', min) || updateFilter('maxPrice', max)}
                min={0}
                max={500}
                step={10}
                className="mt-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-olive-600">${filters.minPrice}</span>
                <span className="text-sm text-olive-600">${filters.maxPrice}+</span>
              </div>
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-olive-900">Minimum Rating</Label>
            <RadioGroup
              value={filters.rating}
              onValueChange={(value) => updateFilter('rating', value)}
              className="space-y-2.5"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="any-rating" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                <Label htmlFor="any-rating" className="text-sm font-normal text-olive-700 cursor-pointer">Any Rating</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4+" id="four-plus" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                <Label htmlFor="four-plus" className="text-sm font-normal text-olive-700 cursor-pointer">4+ Stars</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4.5+" id="four-five-plus" className="border-sage-300 text-sage-600 data-[state=checked]:border-sage-600" />
                <Label htmlFor="four-five-plus" className="text-sm font-normal text-olive-700 cursor-pointer">4.5+ Stars</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator className="my-6 bg-sage-200" />

          {/* Clear All Button - no Apply button needed since filters auto-apply */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="w-full text-olive-600 hover:text-olive-800 hover:bg-sage-50 rounded-xl"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
