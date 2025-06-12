import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function EarningsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="mt-1 h-3 w-32" />
                </CardContent>
              </Card>
            ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-[300px] w-full" />
              <div className="space-y-4">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
