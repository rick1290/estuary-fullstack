"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

// Mock data for recent transactions
const RECENT_TRANSACTIONS = [
  {
    id: 1,
    client: "John Smith",
    service: "Mindfulness Meditation Session",
    date: "May 10, 2023",
    amount: 85.0,
    status: "completed",
  },
  {
    id: 2,
    client: "Emily Johnson",
    service: "Yoga for Beginners",
    date: "May 9, 2023",
    amount: 60.0,
    status: "completed",
  },
  {
    id: 3,
    client: "Michael Chen",
    service: "Life Coaching Session",
    date: "May 8, 2023",
    amount: 120.0,
    status: "completed",
  },
]

export default function PractitionerEarnings() {
  const [timeRange, setTimeRange] = useState("weekly")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={timeRange} onValueChange={setTimeRange} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Earnings ({timeRange})</p>
              <p className="text-3xl font-bold">$1,240</p>
              <p className="text-sm text-green-600">+8% from last {timeRange.slice(0, -2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sessions ({timeRange})</p>
              <p className="text-3xl font-bold">24</p>
              <p className="text-sm text-green-600">+12% from last {timeRange.slice(0, -2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Average Session Value</p>
              <p className="text-3xl font-bold">$51.67</p>
              <p className="text-sm text-red-600">-4% from last {timeRange.slice(0, -2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <div className="p-4 bg-muted/50">
          <h3 className="text-sm font-medium">Recent Transactions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RECENT_TRANSACTIONS.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.client}</TableCell>
                <TableCell className="max-w-[200px] truncate">{transaction.service}</TableCell>
                <TableCell>{transaction.date}</TableCell>
                <TableCell className="text-right">${transaction.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={transaction.status === "completed" ? "success" : "outline"}>
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/dashboard/practitioner/finances/transactions" className="flex items-center gap-1">
              View All Transactions
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
