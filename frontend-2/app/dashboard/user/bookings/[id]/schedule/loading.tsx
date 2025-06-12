import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"

export default function ScheduleBookingLoading() {
  return (
    <UserDashboardLayout title="Schedule Booking">
      <div className="space-y-6">
        {/* Back button skeleton */}
        <Skeleton className="h-9 w-32" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main scheduling area skeleton */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Calendar skeleton */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={`weekday-${i}`} className="h-6 w-full" />
                      ))}
                    </div>
                    {Array.from({ length: 5 }).map((_, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 7 }).map((_, dayIndex) => (
                          <Skeleton key={`day-${weekIndex}-${dayIndex}`} className="h-10 w-full rounded-md" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time slots skeleton */}
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={`time-${i}`} className="h-9 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar skeleton */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>

                <Skeleton className="h-px w-full" />

                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`detail-${i}`} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 mt-0.5" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  ))}
                </div>

                <Skeleton className="h-px w-full" />

                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
