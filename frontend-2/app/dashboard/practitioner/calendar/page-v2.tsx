"use client"

import { useState } from "react"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { CalendarDays, CalendarRange, Calendar, List } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import PractitionerCalendarView from "@/components/dashboard/practitioner/calendar/practitioner-calendar-view"
import PractitionerCalendarList from "@/components/dashboard/practitioner/calendar/practitioner-calendar-list"

const CALENDAR_TABS = [
  { value: "calendar", label: "Calendar" },
  { value: "list", label: "List" },
]

export default function CalendarPageV2() {
  const [activeTab, setActiveTab] = useState("calendar")
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week")

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Calendar"
        helpLink="/help/practitioner/calendar"
        tabs={CALENDAR_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="px-6 py-4">
        {activeTab === "calendar" && (
          <>
            {/* View Toggle */}
            <div className="flex justify-end mb-6">
              <ToggleGroup
                type="single"
                value={calendarView}
                onValueChange={(value: "day" | "week" | "month") => value && setCalendarView(value)}
                className="bg-muted/30 p-1 rounded-lg"
              >
                <ToggleGroupItem value="day" className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md px-3 py-1.5">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Day
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md px-3 py-1.5">
                  <CalendarRange className="h-4 w-4 mr-2" />
                  Week
                </ToggleGroupItem>
                <ToggleGroupItem value="month" className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md px-3 py-1.5">
                  <Calendar className="h-4 w-4 mr-2" />
                  Month
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {/* Calendar View */}
            <PractitionerCalendarView view={calendarView} />
          </>
        )}
        
        {activeTab === "list" && (
          <PractitionerCalendarList />
        )}
      </div>
    </>
  )
}