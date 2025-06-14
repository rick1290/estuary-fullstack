"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar, Globe, BarChart } from "lucide-react"

interface CourseDetailsProps {
  course: any
}

export default function CourseDetails({ course }: CourseDetailsProps) {
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
        <CardTitle className="text-lg">Course Details</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Duration</div>
              <div className="text-muted-foreground">{course.duration}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Sessions</div>
              <div className="text-muted-foreground">{course.sessionCount} sessions</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Location</div>
              <div className="text-muted-foreground">{course.location}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <BarChart className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Experience Level</div>
              <div className="text-muted-foreground">{formatExperienceLevel(course.experienceLevel)}</div>
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
          {course.benefits.map((benefit: any) => (
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
