"use client"

import { useState } from "react"
import { Star, Mail, Phone, MapPin, Calendar, DollarSign, BookOpen } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { practitionersClientsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { format, parseISO } from "date-fns"

interface ClientProfileProps {
  clientId: string
}

export default function ClientProfile({ clientId }: ClientProfileProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  
  // Fetch client details from API
  const { data: clientsData, isLoading, error } = useQuery({
    ...practitionersClientsRetrieveOptions({
      query: {
        user_id: parseInt(clientId),
        page_size: 1
      }
    }),
  })

  // Extract the client from the paginated response
  const client = (clientsData as any)?.results?.[0]

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    // TODO: Implement API call to save favorite status
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="text-center pb-0">
          <div className="flex flex-col items-center">
            <Skeleton className="h-20 w-20 rounded-full mb-4" />
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Separator className="my-4" />
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
        </CardContent>
      </Card>
    )
  }

  if (error || !client) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Client not found</p>
        </CardContent>
      </Card>
    )
  }

  const name = client.full_name || client.display_name || client.email
  const memberSince = client.date_joined ? format(parseISO(client.date_joined), "MMMM yyyy") : "Unknown"
  const tags = []
  if (client.total_bookings >= 10) tags.push("Regular")
  if (client.total_spent >= 1000) tags.push("VIP")
  if (client.session_types?.includes("workshop")) tags.push("Workshop Attendee")

  return (
    <Card>
      <CardHeader className="text-center pb-0">
        <div className="relative inline-block mx-auto">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={client.avatar_url || "/generic-media-placeholder.png"} alt={name} />
            <AvatarFallback>{name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background shadow-sm"
            onClick={toggleFavorite}
          >
            {isFavorite ? <Star className="h-4 w-4 fill-primary text-primary" /> : <Star className="h-4 w-4" />}
          </Button>
        </div>
        <h2 className="text-xl font-bold mb-1">{name}</h2>
        <p className="text-sm text-muted-foreground mb-4">Member since {memberSince}</p>
        {tags.length > 0 && (
          <div className="flex justify-center flex-wrap gap-2 my-4">
            {tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-start">
            <Mail className="h-4 w-4 mr-3 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="break-all">{client.email}</p>
            </div>
          </div>
          {client.phone_number && (
            <div className="flex items-start">
              <Phone className="h-4 w-4 mr-3 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{client.phone_number}</p>
              </div>
            </div>
          )}
          {(client.city || client.state_province || client.country) && (
            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-3 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Location</p>
                <p>
                  {[client.city, client.state_province, client.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div>
          <h3 className="text-sm font-medium mb-3">Client Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Bookings</p>
              </div>
              <p className="font-semibold">{client.total_bookings || 0}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
              <p className="font-semibold">{client.total_spent_display || "$0"}</p>
            </div>
            {client.last_booking_date && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Last Booking</p>
                </div>
                <p className="font-semibold text-sm">
                  {format(parseISO(client.last_booking_date), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        </div>

        {client.session_types && client.session_types.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h3 className="text-sm font-medium mb-3">Service Types</h3>
              <div className="flex flex-wrap gap-2">
                {client.session_types.map((type: string) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
