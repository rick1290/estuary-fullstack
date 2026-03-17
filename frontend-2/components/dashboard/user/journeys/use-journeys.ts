"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { journeysListOptions } from "@/src/client/@tanstack/react-query.gen"
import type {
  JourneyListItem,
  JourneyDetail,
  JourneySession,
  JourneyPractitioner,
  JourneyListResponse,
  PaginatedJourneyListResponseList,
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
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    ...journeysListOptions(),
  })

  // The API returns PaginatedJourneyListResponseList:
  //   { count, results: JourneyListResponse[] }
  // Each JourneyListResponse is { count, results: JourneyListItem[] }
  // Flatten all JourneyListItem[] from the nested structure.
  const journeys = useMemo(() => {
    if (!data) return [] as JourneyListItem[]
    const paginated = data as PaginatedJourneyListResponseList
    // Flatten: each item in paginated.results is a JourneyListResponse with its own results
    const allItems: JourneyListItem[] = []
    for (const group of paginated.results ?? []) {
      if (Array.isArray((group as JourneyListResponse).results)) {
        allItems.push(...(group as JourneyListResponse).results)
      }
    }
    // If the structure is already flat (interceptor unwrapped), handle that too
    if (allItems.length === 0 && Array.isArray((data as any)?.results)) {
      const directResults = (data as any).results
      // Check if first item looks like a JourneyListItem (has journey_id)
      if (directResults.length > 0 && directResults[0].journey_id) {
        return directResults as JourneyListItem[]
      }
    }
    return allItems
  }, [data])

  const count = useMemo(() => {
    if (!data) return 0
    return (data as PaginatedJourneyListResponseList)?.count ?? journeys.length
  }, [data, journeys.length])

  const upcomingJourneys = useMemo(
    () => journeys.filter((j) => j.status === "upcoming"),
    [journeys]
  )

  const activeJourneys = useMemo(
    () => journeys.filter((j) => j.status === "active"),
    [journeys]
  )

  const completedJourneys = useMemo(
    () => journeys.filter((j) => j.status === "completed"),
    [journeys]
  )

  return {
    journeys,
    upcomingJourneys,
    activeJourneys,
    completedJourneys,
    isLoading,
    error,
    count,
  }
}
