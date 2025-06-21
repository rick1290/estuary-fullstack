"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Calendar, Heart, Star, TrendingUp, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { userStatsOptions } from "@/src/client/@tanstack/react-query.gen"

export default function UserStats() {
  const { data: statsData, isLoading, error, refetch } = useQuery({
    ...userStatsOptions(),
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Handle error state
  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Failed to load your stats. 
          <Button 
            variant="link" 
            className="text-red-600 p-0 h-auto text-sm ml-1" 
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-2 border-sage-200">
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = {
    totalSessions: statsData?.total_bookings || 0,
    upcomingSessions: statsData?.upcoming_bookings || 0,
    favoriteServices: statsData?.favorite_practitioners || 0,
    completedGoals: statsData?.completed_bookings || 0,
    totalGoals: statsData?.total_bookings || 0,
    wellnessScore: statsData?.wellness_score || 0,
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-sage-50 to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-sage-600/10">
              <Calendar className="h-5 w-5 text-sage-600" />
            </div>
            <h3 className="font-medium text-olive-900">Sessions</h3>
          </div>
          <p className="text-3xl font-bold mt-2 text-olive-900">{stats.totalSessions}</p>
          <p className="text-sm text-olive-600 mt-1">{stats.upcomingSessions} upcoming</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-terracotta-200 hover:border-terracotta-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-terracotta-50 to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-terracotta-600/10">
              <Heart className="h-5 w-5 text-terracotta-600" />
            </div>
            <h3 className="font-medium text-olive-900">Favorites</h3>
          </div>
          <p className="text-3xl font-bold mt-2 text-olive-900">{stats.favoriteServices}</p>
          <p className="text-sm text-olive-600 mt-1">Saved services</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-blush-200 hover:border-blush-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-blush-50 to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-blush-600/10">
              <Star className="h-5 w-5 text-blush-600" />
            </div>
            <h3 className="font-medium text-olive-900">Goals</h3>
          </div>
          <p className="text-3xl font-bold mt-2 text-olive-900">
            {stats.completedGoals}/{stats.totalGoals}
          </p>
          <p className="text-sm text-olive-600 mt-1">Completed goals</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-olive-200 hover:border-olive-300 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-olive-50 to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-olive-600/10">
              <TrendingUp className="h-5 w-5 text-olive-600" />
            </div>
            <h3 className="font-medium text-olive-900">Wellness Score</h3>
          </div>
          <p className="text-3xl font-bold mt-2 text-olive-900">{stats.wellnessScore}</p>
          <div className="mt-3">
            <Progress value={stats.wellnessScore} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
