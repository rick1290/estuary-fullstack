"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Globe, BarChart, Laptop } from "lucide-react"

interface SessionDetailsProps {
  session: any
}

export default function SessionDetails({ session }: SessionDetailsProps) {
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
        <CardTitle className="text-lg">Session Details</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Duration</div>
              <div className="text-muted-foreground">{session.duration} minutes</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Location</div>
              <div className="text-muted-foreground">{session.location}</div>
            </div>
          </div>

          {session.platform && (
            <div className="flex items-start gap-3">
              <Laptop className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-sm">Platform</div>
                <div className="text-muted-foreground">{session.platform}</div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <BarChart className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Experience Level</div>
              <div className="text-muted-foreground">{formatExperienceLevel(session.experienceLevel)}</div>
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
          {session.benefits.map((benefit: any) => (
            <div key={benefit.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
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
