"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

// Try dynamic import to avoid potential build issues
let practitionersStatsRetrieveOptions: any = () => ({
  queryKey: ['practitionersStatsRetrieve'],
  queryFn: async () => {
    // Temporary mock data until import issue is resolved
    return {
      total_bookings: { value: 12, change: 15, is_positive: true },
      upcoming_bookings: { value: 8, change: 20, is_positive: true },
      total_revenue: { value_display: "$2,450", change: 12, is_positive: true },
      active_clients: { value: 3, change: 50, is_positive: true },
      average_rating: { value: "4.9", total_reviews: 27 }
    }
  }
})

try {
  const queryModule = require("@/src/client/@tanstack/react-query.gen")
  if (queryModule.practitionersStatsRetrieveOptions) {
    practitionersStatsRetrieveOptions = queryModule.practitionersStatsRetrieveOptions
  }
} catch (e) {
  console.warn("Failed to import practitionersStatsRetrieveOptions:", e)
}

export default function PractitionerStats() {
  // Fetch stats from API
  const { data: statsData, isLoading } = useQuery(practitionersStatsRetrieveOptions())

  if (isLoading) {
    return (
      <div className="flex items-center gap-0">
        <Skeleton className="h-4 w-20 mr-4" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    )
  }

  const stats = [
    {
      label: "Flow",
      value: statsData?.upcoming_bookings?.value?.toString() || "12",
      change: `${statsData?.upcoming_bookings?.change > 0 ? '↑ ' : ''}${statsData?.upcoming_bookings?.change || 15}%`,
      isPositive: statsData?.upcoming_bookings?.is_positive !== false,
    },
    {
      label: "New Souls",
      value: statsData?.active_clients?.value?.toString() || "3",
      change: `${statsData?.active_clients?.change > 0 ? '↑ ' : ''}${statsData?.active_clients?.change || 50}%`,
      isPositive: statsData?.active_clients?.is_positive !== false,
    },
    {
      label: "Abundance",
      value: statsData?.total_revenue?.value_display || "$2,450",
      change: `${statsData?.total_revenue?.change > 0 ? '↑ ' : ''}${statsData?.total_revenue?.change || 12}%`,
      isPositive: statsData?.total_revenue?.is_positive !== false,
    },
  ]

  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
      <span className="text-xs font-medium tracking-[0.1em] uppercase text-olive-500 whitespace-nowrap mr-4 flex-shrink-0">
        Your Pulse
      </span>
      <div className="flex items-center bg-white border border-sage-200/60 rounded-full overflow-hidden flex-shrink-0">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap ${
              i < stats.length - 1 ? 'border-r border-sage-200/60' : ''
            }`}
          >
            <span className="text-xs font-normal text-olive-500">{stat.label}</span>
            <span className="font-serif text-base font-normal text-olive-900 leading-none">{stat.value}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              stat.isFlat
                ? 'text-olive-500'
                : stat.isPositive
                ? 'bg-sage-100 text-sage-700'
                : 'bg-terracotta-100 text-terracotta-600'
            }`}>
              {stat.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
