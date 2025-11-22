"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Calendar, Heart, Star, TrendingUp, AlertCircle, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { userStatsOptions, creditsBalanceRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"

export default function UserStats() {
  const { data: statsData, isLoading: statsLoading, error: statsError, refetch } = useQuery({
    ...userStatsOptions(),
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
  const { data: creditBalance, isLoading: creditLoading } = useQuery({
    ...creditsBalanceRetrieveOptions(),
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
  const isLoading = statsLoading || creditLoading
  const error = statsError

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border border-sage-200">
            <CardContent className="p-3">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-12" />
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
    creditBalance: creditBalance?.balance || 0,
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Card className="border border-sage-200 hover:border-sage-300 transition-all hover:shadow-sm bg-gradient-to-br from-sage-50/50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-olive-600">Sessions</span>
            <Calendar className="h-4 w-4 text-sage-500" />
          </div>
          <p className="text-2xl font-bold text-olive-900">{stats.totalSessions}</p>
          <p className="text-xs text-muted-foreground">{stats.upcomingSessions} upcoming</p>
        </CardContent>
      </Card>

      <Card className="border border-terracotta-200 hover:border-terracotta-300 transition-all hover:shadow-sm bg-gradient-to-br from-terracotta-50/50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-olive-600">Favorites</span>
            <Heart className="h-4 w-4 text-terracotta-500" />
          </div>
          <p className="text-2xl font-bold text-olive-900">{stats.favoriteServices}</p>
          <p className="text-xs text-muted-foreground">Saved</p>
        </CardContent>
      </Card>

      <Card className="border border-blush-200 hover:border-blush-300 transition-all hover:shadow-sm bg-gradient-to-br from-blush-50/50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-olive-600">Goals</span>
            <Star className="h-4 w-4 text-blush-500" />
          </div>
          <p className="text-2xl font-bold text-olive-900">{stats.completedGoals}/{stats.totalGoals}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent>
      </Card>

      <Card className="border border-olive-200 hover:border-olive-300 transition-all hover:shadow-sm bg-gradient-to-br from-olive-50/50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-olive-600">Wellness</span>
            <TrendingUp className="h-4 w-4 text-olive-500" />
          </div>
          <p className="text-2xl font-bold text-olive-900">{stats.wellnessScore}</p>
          <Progress value={stats.wellnessScore} className="h-1.5 mt-1" />
        </CardContent>
      </Card>

      <Card className="border border-purple-200 hover:border-purple-300 transition-all hover:shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-olive-600">Credits</span>
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-olive-900">${stats.creditBalance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Balance</p>
        </CardContent>
      </Card>
    </div>
  )
}
