"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import { serviceSessionsRetrieveOptions } from "@/src/client/@tanstack/react-query.gen"
import { SessionDetailPage } from "@/components/dashboard/practitioner/service-edit/session-detail-page"
import { Loader2 } from "lucide-react"

/**
 * Standalone session detail route (/sessions/[id]).
 * Resolves the parent serviceId from the session's API response,
 * then renders the shared SessionDetailPage component with
 * schedule-oriented back navigation.
 */
export default function StandaloneSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  // We need to resolve the parent service ID from the session
  const { data: session, isLoading } = useQuery(
    serviceSessionsRetrieveOptions({ path: { id: parseInt(id) } })
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Resolve serviceId from session data
  const serviceId = session?.service?.id?.toString() || session?.service_id?.toString() || "0"

  return (
    <SessionDetailPage
      serviceId={serviceId}
      sessionId={id}
      backHref="/dashboard/practitioner/schedule"
      backLabel="Schedule"
    />
  )
}
