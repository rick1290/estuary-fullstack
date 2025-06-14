"use client"

import { useState } from "react"
import { type Schedule, DAYS_OF_WEEK, formatTime } from "@/types/availability"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Edit, MoreVertical, Trash2, Calendar, Check } from "lucide-react"
import { WeeklyScheduleGrid } from "./weekly-schedule-grid"

interface ScheduleCardProps {
  schedule: Schedule
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  onToggleActive: (isActive: boolean) => void
}

export function ScheduleCard({ schedule, onEdit, onDelete, onSetDefault, onToggleActive }: ScheduleCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Group time slots by day
  const timeSlotsByDay = DAYS_OF_WEEK.map((day, index) => {
    return schedule.time_slots.filter((slot) => slot.day === index)
  })

  // Count active time slots
  const activeSlotCount = schedule.time_slots.filter((slot) => slot.is_active).length

  // Get timezone display name
  const timezone = schedule.timezone.replace(/_/g, " ").split("/").pop()

  return (
    <>
      <Card className={`overflow-hidden transition-all ${schedule.is_active ? "" : "opacity-70"}`}>
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{schedule.name}</h3>
                  {schedule.is_default && (
                    <Badge variant="default" className="bg-green-600">
                      Default
                    </Badge>
                  )}
                  {!schedule.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                {schedule.description && <p className="text-muted-foreground mt-1">{schedule.description}</p>}
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {timezone} • {activeSlotCount} time slots
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <Switch checked={schedule.is_active} onCheckedChange={onToggleActive} />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Schedule
                    </DropdownMenuItem>
                    {!schedule.is_default && (
                      <DropdownMenuItem onClick={onSetDefault}>
                        <Check className="mr-2 h-4 w-4" />
                        Set as Default
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Schedule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {expanded ? (
              <WeeklyScheduleGrid timeSlots={schedule.time_slots} readOnly={true} />
            ) : (
              <div className="grid grid-cols-7 gap-2 mb-4">
                {DAYS_OF_WEEK.map((day, index) => {
                  const daySlots = timeSlotsByDay[index]
                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-md border ${daySlots.length ? "bg-muted/50" : "bg-muted/20"}`}
                    >
                      <div className="text-sm font-medium mb-2">{day}</div>
                      {daySlots.length ? (
                        <div className="space-y-1">
                          {daySlots.slice(0, 2).map((slot) => (
                            <div
                              key={slot.id}
                              className={`text-xs p-1 rounded ${slot.is_active ? "bg-primary/10" : "bg-muted line-through"}`}
                            >
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </div>
                          ))}
                          {daySlots.length > 2 && (
                            <div className="text-xs text-muted-foreground">+{daySlots.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No slots</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Show Less" : "Show More"}
              </Button>
              <Button variant="default" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
