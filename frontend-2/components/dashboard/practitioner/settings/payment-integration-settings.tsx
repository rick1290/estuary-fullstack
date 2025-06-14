"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PaymentIntegrationSettings() {
  const [isConnected, setIsConnected] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsConnected(true)
      setIsLoading(false)
    }, 1500)
  }

  const handleDisconnect = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsConnected(false)
      setIsLoading(false)
    }, 1500)
  }

  const handleUpdate = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stripe Integration</span>
          {isConnected && (
            <Badge variant="success" className="ml-2">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Stripe account to receive payments from clients and manage your earnings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
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
                Connected account: <strong>acct_1N9XYZKJn8U9WXYZ</strong>
                <br />
                Last updated: <strong>May 10, 2025</strong>
              </AlertDescription>
            </Alert>
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
        {isConnected ? (
          <>
            <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Connection"
              )}
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
