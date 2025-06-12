"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, Star, CalendarCheck, DollarSign } from "lucide-react"

export default function PractitionerStats() {
  // Mock data for stats
  const stats = [
    {
      title: "Total Bookings",
      value: "124",
      change: "+12%",
      isPositive: true,
      icon: <CalendarCheck className="h-6 w-6" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Revenue",
      value: "$4,285",
      change: "+8%",
      isPositive: true,
      icon: <DollarSign className="h-6 w-6" />,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Active Clients",
      value: "48",
      change: "+5%",
      isPositive: true,
      icon: <Users className="h-6 w-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Average Rating",
      value: "4.8",
      change: "-0.1",
      isPositive: false,
      icon: <Star className="h-6 w-6" />,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
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
