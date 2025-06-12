"use client"

import { useState, useEffect } from "react"
import { PlusCircle, MoreHorizontal, Clock, Globe } from "lucide-react"
import PractitionerDashboardPageLayout from "@/components/dashboard/practitioner-dashboard-page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScheduleForm } from "@/components/dashboard/practitioner/availability/schedule-form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Schedule } from "@/types/availability"
import { useToast } from "@/hooks/use-toast"

// Mock data for initial schedules
const MOCK_SCHEDULES: Schedule[] = [
  {
    id: "schedule-1",
    name: "Weekday Schedule",
    description: "My regular weekday availability",
    is_default: true,
    timezone: "America/New_York",
    is_active: true,
    time_slots: [
      {
        id: "slot-1",
        day: 0,
        day_name: "Monday",
        start_time: "09:00:00",
        end_time: "12:00:00",
        is_active: true,
      },
      {
        id: "slot-2",
        day: 0,
        day_name: "Monday",
        start_time: "13:00:00",
        end_time: "17:00:00",
        is_active: true,
      },
      {
        id: "slot-3",
        day: 2,
        day_name: "Wednesday",
        start_time: "09:00:00",
        end_time: "12:00:00",
        is_active: true,
      },
      {
        id: "slot-4",
        day: 2,
        day_name: "Wednesday",
        start_time: "13:00:00",
        end_time: "17:00:00",
        is_active: true,
      },
      {
        id: "slot-5",
        day: 4,
        day_name: "Friday",
        start_time: "09:00:00",
        end_time: "15:00:00",
        is_active: true,
      },
    ],
  },
  {
    id: "schedule-2",
    name: "Weekend Schedule",
    description: "Weekend availability for special sessions",
    is_default: false,
    timezone: "America/New_York",
    is_active: true,
    time_slots: [
      {
        id: "slot-6",
        day: 5,
        day_name: "Saturday",
        start_time: "10:00:00",
        end_time: "14:00:00",
        is_active: true,
      },
      {
        id: "slot-7",
        day: 6,
        day_name: "Sunday",
        start_time: "12:00:00",
        end_time: "16:00:00",
        is_active: false,
      },
    ],
  },
]

export default function AvailabilityPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("my-availability")
  const [isCreating, setIsCreating] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const { toast } = useToast()

  // Fetch schedules (mock data for now)
  useEffect(() => {
    // In a real app, this would be an API call
    setTimeout(() => {
      setSchedules(MOCK_SCHEDULES)
      setIsLoading(false)
    }, 500)
  }, [])

  const handleCreateSchedule = () => {
    setEditingSchedule(null)
    setIsCreating(true)
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setIsCreating(false)
  }

  const handleSaveSchedule = (schedule: Schedule) => {
    if (isCreating) {
      // Add new schedule
      setSchedules([...schedules, { ...schedule, id: `schedule-${Date.now()}` }])
      toast({
        title: "Schedule created",
        description: "Your new availability schedule has been created.",
      })
    } else {
      // Update existing schedule
      setSchedules(schedules.map((s) => (s.id === schedule.id ? schedule : s)))
      toast({
        title: "Schedule updated",
        description: "Your availability schedule has been updated.",
      })
    }
    setIsCreating(false)
    setEditingSchedule(null)
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(schedules.filter((s) => s.id !== scheduleId))
    toast({
      title: "Schedule deleted",
      description: "Your availability schedule has been deleted.",
    })
  }

  const handleSetDefaultSchedule = (scheduleId: string) => {
    setSchedules(
      schedules.map((s) => ({
        ...s,
        is_default: s.id === scheduleId,
      })),
    )
    toast({
      title: "Default schedule set",
      description: "Your default availability schedule has been updated.",
    })
  }

  const handleToggleScheduleActive = (scheduleId: string, isActive: boolean) => {
    setSchedules(schedules.map((s) => (s.id === scheduleId ? { ...s, is_active: isActive } : s)))
    toast({
      title: isActive ? "Schedule activated" : "Schedule deactivated",
      description: `Your availability schedule has been ${isActive ? "activated" : "deactivated"}.`,
    })
  }

  const handleCancelEdit = () => {
    setIsCreating(false)
    setEditingSchedule(null)
  }

  return (
    <PractitionerDashboardPageLayout 
      title="Availability" 
      description="Manage your working hours and availability schedules"
    >
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={handleCreateSchedule} className="ml-auto bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        </div>

        <Tabs defaultValue="my-availability" className="w-full">
          <TabsList className="mb-6 bg-sage-100 p-1 rounded-lg">
            <TabsTrigger value="my-availability" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">My Availability</TabsTrigger>
            <TabsTrigger value="team-availability" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sage-700 text-olive-600 rounded-md">Team Availability</TabsTrigger>
          </TabsList>
          <TabsContent value="my-availability" className="space-y-4">
            {isCreating || editingSchedule ? (
              <ScheduleForm
                schedule={editingSchedule}
                isCreating={isCreating}
                onSave={handleSaveSchedule}
                onCancel={handleCancelEdit}
              />
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <Card key={schedule.id} className="overflow-hidden border-2 border-sage-200 hover:border-sage-300 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{schedule.name}</span>
                            {schedule.is_default && <Badge className="bg-sage-100 text-sage-700 border-sage-300">Default</Badge>}
                          </div>
                          <div className="flex items-center text-sm text-olive-600 mt-1">
                            <Clock className="mr-1 h-4 w-4" />
                            <span>
                              Mon - Fri, {schedule.time_slots[0]?.start_time.substring(0, 5)} -{" "}
                              {schedule.time_slots[0]?.end_time.substring(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-olive-600 mt-1">
                            <Globe className="mr-1 h-4 w-4" />
                            <span>{schedule.timezone.split("/")[1].replace("_", " ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={schedule.is_active}
                            onCheckedChange={(checked) => handleToggleScheduleActive(schedule.id, checked)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSchedule(schedule)}>Edit</DropdownMenuItem>
                              {!schedule.is_default && (
                                <DropdownMenuItem onClick={() => handleSetDefaultSchedule(schedule.id)}>
                                  Make default
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="team-availability">
            <Card className="border-2 border-sage-200 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Team availability management will be available soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PractitionerDashboardPageLayout>
  )
}
