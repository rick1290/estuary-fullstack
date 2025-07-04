"use client"

import { useState } from "react"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CalendarDays, CalendarRange, Calendar, List } from "lucide-react"
import PractitionerCalendarView from "@/components/dashboard/practitioner/calendar/practitioner-calendar-view"
import PractitionerCalendarList from "@/components/dashboard/practitioner/calendar/practitioner-calendar-list"

export default function PractitionerCalendarPage() {
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week")

  return (
    <PractitionerDashboardPageLayout 
      title="Calendar" 
      description="View and manage your upcoming calendar and bookings"
    >
      <Tabs defaultValue="calendar" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-sage-100 p-1 rounded-lg">
            <TabsTrigger value="calendar" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md flex items-center gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-0">
            <ToggleGroup
              type="single"
              value={calendarView}
              onValueChange={(value: "day" | "week" | "month") => value && setCalendarView(value)}
              className="bg-sage-100 p-1 rounded-lg"
            >
              <ToggleGroupItem value="day" className="data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-sage-700 text-olive-600 rounded-md px-3 py-1.5">
                <CalendarDays className="h-4 w-4 mr-2" />
                Day
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-sage-700 text-olive-600 rounded-md px-3 py-1.5">
                <CalendarRange className="h-4 w-4 mr-2" />
                Week
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-sage-700 text-olive-600 rounded-md px-3 py-1.5">
                <Calendar className="h-4 w-4 mr-2" />
                Month
              </ToggleGroupItem>
            </ToggleGroup>
          </TabsContent>
        </div>
        
        <TabsContent value="calendar">
          <PractitionerCalendarView view={calendarView} />
        </TabsContent>
        <TabsContent value="list">
          <PractitionerCalendarList />
        </TabsContent>
      </Tabs>
    </PractitionerDashboardPageLayout>
  )
}