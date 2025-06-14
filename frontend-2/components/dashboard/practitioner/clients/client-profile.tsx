"use client"

import { useState, useEffect } from "react"
import { Star, Mail, Phone, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

interface ClientProfileProps {
  clientId: string
}

// Mock data - replace with actual API call
const mockClientDetails = {
  id: "1",
  name: "Emma Johnson",
  email: "emma.johnson@example.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  profilePicture: "/practitioner-1.jpg",
  totalBookings: 12,
  totalSpent: "$1,240",
  averageRating: 4.8,
  memberSince: "January 2022",
  isFavorite: true,
  tags: ["VIP", "Regular", "Workshop Attendee"],
}

export default function ClientProfile({ clientId }: ClientProfileProps) {
  const [client, setClient] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchClientDetails = async () => {
      setLoading(true)
      // Replace with actual API call
      setTimeout(() => {
        setClient(mockClientDetails)
        setLoading(false)
      }, 1000)
    }

    fetchClientDetails()
  }, [clientId])

  const toggleFavorite = () => {
    if (client) {
      setClient({ ...client, isFavorite: !client.isFavorite })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center">
          <Skeleton className="h-20 w-20 rounded-full mb-4" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-32 mb-4" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Separator className="my-4" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <p>Client not found</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center pb-0">
        <div className="relative inline-block mx-auto">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={client.profilePicture || "/generic-media-placeholder.png"} alt={client.name} />
            <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background shadow-sm"
            onClick={toggleFavorite}
          >
            {client.isFavorite ? <Star className="h-4 w-4 fill-primary text-primary" /> : <Star className="h-4 w-4" />}
          </Button>
        </div>
        <h2 className="text-xl font-bold mb-1">{client.name}</h2>
        <p className="text-sm text-muted-foreground mb-4">Member since {client.memberSince}</p>
        <div className="flex justify-center flex-wrap gap-2 my-4">
          {client.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{client.email}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p>{client.phone}</p>
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-3 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p>{client.location}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h3 className="text-sm font-medium mb-3">Client Statistics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="font-semibold">{client.totalBookings}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="font-semibold">{client.totalSpent}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="font-semibold">{client.averageRating}/5</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
