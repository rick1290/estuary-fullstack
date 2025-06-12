import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"

export default function RescheduleBookingLoading() {
  return (
    <UserDashboardLayout title="Reschedule Booking">
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" className="flex items-center gap-2 mb-4 pl-0" disabled>
          <ArrowLeft className="h-4 w-4" />
          Back to Booking Details
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main scheduling area */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Current booking info */}
                <div className="bg-muted p-4 rounded-md">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>

                {/* Calendar skeleton */}
                <div>
                  <Skeleton className="h-6 w-1/4 mb-4" />
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-1">
                      {Array(7)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="grid grid-cols-7 gap-1">
                          {Array(7)
                            .fill(0)
                            .map((_, j) => (
                              <Skeleton key={j} className="h-10 w-full rounded-md" />
                            ))}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Time slots skeleton */}
                <div>
                  <Skeleton className="h-6 w-1/4 mb-4" />
                  <div className="grid grid-cols-3 gap-3">
                    {Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t pt-6">
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar skeleton */}
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>

                <Skeleton className="h-px w-full" />

                <div className="space-y-3">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                </div>

                <Skeleton className="h-px w-full" />

                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
