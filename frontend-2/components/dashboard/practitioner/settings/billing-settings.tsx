"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, CreditCard, RefreshCw, Zap } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BillingHistoryDialog } from "./billing-history-dialog"

// Subscription plan types
interface PlanFeature {
  name: string
  included: boolean
}

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  billingPeriod: "monthly" | "yearly"
  description: string
  features: PlanFeature[]
  isCurrent?: boolean
  isPopular?: boolean
}

export function BillingSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [currentPlan, setCurrentPlan] = useState<string>("professional")
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isBillingHistoryOpen, setIsBillingHistoryOpen] = useState(false)

  // Mock subscription data
  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: "basic",
      name: "Basic",
      price: billingPeriod === "monthly" ? 29 : 290,
      billingPeriod,
      description: "Essential features for new practitioners",
      features: [
        { name: "Up to 5 services", included: true },
        { name: "Basic analytics", included: true },
        { name: "Standard support", included: true },
        { name: "Client messaging", included: true },
        { name: "Calendar integration", included: true },
        { name: "Featured listing", included: false },
        { name: "Priority search placement", included: false },
        { name: "Advanced analytics", included: false },
        { name: "Priority support", included: false },
      ],
      isCurrent: currentPlan === "basic",
    },
    {
      id: "professional",
      name: "Professional",
      price: billingPeriod === "monthly" ? 79 : 790,
      billingPeriod,
      description: "Perfect for established practitioners",
      features: [
        { name: "Unlimited services", included: true },
        { name: "Basic analytics", included: true },
        { name: "Standard support", included: true },
        { name: "Client messaging", included: true },
        { name: "Calendar integration", included: true },
        { name: "Featured listing", included: true },
        { name: "Priority search placement", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Priority support", included: false },
      ],
      isCurrent: currentPlan === "professional",
      isPopular: true,
    },
    {
      id: "premium",
      name: "Premium",
      price: billingPeriod === "monthly" ? 149 : 1490,
      billingPeriod,
      description: "For practitioners who want it all",
      features: [
        { name: "Unlimited services", included: true },
        { name: "Basic analytics", included: true },
        { name: "Standard support", included: true },
        { name: "Client messaging", included: true },
        { name: "Calendar integration", included: true },
        { name: "Featured listing", included: true },
        { name: "Priority search placement", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Priority support", included: true },
      ],
      isCurrent: currentPlan === "premium",
    },
  ]

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId)
    setIsUpgradeDialogOpen(true)
  }

  const confirmUpgrade = () => {
    if (!selectedPlan) return

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setCurrentPlan(selectedPlan)
      setIsLoading(false)
      setIsUpgradeDialogOpen(false)
    }, 1500)
  }

  const getCurrentPlan = () => {
    return subscriptionPlans.find((plan) => plan.id === currentPlan)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Subscription</span>
            <Badge variant="outline" className="ml-2">
              {billingPeriod === "monthly" ? "Monthly" : "Annual"}
            </Badge>
          </CardTitle>
          <CardDescription>Manage your subscription plan and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-4 rounded-md border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">{getCurrentPlan()?.name} Plan</p>
                <Badge variant="secondary">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{getCurrentPlan()?.description}</p>
              <div className="pt-2">
                <p className="text-sm">
                  <span className="font-medium text-lg">${getCurrentPlan()?.price}</span>
                  <span className="text-muted-foreground">/{billingPeriod === "monthly" ? "month" : "year"}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Next billing date: June 10, 2025</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border p-1 text-sm">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => setBillingPeriod("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === "yearly" ? "default" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => setBillingPeriod("yearly")}
              >
                Yearly
                <Badge variant="outline" className="ml-1 rounded-full px-2 py-0 text-xs">
                  Save 15%
                </Badge>
              </Button>
            </div>
          </div>

          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Payment Method</AlertTitle>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <p>Visa ending in 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/2026</p>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={() => setIsBillingHistoryOpen(true)}>
            View Billing History
          </Button>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10">
            Cancel Subscription
          </Button>
        </CardFooter>
      </Card>

      <h3 className="text-lg font-medium mt-8 mb-4">Available Plans</h3>

      <div className="grid gap-6 md:grid-cols-3">
        {subscriptionPlans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.isPopular ? "border-primary" : ""}`}>
            {plan.isPopular && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.billingPeriod === "monthly" ? "month" : "year"}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    {feature.included ? (
                      <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground"}>{feature.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.isCurrent ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {currentPlan === "premium" && plan.id !== "premium" ? "Downgrade" : "Upgrade"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentPlan === "premium" && selectedPlan !== "premium" ? "Confirm Downgrade" : "Confirm Upgrade"}
            </DialogTitle>
            <DialogDescription>
              {currentPlan === "premium" && selectedPlan !== "premium"
                ? "Are you sure you want to downgrade your subscription? You'll lose access to premium features."
                : "You're about to upgrade your subscription plan. This will be effective immediately."}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="py-4">
              <div className="rounded-md border p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">New Plan:</h4>
                  <Badge>{subscriptionPlans.find((p) => p.id === selectedPlan)?.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {subscriptionPlans.find((p) => p.id === selectedPlan)?.description}
                </p>
                <div className="text-sm">
                  <span className="font-medium">${subscriptionPlans.find((p) => p.id === selectedPlan)?.price}</span>
                  <span className="text-muted-foreground">/{billingPeriod === "monthly" ? "month" : "year"}</span>
                </div>
              </div>

              <RadioGroup defaultValue="credit-card" className="space-y-3">
                <div className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="credit-card" id="credit-card" />
                  <Label htmlFor="credit-card" className="flex-1">
                    Credit Card ending in 4242
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="new-card" id="new-card" />
                  <Label htmlFor="new-card" className="flex-1">
                    Use a new payment method
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpgrade} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : currentPlan === "premium" && selectedPlan !== "premium" ? (
                "Confirm Downgrade"
              ) : (
                "Confirm Upgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BillingHistoryDialog open={isBillingHistoryOpen} onOpenChange={setIsBillingHistoryOpen} />
    </div>
  )
}
