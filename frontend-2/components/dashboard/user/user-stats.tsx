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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Sessions</h3>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.totalSessions}</p>
          <p className="text-sm text-muted-foreground mt-1">{stats.upcomingSessions} upcoming</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Favorites</h3>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.favoriteServices}</p>
          <p className="text-sm text-muted-foreground mt-1">Saved services</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Goals</h3>
          </div>
          <p className="text-3xl font-bold mt-2">
            {stats.completedGoals}/{stats.totalGoals}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Completed goals</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Wellness Score</h3>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.wellnessScore}</p>
          <div className="mt-2">
            <Progress value={stats.wellnessScore} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
