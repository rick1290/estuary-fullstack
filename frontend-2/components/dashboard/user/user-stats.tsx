"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar, Heart, Star, TrendingUp } from "lucide-react"

export default function UserStats() {
  // Mock data for user stats
  const stats = {
    totalSessions: 12,
    upcomingSessions: 3,
    favoriteServices: 5,
    completedGoals: 2,
    totalGoals: 5,
    wellnessScore: 78,
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
