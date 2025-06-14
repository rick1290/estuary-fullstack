import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Payout } from "@/types/payout"
import { formatCurrency } from "@/lib/utils"

interface PendingPayoutsProps {
  payouts: Payout[]
}

export function PendingPayouts({ payouts }: PendingPayoutsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getProgressValue = (payout: Payout) => {
    switch (payout.status) {
      case "processing":
        return 50
      case "completed":
        return 100
      case "failed":
        return 100
      default:
        return 25
    }
  }

  if (payouts.length === 0) {
    return (
      <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">No pending payouts</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {payouts.map((payout) => (
        <Card key={payout.id} className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-lg font-bold">{formatCurrency(payout.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requested</p>
              <p className="font-medium">{formatDate(payout.requestedDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{payout.status}</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={getProgressValue(payout)} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {payout.status === "processing"
                ? "Your payout is being processed and should be completed within 1-3 business days."
                : "Your payout has been initiated and is awaiting processing."}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}
