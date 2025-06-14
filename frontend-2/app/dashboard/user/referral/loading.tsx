import { Skeleton } from "@/components/ui/skeleton"

export default function ReferralLoading() {
  return (
    <div className="container max-w-5xl py-8">
      <Skeleton className="h-10 w-64 mb-6" />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="border rounded-lg p-6 mb-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />

            <div className="flex mb-6">
              <Skeleton className="h-10 w-full rounded-r-none" />
              <Skeleton className="h-10 w-24 rounded-l-none" />
            </div>

            <Skeleton className="h-10 w-full mb-6" />

            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-6" />
          </div>

          <div className="border rounded-lg p-6">
            <Skeleton className="h-8 w-36 mb-4" />
            <Skeleton className="h-4 w-full mb-6" />

            <div className="grid gap-6 md:grid-cols-3">
              <div className="flex flex-col items-center">
                <Skeleton className="h-16 w-16 rounded-full mb-4" />
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex flex-col items-center">
                <Skeleton className="h-16 w-16 rounded-full mb-4" />
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex flex-col items-center">
                <Skeleton className="h-16 w-16 rounded-full mb-4" />
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="border rounded-lg p-6 mb-8">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-6" />

            <div className="bg-muted p-4 rounded-md mb-4">
              <Skeleton className="h-4 w-36 mx-auto mb-2" />
              <Skeleton className="h-8 w-16 mx-auto" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
