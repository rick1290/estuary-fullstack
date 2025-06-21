"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Loader2, CreditCard, Calendar, AlertCircle } from "lucide-react"
import { subscriptionsCurrentRetrieveOptions, subscriptionsCancelCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

export function CurrentSubscription() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: subscription, isLoading } = useQuery(subscriptionsCurrentRetrieveOptions())

  const cancelSubscriptionMutation = useMutation({
    ...subscriptionsCancelCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will remain active until the end of the billing period.",
      })
      queryClient.invalidateQueries({ queryKey: ["payments", "subscriptions"] })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to cancel subscription",
        variant: "destructive",
      })
    },
  })

  const handleCancelSubscription = () => {
    if (subscription?.id) {
      cancelSubscriptionMutation.mutate({ id: subscription.id })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            Subscribe to a plan to unlock practitioner features and start accepting bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>View Subscription Plans</Button>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Active" },
      canceled: { variant: "secondary", label: "Cancelled" },
      past_due: { variant: "destructive", label: "Past Due" },
      trialing: { variant: "outline", label: "Trial" },
      unpaid: { variant: "destructive", label: "Unpaid" },
    }

    const config = statusConfig[status] || { variant: "secondary", label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Manage your practitioner subscription</CardDescription>
          </div>
          {getStatusBadge(subscription.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold">{subscription.tier?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Billing Period</p>
            <p className="text-lg font-semibold">{subscription.is_annual ? "Annual" : "Monthly"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Started</p>
            <p className="text-lg font-semibold">
              {format(new Date(subscription.start_date), "MMM d, yyyy")}
            </p>
          </div>
          {subscription.end_date && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ends</p>
              <p className="text-lg font-semibold">
                {format(new Date(subscription.end_date), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </div>

        {subscription.tier?.features && subscription.tier.features.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Features</p>
            <ul className="space-y-1">
              {subscription.tier.features.map((feature: string, index: number) => (
                <li key={index} className="text-sm">
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {subscription.status === "past_due" && (
          <div className="flex items-center space-x-2 rounded-md bg-destructive/10 p-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm">
              Your subscription payment is past due. Please update your payment method to continue
              service.
            </p>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <Button variant="outline" size="sm">
            <CreditCard className="mr-2 h-4 w-4" />
            Update Payment Method
          </Button>
          {subscription.status === "active" && subscription.auto_renew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={cancelSubscriptionMutation.isPending}>
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will remain active until the end of the current billing period. You
                    can reactivate anytime before it expires.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelSubscription}>
                    Yes, Cancel Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  )
}