"use client"

import { useState } from "react"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PayoutHistoryTable } from "@/components/dashboard/practitioner/finances/payout-history-table"
import { PayoutDetails } from "@/components/dashboard/practitioner/finances/payout-details"
import { WithdrawalRequestForm } from "@/components/dashboard/practitioner/finances/withdrawal-request-form"
import { PendingPayouts } from "@/components/dashboard/practitioner/finances/pending-payouts"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { practitionersBalanceRetrieveOptions, practitionersPayoutsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { practitionersRequestPayoutCreate } from "@/src/client/sdk.gen"
import type { Payout } from "@/types/payout"
import { toast } from "sonner"
import { DollarSign } from "lucide-react"

export default function PayoutsClient() {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false)
  const [isPayoutDetailsOpen, setIsPayoutDetailsOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const queryClient = useQueryClient()

  // Fetch balance data
  const { data: balanceData, isLoading: balanceLoading } = useQuery(practitionersBalanceRetrieveOptions())

  // Fetch payouts data
  const { data: payoutsData, isLoading: payoutsLoading } = useQuery(
    practitionersPayoutsRetrieveOptions({
      query: {
        ...(statusFilter !== "all" && { status: statusFilter }),
        ordering: "-created_at",
      },
    })
  )

  // Request payout mutation
  const requestPayoutMutation = useMutation({
    mutationFn: (amount: number) => 
      practitionersRequestPayoutCreate({
        requestBody: {
          amount_cents: Math.round(amount * 100),
          payment_method: "bank_transfer",
        },
      }),
    onSuccess: () => {
      toast.success("Payout request submitted successfully")
      setIsWithdrawalDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["practitioners", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["practitioners", "payouts"] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to request payout")
    },
  })

  const handleWithdrawalSubmit = (amount: number) => {
    requestPayoutMutation.mutate(amount)
  }

  // Transform API payouts to match component expectations
  const transformedPayouts = payoutsData?.results?.map((payout) => ({
    id: payout.id.toString(),
    date: new Date(payout.created_at),
    amount: payout.amount / 100,
    status: payout.status as "pending" | "processing" | "completed" | "failed",
    method: payout.payment_method || "bank_transfer",
    reference: payout.stripe_transfer_id || `PAY-${payout.id}`,
    fee: payout.platform_fee ? payout.platform_fee / 100 : 0,
    netAmount: (payout.amount - (payout.platform_fee || 0)) / 100,
  })) || []

  const pendingPayouts = transformedPayouts.filter((p) => p.status === "pending" || p.status === "processing")

  const handlePayoutClick = (payout: Payout) => {
    setSelectedPayout(payout)
    setIsPayoutDetailsOpen(true)
  }

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Payouts"
        helpLink="/help/practitioner/payouts"
        action={{
          label: "Financial Overview",
          icon: <DollarSign className="h-4 w-4" />,
          href: "/dashboard/practitioner/finances/overview"
        }}
      />

      <div className="px-6 py-4 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row">
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Available Balance</CardTitle>
              <CardDescription>Amount available for withdrawal</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-10 w-40" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-primary">
                    ${((balanceData?.available_balance || 0) / 100).toFixed(2)}
                  </p>
                  <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={(balanceData?.available_balance || 0) < 5000}
                        title={(balanceData?.available_balance || 0) < 5000 ? "Minimum balance of $50 required" : ""}
                      >
                        Request Withdrawal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Request Withdrawal</DialogTitle>
                        <DialogDescription>
                          Enter the amount you would like to withdraw. Minimum withdrawal amount is $50.
                        </DialogDescription>
                      </DialogHeader>
                      <WithdrawalRequestForm
                        availableBalance={(balanceData?.available_balance || 0) / 100}
                        onSubmit={handleWithdrawalSubmit}
                        isLoading={requestPayoutMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {pendingPayouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Pending Payouts</CardTitle>
              <CardDescription>Payouts that are currently being processed</CardDescription>
            </CardHeader>
            <CardContent>
              <PendingPayouts payouts={pendingPayouts} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Payout History</CardTitle>
            <CardDescription>View all your past payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Tabs 
                value={statusFilter} 
                onValueChange={setStatusFilter}
                className="w-full"
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <PayoutHistoryTable payouts={transformedPayouts} onPayoutClick={handlePayoutClick} />
                </TabsContent>
                <TabsContent value="completed">
                  <PayoutHistoryTable
                    payouts={transformedPayouts.filter((p) => p.status === "completed")}
                    onPayoutClick={handlePayoutClick}
                  />
                </TabsContent>
                <TabsContent value="processing">
                  <PayoutHistoryTable
                    payouts={transformedPayouts.filter((p) => p.status === "processing")}
                    onPayoutClick={handlePayoutClick}
                  />
                </TabsContent>
                <TabsContent value="failed">
                  <PayoutHistoryTable
                    payouts={transformedPayouts.filter((p) => p.status === "failed")}
                    onPayoutClick={handlePayoutClick}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {selectedPayout && (
          <Dialog open={isPayoutDetailsOpen} onOpenChange={setIsPayoutDetailsOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Payout Details</DialogTitle>
                <DialogDescription>Details for payout #{selectedPayout.id}</DialogDescription>
              </DialogHeader>
              <PayoutDetails payout={selectedPayout} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  )
}