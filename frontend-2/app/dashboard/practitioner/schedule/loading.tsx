import { Skeleton } from "@/components/ui/skeleton"

export default function ScheduleLoading() {
  return (
    <div className="w-full px-6 py-4 space-y-4">
      <Skeleton className="h-10 w-[200px] mb-6" />

      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-[280px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[140px]" />
            </div>
            <Skeleton className="h-6 w-[80px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
