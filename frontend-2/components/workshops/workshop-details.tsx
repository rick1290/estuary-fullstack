"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, Home, User, BarChart, Globe } from "lucide-react"

interface WorkshopDetailsProps {
  workshop: any
}

export default function WorkshopDetails({ workshop }: WorkshopDetailsProps) {
  // Function to format experience level
  const formatExperienceLevel = (level: string) => {
    if (!level) return "All Levels"
    return level
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workshop Details</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Date</div>
              <div className="text-muted-foreground">{workshop.date}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Time</div>
              <div className="text-muted-foreground">
                {workshop.startTime} - {workshop.endTime} ({workshop.duration} min)
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Location</div>
              <div className="text-muted-foreground">{workshop.location}</div>
            </div>
          </div>

          {workshop.venue && (
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-sm">Venue</div>
                <div className="text-muted-foreground">
                  {workshop.venue}
                  {workshop.address ? `, ${workshop.address}` : ""}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Capacity</div>
              <div className="text-muted-foreground">
                {workshop.capacity} participants ({workshop.spotsRemaining} spots left)
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <BarChart className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Experience Level</div>
              <div className="text-muted-foreground">{formatExperienceLevel(workshop.experienceLevel)}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Language</div>
              <div className="text-muted-foreground">English</div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <h3 className="font-semibold mb-4">Benefits</h3>

        <div className="space-y-4">
          {workshop.benefits.map((benefit: any) => (
            <div key={benefit.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                {benefit.id}
              </div>
              <div>
                <div className="font-medium">{benefit.title}</div>
                <div className="text-muted-foreground text-sm">{benefit.description}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
