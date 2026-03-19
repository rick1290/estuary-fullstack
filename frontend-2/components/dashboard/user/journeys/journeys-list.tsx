"use client"

import { useState, useMemo } from "react"
import { useJourneys, type FilterType, type JourneyListItem } from "./use-journeys"
import JourneyCard from "./journey-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CalendarPlus, CalendarClock } from "lucide-react"
import Link from "next/link"

type TabValue = "all" | "upcoming" | "completed" | "unscheduled"

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
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  const {
    journeys,
    unscheduledJourneys,
    upcomingJourneys,
    completedJourneys,
    isLoading,
    error,
  } = useJourneys()

  const filteredAll = useMemo(
    () => filterJourneys(journeys, activeFilter),
    [journeys, activeFilter]
  )
  const filteredUnscheduled = useMemo(
    () => filterJourneys(unscheduledJourneys, activeFilter),
    [unscheduledJourneys, activeFilter]
  )
  const filteredUpcoming = useMemo(
    () => filterJourneys(upcomingJourneys, activeFilter),
    [upcomingJourneys, activeFilter]
  )
  const filteredCompleted = useMemo(
    () => filterJourneys(completedJourneys, activeFilter),
    [completedJourneys, activeFilter]
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex gap-4 p-4 bg-white border border-sage-200/60 rounded-xl"
            >
              <Skeleton className="w-16 h-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
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
    <div className="space-y-5">
      {/* Page header */}
      <h1 className="font-serif text-2xl font-light text-olive-900">
        My Journeys
      </h1>

      {/* Tabs + Filters */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="inline-flex w-auto gap-1 bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="rounded-full border border-sage-200/60 bg-cream-50/80 px-4 py-1.5 text-xs font-medium text-olive-500 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:border-sage-600 transition-colors"
            >
              All
              {journeys.length > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({journeys.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="rounded-full border border-sage-200/60 bg-cream-50/80 px-4 py-1.5 text-xs font-medium text-olive-500 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:border-sage-600 transition-colors"
            >
              Upcoming
              {upcomingJourneys.length > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({upcomingJourneys.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="unscheduled"
              className="rounded-full border border-sage-200/60 bg-cream-50/80 px-4 py-1.5 text-xs font-medium text-olive-500 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-500 transition-colors"
            >
              {unscheduledJourneys.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5 data-[state=active]:bg-white" />
              )}
              Unscheduled
              {unscheduledJourneys.length > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({unscheduledJourneys.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-full border border-sage-200/60 bg-cream-50/80 px-4 py-1.5 text-xs font-medium text-olive-500 data-[state=active]:bg-sage-600 data-[state=active]:text-white data-[state=active]:border-sage-600 transition-colors"
            >
              Completed
            </TabsTrigger>
          </TabsList>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  activeFilter === opt.value
                    ? "bg-sage-100 text-sage-700 border border-sage-300"
                    : "text-olive-400 border border-transparent hover:border-sage-200 hover:text-olive-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* All tab */}
        <TabsContent value="all" className="mt-5">
          {filteredAll.length === 0 ? (
            <EmptyState
              message="No journeys yet"
              subtext="Book a session, course, or workshop to start your wellness journey."
            />
          ) : (
            <div className="space-y-5">
              {/* Unscheduled banner — sticky at top when viewing All */}
              {filteredUnscheduled.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-[12px] font-medium tracking-wider uppercase text-amber-700">
                      Needs Scheduling ({filteredUnscheduled.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {filteredUnscheduled.map((journey) => (
                      <JourneyCard key={journey.journey_id} journey={journey} />
                    ))}
                  </div>
                </div>
              )}

              {/* Remaining journeys */}
              {filteredAll.filter((j) => j.status !== "unscheduled").length > 0 && (
                <div className="space-y-2">
                  {filteredAll
                    .filter((j) => j.status !== "unscheduled")
                    .map((journey) => (
                      <JourneyCard key={journey.journey_id} journey={journey} />
                    ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Upcoming tab */}
        <TabsContent value="upcoming" className="mt-5">
          {filteredUpcoming.length === 0 ? (
            <EmptyState
              message="Nothing upcoming"
              subtext="Your upcoming sessions and events will appear here."
            />
          ) : (
            <div className="space-y-2">
              {filteredUpcoming.map((journey) => (
                <JourneyCard key={journey.journey_id} journey={journey} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed tab */}
        <TabsContent value="completed" className="mt-5">
          {filteredCompleted.length === 0 ? (
            <EmptyState
              message="No completed journeys yet"
              subtext="Finished courses, packages, and past sessions show up here."
            />
          ) : (
            <div className="space-y-2">
              {filteredCompleted.map((journey) => (
                <JourneyCard key={journey.journey_id} journey={journey} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Unscheduled tab */}
        <TabsContent value="unscheduled" className="mt-5">
          {filteredUnscheduled.length === 0 ? (
            <EmptyState
              message="Nothing to schedule"
              subtext="When you purchase packages or bundles, unscheduled sessions appear here."
            />
          ) : (
            <div className="space-y-2">
              {filteredUnscheduled.map((journey) => (
                <JourneyCard key={journey.journey_id} journey={journey} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({
  message,
  subtext,
}: {
  message: string
  subtext: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white border border-sage-200/60 rounded-xl">
      <CalendarPlus className="h-10 w-10 text-sage-300 mb-4" />
      <h3 className="text-lg font-medium text-olive-900">{message}</h3>
      <p className="text-sm text-olive-400 mt-1.5 max-w-sm text-center">
        {subtext}
      </p>
      <Link
        href="/marketplace"
        className="mt-5 inline-flex items-center px-5 py-2 rounded-full bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 transition-colors"
      >
        Explore Services
      </Link>
    </div>
  )
}
