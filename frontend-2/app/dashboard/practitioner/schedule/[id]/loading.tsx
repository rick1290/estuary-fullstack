import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BookingDetailLoading() {
  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-24 ml-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-40" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>

              <Skeleton className="h-px w-full" />

              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full mt-1" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-32" />
              </div>

              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-40 mt-1" />
                        </div>
                      </div>
                      <div>
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-40" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
