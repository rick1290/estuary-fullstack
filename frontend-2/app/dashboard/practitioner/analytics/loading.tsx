import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AnalyticsLoading() {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-6">
      <Skeleton className="h-10 w-[250px] mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-8 w-[80px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-[120px]" />
              </CardContent>
            </Card>
          ))}
      </div>

      <Skeleton className="h-10 w-full max-w-[400px] mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[200px] mb-2" />
                <Skeleton className="h-4 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
