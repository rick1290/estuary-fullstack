"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin } from "lucide-react"
import { getServiceTypeConfig } from "@/lib/service-type-config"

interface Session {
  id: string
  name: string
  description?: string
  price: string
  duration: number
  location_type: string
  image_url?: string
  service_type: {
    id: string
    name: string
  }
  category?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
}

interface SessionOfferingsProps {
  sessions: Session[]
  categories: Category[]
  selectedServiceType: string | null
  handleServiceTypeChange: (categoryId: string | null) => void
}

export default function SessionOfferings({
  sessions,
  categories,
  selectedServiceType,
  handleServiceTypeChange,
}: SessionOfferingsProps) {
  if (sessions.length === 0) {
    return null
  }

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4">1-on-1 Session Offerings</h2>

      {/* Category Filters */}
      {categories && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge
            variant={selectedServiceType === null ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-sm"
            onClick={() => handleServiceTypeChange(null)}
          >
            All Categories
          </Badge>

          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedServiceType === category.id ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm"
              onClick={() => handleServiceTypeChange(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-4">
        {sessions
          .filter(
            (session) => !selectedServiceType || (session.category && session.category.id === selectedServiceType),
          )
          .map((session) => (
            <Card key={session.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 h-full">
                  <div className="w-full sm:w-2/3 mb-4 sm:mb-0">
                    <h3 className="font-semibold text-lg mb-2">{session.name}</h3>

                    {/* Replace category badge with service type badge */}
                    <Badge
                      className="mb-3 capitalize"
                      variant={getServiceTypeConfig(session.service_type_code || session.service_type?.name).variant}
                    >
                      {session.service_type_display || session.service_type_code || session.service_type?.name}
                    </Badge>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{session.duration} minutes</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{session.location_type.charAt(0).toUpperCase() + session.location_type.slice(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    <p className="font-semibold text-primary">{session.price ? session.price : "Free"}</p>

                    <Button asChild variant="outline">
                      <Link href={`/sessions/${session.id}`}>Book Session</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
