"use client"

import { formatDistanceToNow } from "date-fns"
import { Users, Crown, Star, Mail, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { StreamSubscriber } from "@/types/stream-management"

interface SubscriberManagementProps {
  subscribers: StreamSubscriber[]
}

export default function SubscriberManagement({ subscribers }: SubscriberManagementProps) {
  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "premium":
        return <Crown className="h-4 w-4 text-purple-600" />
      case "entry":
        return <Star className="h-4 w-4 text-blue-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "entry":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Recent Subscribers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Subscribers
          </CardTitle>
          <CardDescription>Your newest subscribers across all tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscribers.map((subscriber) => (
              <div key={subscriber.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={subscriber.userInfo.profilePicture || "/placeholder.svg"} />
                    <AvatarFallback>
                      {subscriber.userInfo.firstName.charAt(0)}
                      {subscriber.userInfo.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {subscriber.userInfo.firstName} {subscriber.userInfo.lastName}
                      </h4>
                      <Badge variant="outline" className={getTierColor(subscriber.tier)}>
                        <span className="flex items-center gap-1">
                          {getTierIcon(subscriber.tier)}
                          {subscriber.tier}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{subscriber.userInfo.email}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {formatDistanceToNow(new Date(subscriber.startDate), { addSuffix: true })}
                      </span>
                      {subscriber.autoRenew && (
                        <Badge variant="secondary" className="text-xs">
                          Auto-renew
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscriber Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entry Tier</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">70% of total subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Tier</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">30% of total subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Monthly retention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
