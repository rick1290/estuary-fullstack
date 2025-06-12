"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, Eye, Heart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { StreamAnalytics } from "@/types/stream-management"

interface StreamAnalyticsProps {
  analytics: StreamAnalytics
}

export default function StreamAnalyticsComponent({ analytics }: StreamAnalyticsProps) {
  // Mock data for charts
  const engagementData = [
    { name: "Jan", views: 120, likes: 45, comments: 12 },
    { name: "Feb", views: 180, likes: 67, comments: 23 },
    { name: "Mar", views: 240, likes: 89, comments: 34 },
    { name: "Apr", views: 320, likes: 112, comments: 45 },
    { name: "May", views: 280, likes: 98, comments: 38 },
    { name: "Jun", views: 380, likes: 134, comments: 52 },
  ]

  const subscriberGrowth = [
    { name: "Jan", entry: 45, premium: 12 },
    { name: "Feb", entry: 52, premium: 18 },
    { name: "Mar", entry: 61, premium: 24 },
    { name: "Apr", entry: 73, premium: 29 },
    { name: "May", entry: 81, premium: 34 },
    { name: "Jun", entry: 89, premium: 38 },
  ]

  return (
    <div className="space-y-6">
      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Posts
          </CardTitle>
          <CardDescription>Your most engaging content this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topPosts.map((post, index) => (
              <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">#{index + 1}</span>
                    <h4 className="font-medium">{post.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {post.tier}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{post.content}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {post.stats.views}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {post.stats.likes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Over Time</CardTitle>
            <CardDescription>Views, likes, and comments by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="likes" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="comments" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>Entry and premium tier subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subscriberGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="entry" fill="#8884d8" />
                <Bar dataKey="premium" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
          <CardDescription>Monthly and total revenue from subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">${analytics.revenue.monthly}</div>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">${analytics.revenue.total}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${(analytics.revenue.total / analytics.totalSubscribers).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Avg. per Subscriber</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
