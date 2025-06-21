"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Package, 
  Plus, 
  Trash2, 
  Search,
  DollarSign,
  Clock,
  Users,
  Percent,
  AlertCircle,
  Check,
  X,
  Sparkles,
  ShoppingCart,
  Calculator
} from "lucide-react"
import { servicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import type { ServiceListResponse } from "@/src/client/types.gen"
import { useAuth } from "@/hooks/use-auth"

interface SelectedService {
  serviceId: number
  service?: ServiceListResponse
  quantity: number
  discountPercentage: number
  isRequired?: boolean
  order?: number
}

export function PackageBuilderStep() {
  const { formState, updateFormField, errors } = useServiceForm()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    formState.selectedServices || []
  )
  const [showPricing, setShowPricing] = useState(true)

  // Fetch practitioner's services
  const { data: servicesData, isLoading } = useQuery({
    ...servicesListOptions({
      query: {
        practitioner: user?.practitioner_profile?.id,
        page_size: 100,
        // Exclude packages and bundles from selection
        service_type: "session,workshop,course"
      }
    }),
    enabled: !!user?.practitioner_profile?.id
  })

  const services = servicesData?.results || []
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Update form state when selectedServices changes
  useEffect(() => {
    updateFormField("selectedServices", selectedServices)
    updateFormField("childServiceConfigs", selectedServices.map(s => ({
      child_service_id: s.serviceId,
      quantity: s.quantity,
      discount_percentage: s.discountPercentage,
      is_required: s.isRequired,
      order: s.order
    })))
  }, [selectedServices])

  const addService = (service: ServiceListResponse) => {
    if (selectedServices.find(s => s.serviceId === service.id)) {
      return // Already added
    }

    const newService: SelectedService = {
      serviceId: service.id,
      service: service,
      quantity: 1,
      discountPercentage: 0,
      isRequired: true,
      order: selectedServices.length
    }

    setSelectedServices([...selectedServices, newService])
  }

  const updateService = (index: number, updates: Partial<SelectedService>) => {
    const updated = [...selectedServices]
    updated[index] = { ...updated[index], ...updates }
    setSelectedServices(updated)
  }

  const removeService = (index: number) => {
    const updated = selectedServices.filter((_, i) => i !== index)
    // Reorder
    updated.forEach((service, i) => {
      service.order = i
    })
    setSelectedServices(updated)
  }

  const moveService = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= selectedServices.length) return

    const updated = [...selectedServices]
    const [movedService] = updated.splice(index, 1)
    updated.splice(newIndex, 0, movedService)
    
    // Update order
    updated.forEach((service, i) => {
      service.order = i
    })
    setSelectedServices(updated)
  }

  // Calculate package pricing
  const calculatePackagePrice = () => {
    let originalTotal = 0
    let discountedTotal = 0

    selectedServices.forEach(selected => {
      const price = parseFloat(selected.service?.price || "0")
      const quantity = selected.quantity
      const discount = selected.discountPercentage / 100

      const itemTotal = price * quantity
      originalTotal += itemTotal
      discountedTotal += itemTotal * (1 - discount)
    })

    const packagePrice = parseFloat(formState.price || "0")
    const savingsAmount = discountedTotal - packagePrice
    const savingsPercentage = discountedTotal > 0 
      ? ((savingsAmount / discountedTotal) * 100).toFixed(1)
      : "0"

    return {
      originalTotal: originalTotal.toFixed(2),
      discountedTotal: discountedTotal.toFixed(2),
      packagePrice: packagePrice.toFixed(2),
      savingsAmount: savingsAmount.toFixed(2),
      savingsPercentage
    }
  }

  const pricing = calculatePackagePrice()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Package Builder</h2>
        <p className="text-muted-foreground">
          Select services to include in your package. You can offer individual discounts and set quantities for each service.
        </p>
      </div>

      {/* Package Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Package Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-pricing" className="text-sm">Show Pricing</Label>
              <Switch
                id="show-pricing"
                checked={showPricing}
                onCheckedChange={setShowPricing}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedServices.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Services Included</p>
                  <p className="text-2xl font-semibold">{selectedServices.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-semibold">
                    {selectedServices.reduce((sum, s) => sum + s.quantity, 0)}
                  </p>
                </div>
                {showPricing && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Original Value</p>
                      <p className="text-2xl font-semibold">${pricing.originalTotal}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Your Price</p>
                      <p className="text-2xl font-semibold text-primary">
                        ${formState.price || "0"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {showPricing && parseFloat(pricing.savingsAmount) > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Customers save ${pricing.savingsAmount} ({pricing.savingsPercentage}%)
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No services added yet. Search and add services below.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="selected" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="selected">
            Selected Services ({selectedServices.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available Services ({services.length})
          </TabsTrigger>
        </TabsList>

        {/* Selected Services Tab */}
        <TabsContent value="selected" className="space-y-4">
          {selectedServices.length > 0 ? (
            <div className="space-y-4">
              {selectedServices.map((selected, index) => (
                <Card key={selected.serviceId}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {selected.service?.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {selected.service?.service_type_display}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {selected.service?.duration_minutes} min
                          </Badge>
                          {showPricing && (
                            <Badge variant="outline">
                              <DollarSign className="mr-1 h-3 w-3" />
                              {selected.service?.price}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveService(index, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveService(index, 'down')}
                          disabled={index === selectedServices.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeService(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={selected.quantity}
                          onChange={(e) => updateService(index, { 
                            quantity: parseInt(e.target.value) || 1 
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`discount-${index}`}>
                          Discount: {selected.discountPercentage}%
                        </Label>
                        <Slider
                          id={`discount-${index}`}
                          min={0}
                          max={50}
                          step={5}
                          value={[selected.discountPercentage]}
                          onValueChange={(value) => updateService(index, { 
                            discountPercentage: value[0] 
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`required-${index}`}
                            checked={selected.isRequired !== false}
                            onCheckedChange={(checked) => updateService(index, { 
                              isRequired: checked 
                            })}
                          />
                          <Label 
                            htmlFor={`required-${index}`} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            Required
                          </Label>
                        </div>
                      </div>
                    </div>

                    {showPricing && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                        <span>Item Subtotal:</span>
                        <div className="text-right">
                          <div>
                            {selected.quantity} × ${selected.service?.price} = 
                            <span className="font-semibold ml-1">
                              ${(selected.quantity * parseFloat(selected.service?.price || "0")).toFixed(2)}
                            </span>
                          </div>
                          {selected.discountPercentage > 0 && (
                            <div className="text-muted-foreground">
                              After {selected.discountPercentage}% discount: 
                              <span className="font-semibold text-foreground ml-1">
                                ${(selected.quantity * parseFloat(selected.service?.price || "0") * (1 - selected.discountPercentage / 100)).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Services Selected</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Switch to "Available Services" to add services to your package
                </p>
              </CardContent>
            </Card>
          )}

          {errors.selectedServices && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.selectedServices}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Available Services Tab */}
        <TabsContent value="available" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading services...</p>
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.find(s => s.serviceId === service.id)
                return (
                  <Card 
                    key={service.id} 
                    className={`relative transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {service.short_description}
                          </CardDescription>
                        </div>
                        {isSelected && (
                          <Badge className="bg-primary">
                            <Check className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {service.service_type_display}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {service.duration_minutes} min
                          </Badge>
                          {showPricing && (
                            <Badge variant="outline">
                              <DollarSign className="mr-1 h-3 w-3" />
                              {service.price}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addService(service)}
                          disabled={!!isSelected}
                        >
                          {isSelected ? "Added" : "Add"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "No services found matching your search" 
                    : "No services available. Create some services first."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Package Building Tips:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Combine complementary services for a complete experience</li>
            <li>• Offer 10-30% discount to incentivize package purchases</li>
            <li>• Mark essential services as "Required" for clarity</li>
            <li>• Order services logically (e.g., consultation first, then treatments)</li>
            <li>• Consider creating themed packages (e.g., "Stress Relief", "New Client Special")</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}