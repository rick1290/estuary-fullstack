import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PractitionerCalendarView from "@/components/dashboard/practitioner/schedule/practitioner-calendar-view"
import PractitionerScheduleList from "@/components/dashboard/practitioner/schedule/practitioner-schedule-list"

export const metadata: Metadata = {
  title: "Schedule | Practitioner Portal",
  description: "View and manage your upcoming schedule and bookings",
}

export default function PractitionerSchedulePage() {
  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <PractitionerCalendarView />
        </TabsContent>
        <TabsContent value="list">
          <PractitionerScheduleList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
