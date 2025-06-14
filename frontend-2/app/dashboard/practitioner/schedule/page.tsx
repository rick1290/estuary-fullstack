import type { Metadata } from "next"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PractitionerCalendarView from "@/components/dashboard/practitioner/schedule/practitioner-calendar-view"
import PractitionerScheduleList from "@/components/dashboard/practitioner/schedule/practitioner-schedule-list"

export const metadata: Metadata = {
  title: "Schedule | Practitioner Portal",
  description: "View and manage your upcoming schedule and bookings",
}

export default function PractitionerSchedulePage() {
  return (
    <PractitionerDashboardPageLayout 
      title="Schedule" 
      description="View and manage your upcoming schedule and bookings"
    >
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-6 bg-sage-100 p-1 rounded-lg">
          <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">List View</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <PractitionerCalendarView />
        </TabsContent>
        <TabsContent value="list">
          <PractitionerScheduleList />
        </TabsContent>
      </Tabs>
    </PractitionerDashboardPageLayout>
  )
}
