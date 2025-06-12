"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Eye, Calendar, GraduationCap, Users, Flower } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ClientServiceHistoryProps {
  clientId: string
}

// Mock data - replace with actual API call
const mockServiceHistory = [
  {
    id: "1",
    type: "session",
    name: "Career Coaching Session",
    date: "2023-04-28T14:30:00",
    status: "completed",
    price: "$120",
    duration: 60,
    location: "Virtual",
    notes: "Discussed career transition goals",
  },
  {
    id: "2",
    type: "workshop",
    name: "Mindfulness Workshop",
    date: "2023-03-15T10:00:00",
    status: "completed",
    price: "$80",
    duration: 120,
    location: "In Person",
    notes: "Participated actively in group exercises",
  },
  {
    id: "3",
    type: "course",
    name: "Leadership Development",
    date: "2023-02-10T13:00:00",
    status: "completed",
    price: "$350",
    duration: 240,
    location: "Virtual",
    notes: "Completed all modules with excellent results",
  },
  {
    id: "4",
    type: "session",
    name: "Career Coaching Follow-up",
    date: "2023-01-20T11:30:00",
    status: "completed",
    price: "$120",
    duration: 60,
    location: "Virtual",
    notes: "Reviewed progress on action items",
  },
  {
    id: "5",
    type: "session",
    name: "Career Strategy Session",
    date: "2023-05-15T10:00:00",
    status: "upcoming",
    price: "$120",
    duration: 60,
    location: "Virtual",
    notes: "",
  },
]

export default function ClientServiceHistory({ clientId }: ClientServiceHistoryProps) {
  const [serviceHistory, setServiceHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState("all")

  useEffect(() => {
    // Simulate API call
    const fetchServiceHistory = async () => {
      setLoading(true)
      // Replace with actual API call
      setTimeout(() => {
        setServiceHistory(mockServiceHistory)
        setLoading(false)
      }, 1000)
    }

    fetchServiceHistory()
  }, [clientId])

  const getFilteredHistory = () => {
    if (tabValue === "all") return serviceHistory
    return serviceHistory.filter((item) => item.type === tabValue)
  }

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case "session":
        return <Flower className="h-4 w-4" />
      case "course":
        return <GraduationCap className="h-4 w-4" />
      case "workshop":
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "upcoming":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Upcoming
          </Badge>
        )
      case "canceled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Canceled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full mb-4" />
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-16 w-full my-2" />
        ))}
      </div>
    )
  }

  const filteredHistory = getFilteredHistory()

  return (
    <div>
      <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
        <TabsList className="grid grid-cols-4 mb-2">
          <TabsTrigger value="all">All Services</TabsTrigger>
          <TabsTrigger value="session">Sessions</TabsTrigger>
          <TabsTrigger value="course">Courses</TabsTrigger>
          <TabsTrigger value="workshop">Workshops</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-8">
          <p>No service history found</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((service) => (
                <TableRow key={service.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center">
                      <div className="mr-2 text-muted-foreground">{getServiceTypeIcon(service.type)}</div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.duration} min</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{format(new Date(service.date), "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(service.date), "h:mm a")}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(service.status)}</TableCell>
                  <TableCell>{service.price}</TableCell>
                  <TableCell>{service.location}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/practitioner/${service.type}s/${service.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
