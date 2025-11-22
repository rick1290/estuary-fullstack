"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, User } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { payoutsEarningsPurchasesRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  'projected': { label: 'Projected', variant: 'secondary' },
  'pending': { label: 'Pending', variant: 'outline' },
  'available': { label: 'Available', variant: 'default' },
  'paid': { label: 'Paid', variant: 'default' },
  'reversed': { label: 'Reversed', variant: 'destructive' },
}

const bookingStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  'confirmed': { label: 'Confirmed', variant: 'default' },
  'completed': { label: 'Completed', variant: 'default' },
  'cancelled': { label: 'Cancelled', variant: 'destructive' },
  'no_show': { label: 'No Show', variant: 'destructive' },
  'pending': { label: 'Pending', variant: 'outline' },
  'draft': { label: 'Draft', variant: 'secondary' },
}

interface Purchase {
  order: {
    id: number
    public_uuid: string
    created_at: string
    total_amount_cents: number
    total_amount_display: string
    status: string
    order_type: string
  }
  client: {
    id: number
    name: string
    email: string
    avatar_url?: string
  }
  service: {
    id: number
    public_uuid: string
    name: string
    service_type: string
    service_type_name: string
  }
  bookings: Array<{
    id: number
    public_uuid: string
    status: string
    payment_status: string
    credits_allocated: number
    credits_allocated_display: string
    service_session?: {
      id: number
      start_time: string
      end_time: string
      sequence_number?: number
    }
    earnings?: {
      id: number
      public_uuid: string
      gross_amount_cents: number
      gross_amount_display: string
      commission_rate: number
      commission_amount_cents: number
      commission_amount_display: string
      net_amount_cents: number
      net_amount_display: string
      status: string
      available_after?: string
    }
    created_at: string
  }>
  summary: {
    total_sessions: number
    completed_sessions: number
    total_credits_cents: number
    total_credits_display: string
    total_gross_cents: number
    total_gross_display: string
    total_commission_cents: number
    total_commission_display: string
    total_net_cents: number
    total_net_display: string
    earnings_by_status: Record<string, number>
  }
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasMultipleBookings = purchase.bookings.length > 1

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg mb-3 overflow-hidden">
        {/* Main Purchase Row */}
        <CollapsibleTrigger asChild>
          <div className={cn(
            "flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
            isOpen && "bg-muted/30"
          )}>
            {/* Expand/Collapse Icon */}
            <div className="w-5">
              {hasMultipleBookings && (
                isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Client Avatar & Info */}
            <div className="flex items-center gap-3 min-w-[180px]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={purchase.client?.avatar_url} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">{purchase.client?.name || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">{purchase.client?.email}</div>
              </div>
            </div>

            {/* Service Info */}
            <div className="flex-1 min-w-[150px]">
              <div className="font-medium text-sm">{purchase.service?.name || 'Service'}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {purchase.service?.service_type_name || purchase.service?.service_type}
              </div>
            </div>

            {/* Date */}
            <div className="text-sm text-muted-foreground min-w-[100px]">
              {format(new Date(purchase.order.created_at), "MMM dd, yyyy")}
            </div>

            {/* Sessions Count */}
            <div className="text-center min-w-[80px]">
              <div className="text-sm font-medium">
                {purchase.summary.completed_sessions}/{purchase.summary.total_sessions}
              </div>
              <div className="text-xs text-muted-foreground">sessions</div>
            </div>

            {/* Order Amount */}
            <div className="text-right min-w-[90px]">
              <div className="text-sm font-medium">{purchase.order.total_amount_display}</div>
              <div className="text-xs text-muted-foreground">paid</div>
            </div>

            {/* Net Earnings */}
            <div className="text-right min-w-[100px]">
              <div className="text-sm font-bold text-green-600">{purchase.summary.total_net_display}</div>
              <div className="text-xs text-muted-foreground">
                -{purchase.summary.total_commission_display} fee
              </div>
            </div>

            {/* Earnings Status */}
            <div className="min-w-[100px] text-right">
              {Object.entries(purchase.summary.earnings_by_status).length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {Object.entries(purchase.summary.earnings_by_status).map(([status, amount]) => (
                    <Badge
                      key={status}
                      variant={statusConfig[status]?.variant || 'secondary'}
                      className="text-xs"
                    >
                      {statusConfig[status]?.label || status}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="secondary" className="text-xs">No Earnings</Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Bookings Detail */}
        <CollapsibleContent>
          <div className="border-t bg-muted/20">
            <div className="p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Session Details
              </div>
              {purchase.bookings.map((booking, idx) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 p-3 bg-background rounded-md border text-sm"
                >
                  {/* Session Number */}
                  <div className="w-8 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{booking.service_session?.sequence_number || idx + 1}
                    </span>
                  </div>

                  {/* Session Time */}
                  <div className="min-w-[140px]">
                    {booking.service_session?.start_time ? (
                      <>
                        <div className="font-medium">
                          {format(new Date(booking.service_session.start_time), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(booking.service_session.start_time), "h:mm a")}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </div>

                  {/* Booking Status */}
                  <div className="min-w-[90px]">
                    <Badge variant={bookingStatusConfig[booking.status]?.variant || 'secondary'}>
                      {bookingStatusConfig[booking.status]?.label || booking.status}
                    </Badge>
                  </div>

                  {/* Credits Allocated */}
                  <div className="min-w-[80px] text-right">
                    <div className="font-medium">{booking.credits_allocated_display}</div>
                    <div className="text-xs text-muted-foreground">credits</div>
                  </div>

                  {/* Earnings */}
                  {booking.earnings ? (
                    <>
                      <div className="min-w-[80px] text-right">
                        <div className="font-medium">{booking.earnings.gross_amount_display}</div>
                        <div className="text-xs text-muted-foreground">gross</div>
                      </div>
                      <div className="min-w-[80px] text-right text-orange-600">
                        <div>-{booking.earnings.commission_amount_display}</div>
                        <div className="text-xs">({booking.earnings.commission_rate}%)</div>
                      </div>
                      <div className="min-w-[80px] text-right">
                        <div className="font-bold text-green-600">{booking.earnings.net_amount_display}</div>
                        <div className="text-xs text-muted-foreground">net</div>
                      </div>
                      <div className="min-w-[90px] text-right">
                        <Badge variant={statusConfig[booking.earnings.status]?.variant || 'secondary'}>
                          {statusConfig[booking.earnings.status]?.label || booking.earnings.status}
                        </Badge>
                        {booking.earnings.available_after && booking.earnings.status === 'pending' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Available {format(new Date(booking.earnings.available_after), "MMM dd")}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-right text-muted-foreground text-sm">
                      No earnings yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function PractitionerTransactionsTable() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Build query parameters
  const queryParams: Record<string, unknown> = {
    limit,
    offset: (page - 1) * limit,
  }

  if (statusFilter && statusFilter !== "all") {
    queryParams.status = statusFilter
  }

  // Fetch purchases
  const { data, isLoading, error } = useQuery({
    ...payoutsEarningsPurchasesRetrieveOptions({ query: queryParams }),
  })

  const purchases = (data?.results || []) as Purchase[]
  const totalCount = data?.count || 0

  // Calculate totals from all purchases on current page
  const totalEarnings = purchases.reduce((sum, p) => sum + (p.summary.total_net_cents || 0), 0) / 100
  const totalCommission = purchases.reduce((sum, p) => sum + (p.summary.total_commission_cents || 0), 0) / 100
  const totalGross = purchases.reduce((sum, p) => sum + (p.summary.total_gross_cents || 0), 0) / 100

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter("all")
    setPage(1)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Failed to load transactions. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${totalGross.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">-${totalCommission.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Earnings Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="projected">Projected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters Button */}
          <Button variant="ghost" onClick={resetFilters} className="w-full md:w-auto">
            Reset Filters
          </Button>
        </div>

        {/* Export Button */}
        <Button className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalCount} purchases found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-4 p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b mb-3">
            <div className="w-5"></div>
            <div className="min-w-[180px]">Client</div>
            <div className="flex-1 min-w-[150px]">Service</div>
            <div className="min-w-[100px]">Date</div>
            <div className="min-w-[80px] text-center">Sessions</div>
            <div className="min-w-[90px] text-right">Paid</div>
            <div className="min-w-[100px] text-right">Earnings</div>
            <div className="min-w-[100px] text-right">Status</div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : purchases.length > 0 ? (
            <div>
              {purchases.map((purchase) => (
                <PurchaseRow key={purchase.order.id} purchase={purchase} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No purchases found.
            </div>
          )}

          {/* Pagination */}
          {totalCount > limit && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                variant="outline"
                size="sm"
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(totalCount / limit)}
              </span>
              <Button
                onClick={() => setPage(prev => prev + 1)}
                variant="outline"
                size="sm"
                disabled={!data?.next || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
