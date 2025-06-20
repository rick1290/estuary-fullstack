"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, Star, CalendarCheck, DollarSign } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

// Try dynamic import to avoid potential build issues
let practitionersStatsRetrieveOptions: any = () => ({
  queryKey: ['practitionersStatsRetrieve'],
  queryFn: async () => {
    // Temporary mock data until import issue is resolved
    return {
      total_bookings: 0,
      upcoming_bookings: 0,
      total_revenue: 0,
      total_clients: 0,
      average_rating: 0
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="border-2 border-sage-200">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16 mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: "Total Bookings",
      value: statsData?.total_bookings?.value?.toString() || "0",
      change: `${statsData?.total_bookings?.change > 0 ? '+' : ''}${statsData?.total_bookings?.change || 0}%`,
      isPositive: statsData?.total_bookings?.is_positive || false,
      icon: <CalendarCheck className="h-6 w-6" />,
      color: "text-sage-600",
      bgColor: "bg-sage-100",
    },
    {
      title: "Total Revenue",
      value: statsData?.total_revenue?.value_display || "$0",
      change: `${statsData?.total_revenue?.change > 0 ? '+' : ''}${statsData?.total_revenue?.change || 0}%`,
      isPositive: statsData?.total_revenue?.is_positive || false,
      icon: <DollarSign className="h-6 w-6" />,
      color: "text-olive-600",
      bgColor: "bg-olive-100",
    },
    {
      title: "Active Clients",
      value: statsData?.active_clients?.value?.toString() || "0",
      change: `${statsData?.active_clients?.change > 0 ? '+' : ''}${statsData?.active_clients?.change || 0}%`,
      isPositive: statsData?.active_clients?.is_positive || false,
      icon: <Users className="h-6 w-6" />,
      color: "text-blush-600",
      bgColor: "bg-blush-100",
    },
    {
      title: "Average Rating",
      value: statsData?.average_rating?.value?.toString() || "0.0",
      change: `${statsData?.average_rating?.total_reviews || 0} reviews`,
      isPositive: true,
      icon: <Star className="h-6 w-6" />,
      color: "text-terracotta-600",
      bgColor: "bg-terracotta-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-2xl font-bold text-olive-900">{stat.value}</p>
                <p className="text-sm text-olive-600">{stat.title}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
            </div>
            <div className="mt-4">
              <Badge variant={stat.isPositive ? "success" : "destructive"} className="flex items-center w-fit gap-1">
                {stat.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.change}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
