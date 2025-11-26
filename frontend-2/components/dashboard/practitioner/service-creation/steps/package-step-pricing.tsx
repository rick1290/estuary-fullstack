"use client"

import { useMemo, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Percent,
  DollarSign,
  Clock,
  Sparkles,
  TrendingDown,
  Lightbulb,
  Info,
  Package
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PackageSessionItem } from "./package-step-sessions"

interface PackageStepPricingProps {
  selectedSessions: PackageSessionItem[]
  discountPercentage: number
  onDiscountChange: (discount: number) => void
  finalPrice: number
  onFinalPriceChange: (price: number) => void
}

// Suggested discount tiers for tips
const DISCOUNT_SUGGESTIONS = [
  { percentage: 10, label: "Entry level", description: "Good for smaller packages" },
  { percentage: 15, label: "Recommended", description: "Sweet spot for most packages" },
  { percentage: 20, label: "High value", description: "Great for premium packages" },
]

export function PackageStepPricing({
  selectedSessions,
  discountPercentage,
  onDiscountChange,
  finalPrice,
  onFinalPriceChange
}: PackageStepPricingProps) {
  // Calculate pricing from sessions
  const pricing = useMemo(() => {
    const totalOriginalPrice = selectedSessions.reduce((sum, item) => {
      return sum + parseFloat(item.service?.price || "0")
    }, 0)

    const totalDuration = selectedSessions.reduce((sum, item) => {
      return sum + (item.service?.duration_minutes || 0)
    }, 0)

    const discountAmount = totalOriginalPrice * (discountPercentage / 100)
    const discountedPrice = totalOriginalPrice - discountAmount

    return {
      totalOriginalPrice,
      totalDuration,
      discountAmount,
      discountedPrice,
      sessionCount: selectedSessions.length
    }
  }, [selectedSessions, discountPercentage])

  // Update final price when discount changes - only if value actually changed
  useEffect(() => {
    if (finalPrice !== pricing.discountedPrice) {
      onFinalPriceChange(pricing.discountedPrice)
    }
  }, [pricing.discountedPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get color based on discount percentage
  const getDiscountColor = (discount: number) => {
    if (discount >= 20) return "text-green-600"
    if (discount >= 15) return "text-green-500"
    if (discount >= 10) return "text-primary"
    if (discount >= 5) return "text-amber-500"
    return "text-muted-foreground"
  }

  // Get badge variant based on discount
  const getDiscountBadgeVariant = (discount: number): "default" | "secondary" | "outline" => {
    if (discount >= 15) return "default"
    if (discount >= 10) return "secondary"
    return "outline"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Set Your Package Discount
        </h2>
        <p className="text-muted-foreground">
          Choose a discount to make your package an attractive value for clients.
        </p>
      </div>

      {/* Tip Alert */}
      <Alert className="border-primary/30 bg-primary/5">
        <Lightbulb className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Pricing tip:</strong> A 10-15% discount is the sweet spot for most packages.
          It provides enough savings to incentivize purchases while maintaining your session value.
        </AlertDescription>
      </Alert>

      {/* Package Contents Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Your Package Contains
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {selectedSessions.map((item, index) => (
              <Badge key={item.serviceId} variant="outline" className="text-sm">
                {index + 1}. {item.service.name}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{pricing.sessionCount} sessions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{pricing.totalDuration} minutes total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Calculator */}
      <Card className="border-2 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Package Pricing Calculator
          </CardTitle>
          <CardDescription>
            Drag the slider to set your discount percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Original Price */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Value (if booked separately)</p>
              <p className="text-2xl font-semibold">${pricing.totalOriginalPrice.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground/50" />
          </div>

          {/* Discount Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Discount Percentage</Label>
              <Badge variant={getDiscountBadgeVariant(discountPercentage)} className="text-lg px-3 py-1">
                <TrendingDown className="h-4 w-4 mr-1" />
                {discountPercentage}% off
              </Badge>
            </div>

            <div className="pt-2 pb-1">
              <Slider
                min={0}
                max={50}
                step={5}
                value={[discountPercentage]}
                onValueChange={(value) => onDiscountChange(value[0])}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
                <span>30%</span>
                <span>40%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2">
              {DISCOUNT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.percentage}
                  type="button"
                  onClick={() => onDiscountChange(suggestion.percentage)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg border transition-all",
                    discountPercentage === suggestion.percentage
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  <div className="font-medium">{suggestion.percentage}%</div>
                  <div className="text-xs text-muted-foreground">{suggestion.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Savings & Final Price */}
          <div className="grid grid-cols-2 gap-4">
            {/* Customer Savings */}
            <div className={cn(
              "p-4 rounded-lg border-2 transition-colors",
              discountPercentage > 0 ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900" : "border-border bg-muted/30"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className={cn("h-4 w-4", discountPercentage > 0 ? "text-green-600" : "text-muted-foreground")} />
                <p className="text-sm text-muted-foreground">Customer Saves</p>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                discountPercentage > 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                ${pricing.discountAmount.toFixed(2)}
              </p>
            </div>

            {/* Final Package Price */}
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Package Price</p>
              </div>
              <p className="text-2xl font-bold text-primary">
                ${pricing.discountedPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Visual Price Comparison */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price comparison</span>
              <span className={cn("font-medium", getDiscountColor(discountPercentage))}>
                {discountPercentage}% savings
              </span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              {/* Original price bar (full width) */}
              <div className="absolute inset-0 bg-muted-foreground/20" />
              {/* Discounted price bar */}
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
                style={{ width: `${100 - discountPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="line-through">${pricing.totalOriginalPrice.toFixed(2)}</span>
              <span className="font-medium text-foreground">${pricing.discountedPrice.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info about what happens next */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          This discount applies to the package as a whole. The price of <strong>${pricing.discountedPrice.toFixed(2)}</strong> will be
          shown to customers when they purchase this package. Individual sessions maintain their original pricing when booked separately.
        </AlertDescription>
      </Alert>
    </div>
  )
}
