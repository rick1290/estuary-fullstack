"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { journeysListOptions } from "@/src/client/@tanstack/react-query.gen"
import type {
  JourneyListItem,
  JourneyDetail,
  JourneySession,
  JourneyPractitioner,
} from "@/src/client/types.gen"

// ---------------------------------------------------------------------------
// Re-export types for consumers
// ---------------------------------------------------------------------------

export type {
  JourneyListItem,
  JourneyDetail,
  JourneySession,
  JourneyPractitioner,
} from "@/src/client/types.gen"

export type FilterType = "all" | "session" | "course" | "workshop" | "package"

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJourneys() {
  const { data, isLoading, error } = useQuery({
    ...journeysListOptions(),
  })

  // The API returns { count, results: JourneyListItem[] }
  // The heyapi interceptor may unwrap the {status, data} wrapper
  // So data could be: { count, results } or { status, data: { count, results } }
  const journeys = useMemo(() => {
    if (!data) return [] as JourneyListItem[]

    // Try direct: data.results (interceptor unwrapped)
    const raw = data as any
    let items: any[] = []

    if (Array.isArray(raw?.results)) {
      items = raw.results
    } else if (Array.isArray(raw?.data?.results)) {
      items = raw.data.results
    } else if (Array.isArray(raw)) {
      items = raw
    }

    // Filter to actual JourneyListItem objects (have journey_id)
    return items.filter((item: any) => item?.journey_id) as JourneyListItem[]
  }, [data])

  const unscheduledJourneys = useMemo(
    () => journeys.filter((j) => j.status === "unscheduled"),
    [journeys]
  )

  const upcomingJourneys = useMemo(
    () => journeys.filter((j) => j.status === "upcoming"),
    [journeys]
  )

  const activeJourneys = useMemo(
    () => journeys.filter((j) => j.status === "active"),
    [journeys]
  )

  const completedJourneys = useMemo(
    () =>
      journeys
        .filter((j) => j.status === "completed")
        .sort((a, b) => {
          const dateA = a.next_session_time ? new Date(a.next_session_time).getTime() : 0
          const dateB = b.next_session_time ? new Date(b.next_session_time).getTime() : 0
          return dateB - dateA // most recent first
        }),
    [journeys]
  )

  return {
    journeys,
    unscheduledJourneys,
    upcomingJourneys,
    activeJourneys,
    completedJourneys,
    isLoading,
    error,
    count: journeys.length,
  }
}
