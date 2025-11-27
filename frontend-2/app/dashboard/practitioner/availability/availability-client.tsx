"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusCircle, MoreHorizontal, Clock, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScheduleForm } from "@/components/dashboard/practitioner/availability/schedule-form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/lib/auth-service"
import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import { 
  schedulesListOptions,
  schedulesCreateMutation,
  schedulesUpdateMutation,
  schedulesDestroyMutation,
  schedulesSetDefaultCreateMutation,
  schedulesAddTimeSlotCreateMutation,
  schedulesRemoveTimeSlotDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"
import type { ScheduleReadable, ScheduleWritable } from "@/src/client/types.gen"
import { Skeleton } from "@/components/ui/skeleton"
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

export default function AvailabilityClient() {
  const [isCreating, setIsCreating] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleReadable | null>(null)
  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch schedules
  const { data: schedulesData, isLoading } = useQuery(schedulesListOptions())
  const schedules = (schedulesData?.results || []).sort((a, b) => {
    // Default schedule first
    if (a.is_default && !b.is_default) return -1
    if (!a.is_default && b.is_default) return 1

    // Then active schedules before inactive
    if (a.is_active && !b.is_active) return -1
    if (!a.is_active && b.is_active) return 1

    // Finally alphabetical by name
    return a.name.localeCompare(b.name)
  })

  // Create schedule mutation
  const createMutation = useMutation({
    ...schedulesCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Schedule created",
        description: "Your new availability schedule has been created.",
      })
      queryClient.invalidateQueries({
        queryKey: schedulesListOptions().queryKey
      })
      setIsCreating(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create schedule.",
        variant: "destructive",
      })
    },
  })

  // Update schedule mutation
  const updateMutation = useMutation({
    ...schedulesUpdateMutation(),
    onSuccess: () => {
      toast({
        title: "Schedule updated",
        description: "Your availability schedule has been updated.",
      })
      queryClient.invalidateQueries({
        queryKey: schedulesListOptions().queryKey
      })
      setEditingSchedule(null)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update schedule.",
        variant: "destructive",
      })
    },
  })

  // Delete schedule mutation
  const deleteMutation = useMutation({
    ...schedulesDestroyMutation(),
    onSuccess: () => {
      toast({
        title: "Schedule deleted",
        description: "Your availability schedule has been deleted.",
      })
      queryClient.invalidateQueries({
        queryKey: schedulesListOptions().queryKey
      })
      setDeleteScheduleId(null)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete schedule.",
        variant: "destructive",
      })
    },
  })

  // Set default schedule mutation
  const setDefaultMutation = useMutation({
    ...schedulesSetDefaultCreateMutation(),
    onSuccess: () => {
      toast({
        title: "Default schedule set",
        description: "Your default availability schedule has been updated.",
      })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to set default schedule.",
        variant: "destructive",
      })
    },
  })

  // Add time slot mutation
  const addTimeSlotMutation = useMutation({
    ...schedulesAddTimeSlotCreateMutation(),
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add time slot.",
        variant: "destructive",
      })
    },
  })

  // Remove time slot mutation
  const removeTimeSlotMutation = useMutation({
    ...schedulesRemoveTimeSlotDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: schedulesListOptions().queryKey
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove time slot.",
        variant: "destructive",
      })
    },
  })

  const handleCreateSchedule = () => {
    setEditingSchedule(null)
    setIsCreating(true)
  }

  const handleEditSchedule = (schedule: ScheduleReadable) => {
    setEditingSchedule(schedule)
    setIsCreating(false)
  }

  const handleSaveSchedule = async (scheduleData: Partial<ScheduleWritable>, timeSlots?: any[]) => {
    if (isCreating) {
      // For new schedules, create with time slots
      await createMutation.mutateAsync({
        body: {
          ...scheduleData,
          time_slots: timeSlots || []
        } as ScheduleWritable
      })
    } else if (editingSchedule) {
      // First update the schedule basic info
      await updateMutation.mutateAsync({
        path: { id: editingSchedule.id },
        body: scheduleData as ScheduleWritable
      })
      
      // Then handle time slots updates separately if provided
      if (timeSlots && editingSchedule) {
        // Get existing time slots
        const existingSlots = editingSchedule.time_slots || []
        
        // Compare and update time slots
        const existingSlotsMap = new Map(
          existingSlots.map(slot => [
            `${slot.day}-${slot.start_time}-${slot.end_time}`,
            slot
          ])
        )
        
        const newSlotsMap = new Map(
          timeSlots.map(slot => [
            `${slot.day}-${slot.start_time}-${slot.end_time}`,
            slot
          ])
        )
        
        // Find slots to remove
        const slotsToRemove = existingSlots.filter(
          slot => !newSlotsMap.has(`${slot.day}-${slot.start_time}-${slot.end_time}`)
        )
        
        // Find slots to add
        const slotsToAdd = timeSlots.filter(
          slot => !existingSlotsMap.has(`${slot.day}-${slot.start_time}-${slot.end_time}`)
        )
        
        // Remove old slots
        for (const slot of slotsToRemove) {
          if (slot.id) {
            await removeTimeSlotMutation.mutateAsync({
              path: { id: editingSchedule.id },
              body: { time_slot_id: slot.id }
            })
          }
        }
        
        // Add new slots
        for (const slot of slotsToAdd) {
          await addTimeSlotMutation.mutateAsync({
            path: { id: editingSchedule.id },
            body: slot
          })
        }
        
        // Refresh the data
        queryClient.invalidateQueries({ queryKey: ['schedules'] })
      }
    }
  }

  const handleDeleteSchedule = async () => {
    if (deleteScheduleId) {
      await deleteMutation.mutateAsync({
        path: { id: deleteScheduleId }
      })
    }
  }

  const handleSetDefaultSchedule = async (scheduleId: number) => {
    await setDefaultMutation.mutateAsync({
      path: { id: scheduleId }
    })
  }

  const handleToggleScheduleActive = async (schedule: ScheduleReadable) => {
    await updateMutation.mutateAsync({
      path: { id: schedule.id },
      body: {
        ...schedule,
        is_active: !schedule.is_active
      } as ScheduleWritable
    })
  }

  const handleCancelEdit = () => {
    setIsCreating(false)
    setEditingSchedule(null)
  }

  // Format time slot display
  const formatTimeSlots = (schedule: ScheduleReadable) => {
    if (!schedule.time_slots || schedule.time_slots.length === 0) {
      return "No time slots configured"
    }

    // Group time slots by day
    const slotsByDay = schedule.time_slots.reduce((acc, slot) => {
      if (!acc[slot.day]) {
        acc[slot.day] = []
      }
      acc[slot.day].push(slot)
      return acc
    }, {} as Record<number, typeof schedule.time_slots>)

    // Get day range
    const days = Object.keys(slotsByDay).map(Number).sort()
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    if (days.length === 0) return "No availability"
    
    // Simple display of first and last day
    const firstDay = dayNames[days[0]]
    const lastDay = dayNames[days[days.length - 1]]
    const firstSlot = slotsByDay[days[0]][0]
    
    return `${firstDay} - ${lastDay}, ${firstSlot.start_time.substring(0, 5)} - ${firstSlot.end_time.substring(0, 5)}`
  }

  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Availability"
        helpLink="/help/practitioner/availability"
        action={!isCreating && !editingSchedule ? {
          label: "New Schedule",
          icon: <PlusCircle className="h-4 w-4" />,
          onClick: handleCreateSchedule
        } : undefined}
      />

      <div className="px-6 py-4">
        {isCreating || editingSchedule ? (
          <ScheduleForm
            schedule={editingSchedule}
            isCreating={isCreating}
            onSave={handleSaveSchedule}
            onCancel={handleCancelEdit}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-64 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : schedules.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No schedules yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first availability schedule to start accepting bookings
                    </p>
                    <Button onClick={handleCreateSchedule}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              schedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className="overflow-hidden cursor-pointer hover:border-sage-300 hover:shadow-md transition-all"
                  onClick={() => handleEditSchedule(schedule)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{schedule.name}</span>
                          {schedule.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          {!schedule.is_active && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{schedule.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimeSlots(schedule)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            {schedule.timezone}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleScheduleActive(schedule)}
                          disabled={updateMutation.isPending}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditSchedule(schedule)}>
                              Edit
                            </DropdownMenuItem>
                            {!schedule.is_default && (
                              <DropdownMenuItem
                                onClick={() => handleSetDefaultSchedule(schedule.id)}
                                disabled={setDefaultMutation.isPending}
                              >
                                Make default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteScheduleId(schedule.id)}
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
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this availability schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSchedule}
              disabled={deleteMutation.isPending}
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