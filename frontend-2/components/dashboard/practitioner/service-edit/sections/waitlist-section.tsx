"use client"

import { useQuery } from "@tanstack/react-query"
import { servicesWaitlistRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Loader2, Users, Clock, AlertCircle } from "lucide-react"
import type { ServiceDetailReadable as ServiceReadable } from "@/src/client/types.gen"

interface WaitlistSectionProps {
  service: ServiceReadable
  data: any
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function WaitlistSection({ service }: WaitlistSectionProps) {
  const { data: waitlistData, isLoading } = useQuery({
    ...servicesWaitlistRetrieveOptions({ path: { id: service.id! } }),
    enabled: !!service.id,
  })

  const waitlistCount = parseInt(String(waitlistData?.waitlist_count || service.waitlist_count || '0'))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (waitlistCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No one is on the waitlist yet.</p>
        <p className="text-xs mt-1">
          When your {service.service_type_code === 'workshop' ? 'workshop' : 'course'} reaches capacity, interested customers can join the waitlist.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Waitlist summary */}
      <Card className="p-4 bg-blush-50/50 border-blush-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-100">
            <Clock className="h-5 w-5 text-terracotta-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-terracotta-900">
                {waitlistCount} {waitlistCount === 1 ? 'person' : 'people'} waiting
              </h4>
              <Badge variant="secondary" className="bg-blush-100 text-terracotta-800 text-xs">
                Waitlist Active
              </Badge>
            </div>
            <p className="text-sm text-terracotta-700 mt-0.5">
              {service.service_type_code === 'workshop'
                ? "These customers will be notified if a spot opens up or if you add additional dates."
                : "These customers are waiting to enroll. Consider increasing capacity or adding another cohort."}
            </p>
          </div>
        </div>
      </Card>

      {/* Info about what they can do */}
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">How to accommodate waitlisted customers:</p>
            <ul className="mt-1 space-y-1 text-xs list-disc list-inside">
              <li>Increase the <strong>max participants</strong> in Pricing &amp; Duration to open more spots</li>
              {service.service_type_code === 'workshop' && (
                <li>Add another session date to run the workshop again</li>
              )}
              {service.service_type_code === 'course' && (
                <li>Consider creating a second cohort by duplicating this course</li>
              )}
              <li>Waitlisted customers are automatically notified when spots become available</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
