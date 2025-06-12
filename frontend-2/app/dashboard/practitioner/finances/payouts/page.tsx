"use client"

import { useState } from "react"
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
import { mockPayouts, mockPendingPayouts } from "@/lib/mock-payout-data"
import type { Payout } from "@/types/payout"

export default function PayoutsPage() {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false)
  const [isPayoutDetailsOpen, setIsPayoutDetailsOpen] = useState(false)

  const handlePayoutClick = (payout: Payout) => {
    setSelectedPayout(payout)
    setIsPayoutDetailsOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Available Balance</CardTitle>
            <CardDescription>Amount available for withdrawal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-primary">$50,767.89</p>
              <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Request Withdrawal</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Request Withdrawal</DialogTitle>
                    <DialogDescription>
                      Enter the amount you would like to withdraw and select your payment method.
                    </DialogDescription>
                  </DialogHeader>
                  <WithdrawalRequestForm
                    availableBalance={50767.89}
                    onSubmit={() => setIsWithdrawalDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {mockPendingPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Pending Payouts</CardTitle>
            <CardDescription>Payouts that are currently being processed</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingPayouts payouts={mockPendingPayouts} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Payout History</CardTitle>
          <CardDescription>View all your past payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <PayoutHistoryTable payouts={mockPayouts} onPayoutClick={handlePayoutClick} />
            </TabsContent>
            <TabsContent value="completed">
              <PayoutHistoryTable
                payouts={mockPayouts.filter((p) => p.status === "completed")}
                onPayoutClick={handlePayoutClick}
              />
            </TabsContent>
            <TabsContent value="processing">
              <PayoutHistoryTable
                payouts={mockPayouts.filter((p) => p.status === "processing")}
                onPayoutClick={handlePayoutClick}
              />
            </TabsContent>
            <TabsContent value="failed">
              <PayoutHistoryTable
                payouts={mockPayouts.filter((p) => p.status === "failed")}
                onPayoutClick={handlePayoutClick}
              />
            </TabsContent>
          </Tabs>
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
  )
}
