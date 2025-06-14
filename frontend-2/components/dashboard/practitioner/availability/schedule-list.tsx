"use client"

import type { Schedule } from "@/types/availability"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Clock, Globe, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ScheduleListProps {
  schedules: Schedule[]
  isLoading: boolean
  onEdit: (schedule: Schedule) => void
  onDelete: (scheduleId: string) => void
  onSetDefault: (scheduleId: string) => void
  onToggleActive: (scheduleId: string, isActive: boolean) => void
}

export function ScheduleList({
  schedules,
  isLoading,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleActive,
}: ScheduleListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-12 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">No schedules found</h3>
        <p className="text-muted-foreground mb-6">You haven't created any availability schedules yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{schedule.name}</span>
                  {schedule.is_default && <Badge>Default</Badge>}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>
                    Mon - Fri, {schedule.time_slots[0]?.start_time.substring(0, 5)} -{" "}
                    {schedule.time_slots[0]?.end_time.substring(0, 5)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Globe className="mr-1 h-4 w-4" />
                  <span>{schedule.timezone.split("/")[1].replace("_", " ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={schedule.is_active}
                  onCheckedChange={(checked) => onToggleActive(schedule.id, checked)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(schedule)}>Edit</DropdownMenuItem>
                    {!schedule.is_default && (
                      <DropdownMenuItem onClick={() => onSetDefault(schedule.id)}>Make default</DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete(schedule.id)}
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
  )
}
