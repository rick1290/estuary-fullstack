"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useAuthModal } from "@/components/auth/auth-provider"
import type { Service } from "@/types/service"

interface ServiceBookingPanelProps {
  service: Service
}

export default function ServiceBookingPanel({ service }: ServiceBookingPanelProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()

  const getBookingButtonText = () => {
    switch (service.service_type.name) {
      case "course":
        return "Enroll Now"
      case "workshop":
        return "Register Now"
      case "package":
        return "Book Package"
      default:
        return "Book Session"
    }
  }

  const handleBookingClick = () => {
    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: "login",
        redirectUrl: `/checkout?serviceId=${service.id}&type=${service.service_type.name}`,
        serviceType: service.service_type.name,
        title: `Sign in to ${getBookingButtonText()}`,
        description: "Please sign in to book this service"
      })
      return
    }

    // Redirect to checkout page with service details
    router.push(`/checkout?serviceId=${service.id}&type=${service.service_type.name}`)
  }

  return (
    <Card className="overflow-hidden">
        <CardContent className="p-6">
          <p className="text-2xl font-semibold text-primary mb-4">${Number.parseFloat(service.price).toFixed(2)}</p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {service.duration} {service.duration === 1 ? "minute" : "minutes"}
              </span>
            </div>

            {service.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{service.location}</span>
              </div>
            )}

            {service.sessions && service.sessions.length > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{service.sessions.length} sessions</span>
              </div>
            )}
          </div>

          {service.service_type.name === "course" && service.sessions && (
            <p className="text-sm mb-4">
              Total for course: ${(Number.parseFloat(service.price) * service.sessions.length).toFixed(2)}
            </p>
          )}

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2 mb-4">
            {service.categories?.map((category, index) => (
              <Badge key={index} variant="outline">
                {category}
              </Badge>
            ))}
            <Badge variant="secondary">{service.experience_level}</Badge>
          </div>

          <Button className="w-full rounded-full py-6 text-base font-medium mb-4" onClick={handleBookingClick}>
            {getBookingButtonText()}
          </Button>

          <p className="text-xs text-center text-muted-foreground">Secure checkout • Satisfaction guaranteed</p>
        </CardContent>
      </Card>
  )
}
