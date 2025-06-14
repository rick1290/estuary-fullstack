"use client"

import { useState } from "react"
import { type TimeSlot, DAYS_OF_WEEK } from "@/types/availability"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
import { Edit, Trash2 } from "lucide-react"

interface TimeSlotActionsProps {
  timeSlots: TimeSlot[]
  onEdit: (timeSlot: TimeSlot) => void
  onDelete: (timeSlotId: string) => void
  onToggleActive: (timeSlotId: string, isActive: boolean) => void
}

export function TimeSlotActions({ timeSlots, onEdit, onDelete, onToggleActive }: TimeSlotActionsProps) {
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null)

  const handleDeleteClick = (slotId: string) => {
    setDeleteSlotId(slotId)
  }

  const handleConfirmDelete = () => {
    if (deleteSlotId) {
      onDelete(deleteSlotId)
      setDeleteSlotId(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteSlotId(null)
  }

  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            No time slots added yet. Click "Add Time Slot" to create your first availability slot.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell>{DAYS_OF_WEEK[slot.day]}</TableCell>
                  <TableCell>{slot.start_time.substring(0, 5)}</TableCell>
                  <TableCell>{slot.end_time.substring(0, 5)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={slot.is_active}
                        onCheckedChange={(checked) => onToggleActive(slot.id, checked)}
                        size="sm"
                      />
                      <Badge variant={slot.is_active ? "default" : "outline"}>
                        {slot.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(slot)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(slot.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteSlotId} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
