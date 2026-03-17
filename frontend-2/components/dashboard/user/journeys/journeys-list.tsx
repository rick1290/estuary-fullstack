"use client"

import { useState, useMemo } from "react"
import { useJourneys, type FilterType, type JourneyListItem } from "./use-journeys"
import JourneyCard from "./journey-card"
import UpcomingFeed from "./upcoming-feed"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, CalendarPlus } from "lucide-react"
import Link from "next/link"

type TabValue = "upcoming" | "active" | "completed"

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "session", label: "Sessions" },
  { value: "course", label: "Courses" },
  { value: "workshop", label: "Workshops" },
  { value: "package", label: "Packages" },
]

function filterJourneys(journeys: JourneyListItem[], filter: FilterType): JourneyListItem[] {
  if (filter === "all") return journeys
  return journeys.filter((j) => j.journey_type === filter)
}

export default function JourneysList() {
  const [activeTab, setActiveTab] = useState<TabValue>("upcoming")
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  const {
    journeys,
    upcomingJourneys,
    activeJourneys,
    completedJourneys,
    isLoading,
    error,
  } = useJourneys()

  // Apply filter across all tabs
  const filteredUpcoming = useMemo(
    () => filterJourneys(upcomingJourneys, activeFilter),
    [upcomingJourneys, activeFilter]
  )
  const filteredActive = useMemo(
    () => filterJourneys(activeJourneys, activeFilter),
    [activeJourneys, activeFilter]
  )
  const filteredCompleted = useMemo(
    () => filterJourneys(completedJourneys, activeFilter),
    [completedJourneys, activeFilter]
  )

  // For the upcoming feed, pass all journeys (not just "upcoming" status)
  // since we want to show next sessions from active journeys too
  const feedJourneys = useMemo(
    () => filterJourneys(journeys, activeFilter),
    [journeys, activeFilter]
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-8 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load your journeys. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList className="inline-flex w-auto gap-1 bg-transparent p-0">
          <TabsTrigger
            value="upcoming"
            className="rounded-full border border-sage-200/60 bg-cream-50 px-4 py-1.5 text-xs font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800"
          >
            Upcoming
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="rounded-full border border-sage-200/60 bg-cream-50 px-4 py-1.5 text-xs font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800"
          >
            Active{activeJourneys.length > 0 ? ` (${activeJourneys.length})` : ""}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-full border border-sage-200/60 bg-cream-50 px-4 py-1.5 text-xs font-normal text-olive-600 data-[state=active]:bg-olive-800 data-[state=active]:text-white data-[state=active]:border-olive-800"
          >
            Completed
          </TabsTrigger>
        </TabsList>

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === opt.value
                  ? "bg-sage-500 text-white"
                  : "bg-cream-100 text-olive-600 hover:bg-cream-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Upcoming tab — chronological feed */}
        <TabsContent value="upcoming" className="mt-6">
          <UpcomingFeed journeys={feedJourneys} />
        </TabsContent>

        {/* Active tab — journey cards grouped by purchase */}
        <TabsContent value="active" className="mt-6">
          {filteredActive.length === 0 ? (
            <EmptyState
              message="No active journeys found."
              subtext="When you have in-progress courses, packages, or upcoming sessions they will appear here."
            />
          ) : (
            <div className="space-y-4">
              {filteredActive.map((journey) => (
                <JourneyCard key={journey.journey_id} journey={journey} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed tab */}
        <TabsContent value="completed" className="mt-6">
          {filteredCompleted.length === 0 ? (
            <EmptyState
              message="No completed journeys yet."
              subtext="Finished courses, packages, and past sessions will show up here."
            />
          ) : (
            <div className="space-y-4">
              {filteredCompleted.map((journey) => (
                <JourneyCard key={journey.journey_id} journey={journey} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state helper
// ---------------------------------------------------------------------------

function EmptyState({
  message,
  subtext,
}: {
  message: string
  subtext: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <CalendarPlus className="h-12 w-12 text-sage-300 mb-3" />
        <h3 className="text-lg font-medium text-olive-900">{message}</h3>
        <p className="text-sm text-olive-500 mt-1 max-w-sm text-center">
          {subtext}
        </p>
        <Button asChild className="mt-4">
          <Link href="/marketplace">Explore Services</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
