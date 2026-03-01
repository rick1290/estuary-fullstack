"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  MoreVertical,
  MessageSquare,
  Eye,
  XCircle,
  Users,
} from "lucide-react"

// Booking status variants
const BOOKING_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  completed: "default",
  canceled: "destructive",
  cancelled: "destructive",
  "no-show": "destructive",
  pending: "secondary",
}

interface SessionParticipantsListProps {
  bookings: any[]
  sessionId: number
  serviceId: number
  onRefresh?: () => void
}

export function SessionParticipantsList({
  bookings,
  sessionId,
  serviceId,
  onRefresh,
}: SessionParticipantsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = bookings || []

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((b: any) =>
        (b.user_name || '').toLowerCase().includes(query) ||
        (b.user_email || '').toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b: any) => b.status === statusFilter)
    }

    return result
  }, [bookings, searchQuery, statusFilter])

  // Get unique statuses for filter
  const availableStatuses = useMemo(() => {
    const statuses = new Set((bookings || []).map((b: any) => b.status))
    return Array.from(statuses)
  }, [bookings])

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">No participants yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Participants will appear here once they book this session.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({bookings.length})</SelectItem>
            {availableStatuses.map((status) => {
              const count = bookings.filter((b: any) => b.status === status).length
              return (
                <SelectItem key={status} value={status}>
                  <span className="capitalize">{status}</span> ({count})
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop data table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_6rem_5rem_5rem_3rem] gap-2 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>Client</div>
          <div>Email</div>
          <div>Status</div>
          <div>Payment</div>
          <div>Booked</div>
          <div></div>
        </div>

        {/* Table rows */}
        <div className="divide-y">
          {filteredBookings.map((booking: any) => (
            <div
              key={booking.id}
              className="grid grid-cols-[1fr_1fr_6rem_5rem_5rem_3rem] gap-2 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
            >
              {/* Client */}
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={booking.user_avatar_url || ""} alt={booking.user_name} />
                  <AvatarFallback className="text-xs">
                    {(booking.user_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{booking.user_name || 'Unknown'}</span>
              </div>

              {/* Email */}
              <div className="text-sm text-muted-foreground truncate">
                {booking.user_email || '—'}
              </div>

              {/* Status */}
              <div>
                <Badge
                  variant={BOOKING_STATUS_VARIANTS[booking.status] || "outline"}
                  className="text-xs px-1.5 py-0 h-5 capitalize"
                >
                  {booking.status_display || booking.status}
                </Badge>
              </div>

              {/* Payment */}
              <div className="text-xs text-muted-foreground">
                {booking.payment_status === 'paid' ? (
                  <span className="text-green-700">Paid</span>
                ) : booking.payment_status ? (
                  <span className="capitalize">{booking.payment_status}</span>
                ) : (
                  '—'
                )}
              </div>

              {/* Booked date */}
              <div className="text-xs text-muted-foreground">
                {booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </div>

              {/* Actions */}
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/practitioner/bookings/${booking.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Booking
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/practitioner/messages?user=${booking.user_id || ''}`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message Client
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {filteredBookings.map((booking: any) => (
          <Card key={booking.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={booking.user_avatar_url || ""} alt={booking.user_name} />
                  <AvatarFallback className="text-xs">
                    {(booking.user_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{booking.user_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{booking.user_email || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={BOOKING_STATUS_VARIANTS[booking.status] || "outline"}
                  className="text-xs capitalize"
                >
                  {booking.status_display || booking.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/practitioner/bookings/${booking.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Booking
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/practitioner/messages?user=${booking.user_id || ''}`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message Client
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* No results from filtering */}
      {filteredBookings.length === 0 && (searchQuery || statusFilter !== "all") && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No participants match your filters.
          <button
            onClick={() => { setSearchQuery(""); setStatusFilter("all") }}
            className="ml-1 text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Count summary */}
      <p className="text-xs text-muted-foreground">
        Showing {filteredBookings.length} of {bookings.length} participant{bookings.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
