"use client"

import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Layers,
  DollarSign,
  Clock,
  Sparkles,
  Calculator,
  TrendingDown,
  Info
} from "lucide-react"
import { servicesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

// Discount tier suggestions based on quantity
const DISCOUNT_TIERS = [
  { minSessions: 3, suggestedDiscount: 5, label: "Starter" },
  { minSessions: 5, suggestedDiscount: 10, label: "Popular" },
  { minSessions: 10, suggestedDiscount: 15, label: "Best Value" },
  { minSessions: 20, suggestedDiscount: 20, label: "Premium" },
]

interface BundleConfig {
  sessionServiceId: number | null
  sessionsIncluded: number
  suggestedPrice: number
  suggestedDiscount: number
}

interface BundleConfigStepProps {
  config: BundleConfig
  onConfigChange: (config: BundleConfig) => void
  currentPrice?: string
  onPriceChange?: (price: string) => void
  onNameSuggestion?: (name: string) => void
}

export function BundleConfigStep({
  config,
  onConfigChange,
  currentPrice,
  onPriceChange,
  onNameSuggestion
}: BundleConfigStepProps) {
  const { user } = useAuth()

  // Fetch practitioner's session-type services
  const practitionerId = user?.practitionerId
  const { data: servicesData, isLoading } = useQuery({
    ...servicesListOptions({
      query: {
        practitioner: practitionerId || undefined,
        page_size: 100,
        service_type: "session" // Only session types can be bundled
      }
    }),
    enabled: !!practitionerId
  })

  const sessionServices = servicesData?.results || []

  // Get selected service details
  const selectedService = useMemo(() => {
    return sessionServices.find(s => s.id === config.sessionServiceId)
  }, [sessionServices, config.sessionServiceId])

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedService || !config.sessionsIncluded) {
      return null
    }

    const pricePerSession = parseFloat(selectedService.price || "0")
    const regularTotal = pricePerSession * config.sessionsIncluded

    // Find suggested discount tier
    const tier = [...DISCOUNT_TIERS]
      .reverse()
      .find(t => config.sessionsIncluded >= t.minSessions) || DISCOUNT_TIERS[0]

    const suggestedDiscount = tier.suggestedDiscount
    const suggestedPrice = regularTotal * (1 - suggestedDiscount / 100)

    // Calculate actual savings based on current price
    const actualPrice = parseFloat(currentPrice || String(suggestedPrice))
    const actualSavings = regularTotal - actualPrice
    const actualDiscountPercent = regularTotal > 0
      ? ((actualSavings / regularTotal) * 100)
      : 0

    return {
      pricePerSession,
      regularTotal,
      suggestedDiscount,
      suggestedPrice,
      tier,
      actualPrice,
      actualSavings,
      actualDiscountPercent
    }
  }, [selectedService, config.sessionsIncluded, currentPrice])

  // Update suggested price when config changes
  useEffect(() => {
    if (pricing && onPriceChange && !currentPrice) {
      onConfigChange({
        ...config,
        suggestedPrice: pricing.suggestedPrice,
        suggestedDiscount: pricing.suggestedDiscount
      })
      onPriceChange(pricing.suggestedPrice.toFixed(2))
    }
  }, [pricing?.suggestedPrice])

  // Suggest name when service and count are selected
  useEffect(() => {
    if (selectedService && config.sessionsIncluded && onNameSuggestion) {
      const sessionWord = config.sessionsIncluded === 1 ? "Session" : "Sessions"
      onNameSuggestion(`${config.sessionsIncluded}-${sessionWord} ${selectedService.name} Bundle`)
    }
  }, [selectedService, config.sessionsIncluded, onNameSuggestion])

  const handleServiceChange = (serviceId: string) => {
    onConfigChange({
      ...config,
      sessionServiceId: parseInt(serviceId)
    })
  }

  const handleSessionsChange = (sessions: number) => {
    const validSessions = Math.max(2, Math.min(100, sessions))
    onConfigChange({
      ...config,
      sessionsIncluded: validSessions
    })
  }

  const applyTierDiscount = (discount: number) => {
    if (pricing && onPriceChange) {
      const newPrice = pricing.regularTotal * (1 - discount / 100)
      onPriceChange(newPrice.toFixed(2))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Configure Your Bundle
        </h2>
        <p className="text-muted-foreground">
          Select which session service to bundle and how many sessions to include.
        </p>
      </div>

      {/* No Services Warning */}
      {sessionServices.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need to create at least one session-type service before you can create a bundle.
            Bundles allow customers to pre-purchase multiple sessions at a discounted rate.
          </AlertDescription>
        </Alert>
      )}

      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Session Service</CardTitle>
          <CardDescription>
            Choose which of your session services customers will receive in this bundle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-service">Session Service *</Label>
            <Select
              value={config.sessionServiceId?.toString() || ""}
              onValueChange={handleServiceChange}
              disabled={sessionServices.length === 0}
            >
              <SelectTrigger id="session-service">
                <SelectValue placeholder="Select a session service to bundle" />
              </SelectTrigger>
              <SelectContent>
                {sessionServices.map((service) => (
                  <SelectItem key={service.id} value={String(service.id)}>
                    <div className="flex items-center gap-2">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">
                        (${service.price} • {service.duration_minutes} min)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedService && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-medium">{selectedService.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedService.short_description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <Badge variant="outline">
                      <DollarSign className="mr-1 h-3 w-3" />
                      ${selectedService.price}/session
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      {selectedService.duration_minutes} min
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Count */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Number of Sessions</CardTitle>
          <CardDescription>
            How many sessions should customers receive in this bundle?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessions-count">Sessions Included *</Label>
            <Input
              id="sessions-count"
              type="number"
              min={2}
              max={100}
              value={config.sessionsIncluded || ""}
              onChange={(e) => handleSessionsChange(parseInt(e.target.value) || 2)}
              placeholder="e.g., 5, 10, 20"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 2 sessions. Popular options: 5, 10, or 20 sessions.
            </p>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2">
            {[3, 5, 10, 20].map((count) => {
              const tier = DISCOUNT_TIERS.find(t => t.minSessions === count)
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSessionsChange(count)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                    config.sessionsIncluded === count
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {count} Sessions
                  {tier && (
                    <span className="ml-1 text-xs opacity-70">
                      ({tier.suggestedDiscount}% off)
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Calculator */}
      {pricing && selectedService && config.sessionsIncluded >= 2 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Pricing Calculator
            </CardTitle>
            <CardDescription>
              Review pricing and apply discount suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pricing Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Regular price per session</span>
                <span>${pricing.pricePerSession.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  × {config.sessionsIncluded} sessions
                </span>
                <span className="line-through text-muted-foreground">
                  ${pricing.regularTotal.toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Bundle Price</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentPrice || pricing.suggestedPrice.toFixed(2)}
                      onChange={(e) => onPriceChange?.(e.target.value)}
                      className="w-28 text-right font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Display */}
            {pricing.actualSavings > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Customers save ${pricing.actualSavings.toFixed(2)} ({pricing.actualDiscountPercent.toFixed(0)}% off)
                  </p>
                </div>
              </div>
            )}

            {/* Discount Tier Suggestions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Suggested Discount Tiers
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DISCOUNT_TIERS.filter(tier => config.sessionsIncluded >= tier.minSessions).map((tier) => {
                  const tierPrice = pricing.regularTotal * (1 - tier.suggestedDiscount / 100)
                  const isSelected = Math.abs(parseFloat(currentPrice || "0") - tierPrice) < 0.01
                  return (
                    <button
                      key={tier.minSessions}
                      type="button"
                      onClick={() => applyTierDiscount(tier.suggestedDiscount)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-xs text-muted-foreground">{tier.label}</div>
                      <div className="font-semibold">{tier.suggestedDiscount}% off</div>
                      <div className="text-sm text-muted-foreground">
                        ${tierPrice.toFixed(2)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Bundle Tips:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 10-15% discount is typical for 5-session bundles</li>
            <li>• Larger bundles (10+) can offer 15-20% to encourage commitment</li>
            <li>• Bundles are great for clients who want ongoing support</li>
            <li>• Sessions don't expire by default (you can set validity in advanced settings)</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
