"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Star, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import ClientFilters, { type ClientFilters as ClientFiltersType } from "./client-filters"

// Update the mock data to include more fields for sorting
const mockClients = [
  {
    id: "1",
    name: "Emma Johnson",
    email: "emma.johnson@example.com",
    profilePicture: "/practitioner-1.jpg",
    totalBookings: 12,
    totalSpent: "$1,240",
    totalSpentNumeric: 1240,
    nextBooking: "2023-05-15T10:00:00",
    lastBooking: "2023-04-28T14:30:00",
    isFavorite: true,
    sessionTypes: ["Coaching", "Workshop"],
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael.chen@example.com",
    profilePicture: "/practitioner-2.jpg",
    totalBookings: 5,
    totalSpent: "$550",
    totalSpentNumeric: 550,
    nextBooking: null,
    lastBooking: "2023-04-10T11:00:00",
    isFavorite: false,
    sessionTypes: ["Therapy"],
  },
  {
    id: "3",
    name: "Sophia Rodriguez",
    email: "sophia.rodriguez@example.com",
    profilePicture: "/practitioner-3.jpg",
    totalBookings: 8,
    totalSpent: "$920",
    totalSpentNumeric: 920,
    nextBooking: "2023-05-20T15:00:00",
    lastBooking: "2023-04-25T09:30:00",
    isFavorite: true,
    sessionTypes: ["Coaching", "Course"],
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james.wilson@example.com",
    profilePicture: "/practitioner-4.jpg",
    totalBookings: 3,
    totalSpent: "$330",
    totalSpentNumeric: 330,
    nextBooking: null,
    lastBooking: "2023-03-15T13:00:00",
    isFavorite: false,
    sessionTypes: ["Workshop"],
  },
  {
    id: "5",
    name: "Olivia Brown",
    email: "olivia.brown@example.com",
    profilePicture: null,
    totalBookings: 1,
    totalSpent: "$110",
    totalSpentNumeric: 110,
    nextBooking: "2023-05-10T16:30:00",
    lastBooking: "2023-04-05T10:00:00",
    isFavorite: false,
    sessionTypes: ["Therapy"],
  },
]

export default function ClientsList() {
  const [clients, setClients] = useState<any[]>([])
  const [filteredClients, setFilteredClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filters, setFilters] = useState<ClientFiltersType>({
    searchTerm: "",
    sessionTypes: [],
    sortBy: "name",
    sortDirection: "asc",
    showFavoritesOnly: false,
  })

  useEffect(() => {
    // Simulate API call
    const fetchClients = async () => {
      setLoading(true)
      // Replace with actual API call
      setTimeout(() => {
        setClients(mockClients)
        setLoading(false)
      }, 1000)
    }

    fetchClients()
  }, [])

  // Apply filters and sorting whenever clients or filters change
  useEffect(() => {
    if (clients.length === 0) return

    let result = [...clients]

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      result = result.filter(
        (client) => client.name.toLowerCase().includes(searchLower) || client.email.toLowerCase().includes(searchLower),
      )
    }

    // Apply session type filter
    if (filters.sessionTypes.length > 0) {
      result = result.filter((client) =>
        client.sessionTypes.some((type: string) => filters.sessionTypes.includes(type)),
      )
    }

    // Apply favorites filter
    if (filters.showFavoritesOnly) {
      result = result.filter((client) => client.isFavorite)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (filters.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "lastBooking":
          // Handle null values
          if (!a.lastBooking) return 1
          if (!b.lastBooking) return -1
          comparison = new Date(a.lastBooking).getTime() - new Date(b.lastBooking).getTime()
          break
        case "nextBooking":
          // Handle null values
          if (!a.nextBooking) return 1
          if (!b.nextBooking) return -1
          comparison = new Date(a.nextBooking).getTime() - new Date(b.nextBooking).getTime()
          break
        case "totalBookings":
          comparison = a.totalBookings - b.totalBookings
          break
        case "totalSpent":
          comparison = a.totalSpentNumeric - b.totalSpentNumeric
          break
        default:
          comparison = 0
      }

      // Apply sort direction
      return filters.sortDirection === "asc" ? comparison : -comparison
    })

    setFilteredClients(result)
    // Reset to first page when filters change
    setPage(0)
  }, [clients, filters])

  const handleChangePage = (newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(Number.parseInt(value, 10))
    setPage(0)
  }

  const toggleFavorite = (clientId: string) => {
    setClients(
      clients.map((client) => (client.id === clientId ? { ...client, isFavorite: !client.isFavorite } : client)),
    )
  }

  const handleFilterChange = (newFilters: ClientFiltersType) => {
    setFilters(newFilters)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} className="h-16 my-2" />
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-semibold">No clients found</h2>
        <p className="text-muted-foreground">
          You haven't had any bookings yet. Clients will appear here after they book a session with you.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <ClientFilters onFilterChange={handleFilterChange} />
      </div>

      {filteredClients.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <h2 className="text-lg font-semibold">No matching clients</h2>
          <p className="text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Next Booking</TableHead>
                  <TableHead>Last Booking</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite(client.id)}>
                        {client.isFavorite ? (
                          <Star className="h-4 w-4 fill-primary text-primary" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-9 w-9 mr-3">
                          <AvatarImage
                            src={client.profilePicture || "/generic-media-placeholder.png"}
                            alt={client.name}
                          />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {client.totalBookings} bookings · {client.totalSpent}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.sessionTypes.map((type: string) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(client.nextBooking)}</TableCell>
                    <TableCell>{formatDate(client.lastBooking)}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link href={`/dashboard/practitioner/clients/${client.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Client Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Rows per page:</p>
          <select
            className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
            value={rowsPerPage}
            onChange={(e) => handleChangeRowsPerPage(e.target.value)}
          >
            {[5, 10, 25].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {page + 1} of {Math.ceil(filteredClients.length / rowsPerPage)}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChangePage(page - 1)}
            disabled={page === 0}
          >
            <span className="sr-only">Previous page</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChangePage(page + 1)}
            disabled={page >= Math.ceil(filteredClients.length / rowsPerPage) - 1}
          >
            <span className="sr-only">Next page</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}
