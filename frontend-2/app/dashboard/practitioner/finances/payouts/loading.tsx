import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PayoutsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Available Balance</CardTitle>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Pending Payouts</CardTitle>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Payout History</CardTitle>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
