import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"

export default function BookingDetailsLoading() {
  return (
    <UserDashboardLayout title="Booking Details">
      <div className="space-y-6">
        {/* Back button skeleton */}
        <Skeleton className="h-10 w-32" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main booking details skeleton */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                </div>

                <Skeleton className="h-px w-full" />

                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>

              <CardFooter className="flex justify-between gap-3 border-t pt-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-40" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardFooter>
            </Card>

            {/* Action buttons skeleton */}
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Practitioner info skeleton */}
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />

                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
