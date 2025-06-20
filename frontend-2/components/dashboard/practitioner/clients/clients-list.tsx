"use client"

import { useState, useMemo } from "react"
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
import { useQuery } from "@tanstack/react-query"
import { practitionersClientsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import ClientFilters, { type ClientFilters as ClientFiltersType } from "./client-filters"


interface ClientData {
  id: number
  email: string
  full_name?: string
  display_name?: string
  avatar_url?: string
  phone_number?: string
  total_bookings: number
  total_spent: number
  total_spent_display: string
  last_booking_date?: string
  next_booking_date?: string
  session_types: string[]
  isFavorite?: boolean
}

interface PaginatedClientResponse {
  count: number
  next: string | null
  previous: string | null
  results: ClientData[]
}

export default function ClientsList() {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filters, setFilters] = useState<ClientFiltersType>({
    searchTerm: "",
    sessionTypes: [],
    sortBy: "name",
    sortDirection: "asc",
    showFavoritesOnly: false,
  })
  const [favoriteClients, setFavoriteClients] = useState<Set<number>>(new Set())

  // Fetch clients from API using generated client
  const { data: clientsData, isLoading, error } = useQuery(
    practitionersClientsRetrieveOptions({
      query: {
        search: filters.searchTerm || undefined,
        page: page + 1,
        page_size: rowsPerPage
      }
    })
  )

  const clients = useMemo(() => {
    const data = clientsData as unknown as PaginatedClientResponse
    if (!data?.results) return []
    
    return data.results.map((client) => ({
      ...client,
      name: client.full_name || client.display_name || client.email,
      isFavorite: favoriteClients.has(client.id),
      totalSpent: client.total_spent_display,
      totalSpentNumeric: client.total_spent,
      sessionTypes: client.session_types || []
    }))
  }, [clientsData, favoriteClients])

  // Apply client-side filtering and sorting
  const filteredClients = useMemo(() => {
    if (!clients) return []
    
    let result = [...clients]

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
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case "lastBooking":
          // Handle null values
          if (!a.last_booking_date) return 1
          if (!b.last_booking_date) return -1
          comparison = new Date(a.last_booking_date).getTime() - new Date(b.last_booking_date).getTime()
          break
        case "nextBooking":
          // Handle null values
          if (!a.next_booking_date) return 1
          if (!b.next_booking_date) return -1
          comparison = new Date(a.next_booking_date).getTime() - new Date(b.next_booking_date).getTime()
          break
        case "totalBookings":
          comparison = (a.total_bookings || 0) - (b.total_bookings || 0)
          break
        case "totalSpent":
          comparison = (a.totalSpentNumeric || 0) - (b.totalSpentNumeric || 0)
          break
        default:
          comparison = 0
      }

      // Apply sort direction
      return filters.sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [clients, filters])

  const handleChangePage = (newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(Number.parseInt(value, 10))
    setPage(0)
  }

  const toggleFavorite = (clientId: number) => {
    setFavoriteClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handleFilterChange = (newFilters: ClientFiltersType) => {
    setFilters(newFilters)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  if (isLoading) {
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

  if (error) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-semibold">Failed to load clients</h2>
        <p className="text-muted-foreground">Please try again later.</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!isLoading && (!clients || clients.length === 0)) {
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
                {filteredClients.map((client) => (
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
                            src={client.avatar_url || "/generic-media-placeholder.png"}
                            alt={client.name}
                          />
                          <AvatarFallback>{client.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {client.total_bookings} bookings · {client.totalSpent}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.sessionTypes.map((type: string) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type || 'Unknown'}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(client.next_booking_date)}</TableCell>
                    <TableCell>{formatDate(client.last_booking_date)}</TableCell>
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
          Page {page + 1} of {Math.ceil(((clientsData as unknown as PaginatedClientResponse)?.count || 0) / rowsPerPage)}
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
            disabled={!(clientsData as unknown as PaginatedClientResponse)?.next}
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
