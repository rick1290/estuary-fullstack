"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import {
  practitionerApplicationsStripeConnectStatusRetrieveOptions,
  practitionerApplicationsStripeConnectCreateCreateMutation,
  practitionerApplicationsStripeConnectRefreshCreateMutation,
  practitionerApplicationsStripeConnectDisconnectCreateMutation,
} from "@/src/client/@tanstack/react-query.gen"

export function PaymentIntegrationSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Check for success/refresh params from Stripe redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: "Success!",
        description: "Your Stripe account has been connected successfully.",
      })
      // Clean up URL
      router.replace('/dashboard/practitioner/settings')
    } else if (searchParams.get('refresh') === 'true') {
      toast({
        title: "Session Expired",
        description: "Please try connecting your account again.",
        variant: "destructive",
      })
    }
  }, [searchParams, router, toast])

  // Fetch Stripe Connect status
  const { data: connectStatus, isLoading: statusLoading, refetch } = useQuery({
    ...practitionerApplicationsStripeConnectStatusRetrieveOptions(),
  })

  // Create Stripe Connect account mutation
  const createConnectMutation = useMutation({
    ...practitionerApplicationsStripeConnectCreateCreateMutation(),
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create Stripe Connect link",
        variant: "destructive",
      })
    },
  })

  // Refresh/update Stripe Connect account mutation
  const refreshConnectMutation = useMutation({
    ...practitionerApplicationsStripeConnectRefreshCreateMutation(),
    onSuccess: (data) => {
      // Redirect to Stripe dashboard
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create Stripe Connect link",
        variant: "destructive",
      })
    },
  })

  // Disconnect Stripe Connect account mutation
  const disconnectMutation = useMutation({
    ...practitionerApplicationsStripeConnectDisconnectCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Your Stripe account has been disconnected.",
      })
      refetch()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to disconnect Stripe account",
        variant: "destructive",
      })
    },
  })

  const handleConnect = () => {
    createConnectMutation.mutate({})
  }

  const handleDisconnect = () => {
    disconnectMutation.mutate({})
  }

  const handleUpdate = () => {
    refreshConnectMutation.mutate({})
  }

  const isFullyConnected = connectStatus?.is_connected && connectStatus?.charges_enabled && connectStatus?.payouts_enabled
  const hasAccount = connectStatus?.has_stripe_account
  const needsSetup = hasAccount && (!connectStatus?.charges_enabled || !connectStatus?.payouts_enabled)
  const isLoading = createConnectMutation.isPending || refreshConnectMutation.isPending || disconnectMutation.isPending

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stripe Integration</span>
          {isFullyConnected && (
            <Badge variant="success" className="ml-2">
              Connected
            </Badge>
          )}
          {needsSetup && (
            <Badge variant="warning" className="ml-2 bg-amber-100 text-amber-800">
              Setup Incomplete
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Stripe account to receive payments from clients and manage your earnings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFullyConnected ? (
          <div className="space-y-4">
            <div className="flex items-start space-x-4 rounded-md border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Connected to Stripe</p>
                <p className="text-sm text-muted-foreground">
                  Your Stripe account is connected and ready to receive payments.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Go to Stripe Dashboard
                  </Button>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Details</AlertTitle>
              <AlertDescription>
                Connected account: <strong>{connectStatus?.stripe_account_id}</strong>
                <br />
                Charges enabled: <strong>{connectStatus?.charges_enabled ? 'Yes' : 'No'}</strong>
                <br />
                Payouts enabled: <strong>{connectStatus?.payouts_enabled ? 'Yes' : 'No'}</strong>
              </AlertDescription>
            </Alert>
          </div>
        ) : needsSetup ? (
          <div className="space-y-4">
            <Alert variant="warning" className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Setup Incomplete</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your Stripe account is connected, but additional steps are required before you can receive payments.
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Details</AlertTitle>
              <AlertDescription>
                Connected account: <strong>{connectStatus?.stripe_account_id}</strong>
                <br />
                Charges enabled: <strong>{connectStatus?.charges_enabled ? 'Yes' : 'No'}</strong>
                <br />
                Payouts enabled: <strong>{connectStatus?.payouts_enabled ? 'Yes' : 'No'}</strong>
              </AlertDescription>
            </Alert>

            {connectStatus?.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  Stripe needs additional information: {connectStatus.requirements.currently_due.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border p-4">
              <h3 className="mb-2 text-sm font-medium">Complete your setup</h3>
              <p className="text-sm text-muted-foreground">
                Click "Complete Setup" below to provide the required information to Stripe.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                You need to connect your Stripe account to receive payments from clients.
              </AlertDescription>
            </Alert>

            <div className="rounded-md border p-4">
              <h3 className="mb-2 text-sm font-medium">Why connect Stripe?</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Receive payments directly to your bank account</li>
                <li>Manage your earnings and payouts</li>
                <li>View detailed transaction history</li>
                <li>Generate tax documents</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {hasAccount ? (
          <>
            <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading} className={needsSetup ? "bg-amber-600 hover:bg-amber-700" : ""}>
              {refreshConnectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {needsSetup ? "Opening Stripe..." : "Updating..."}
                </>
              ) : (
                needsSetup ? "Complete Setup" : "Update Connection"
              )}
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading} className="w-full">
            {createConnectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Stripe Account"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
