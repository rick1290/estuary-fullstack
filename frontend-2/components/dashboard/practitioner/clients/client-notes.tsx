"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Plus, Edit, Trash, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  practitionersClientsNotesRetrieveOptions,
  practitionersClientsNotesCreateMutation,
  practitionersClientsNotesUpdateMutation,
  practitionersClientsNotesDestroyMutation,
} from "@/src/client/@tanstack/react-query.gen"
import { toast } from "sonner"

interface ClientNotesProps {
  clientId: string
}

interface Note {
  id: string | number
  content: string
  created_at: string
  updated_at: string
}

export default function ClientNotes({ clientId }: ClientNotesProps) {
  const [newNote, setNewNote] = useState("")
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | number | null>(null)
  const queryClient = useQueryClient()

  // Fetch notes from API
  const { data: notes = [], isLoading, error } = useQuery({
    ...practitionersClientsNotesRetrieveOptions({
      path: { client_id: clientId },
    }),
  })

  // Create note mutation
  const createNoteMutation = useMutation({
    ...practitionersClientsNotesCreateMutation(),
    onSuccess: () => {
      toast.success("Note added successfully")
      setNewNote("")
      queryClient.invalidateQueries({ 
        queryKey: ['practitionersClientsNotesRetrieve', { path: { client_id: clientId } }] 
      })
    },
    onError: () => {
      toast.error("Failed to add note")
    },
  })

  // Update note mutation
  const updateNoteMutation = useMutation({
    ...practitionersClientsNotesUpdateMutation(),
    onSuccess: () => {
      toast.success("Note updated successfully")
      setEditingNote(null)
      queryClient.invalidateQueries({ 
        queryKey: ['practitionersClientsNotesRetrieve', { path: { client_id: clientId } }] 
      })
    },
    onError: () => {
      toast.error("Failed to update note")
    },
  })

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    ...practitionersClientsNotesDestroyMutation(),
    onSuccess: () => {
      toast.success("Note deleted successfully")
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
      queryClient.invalidateQueries({ 
        queryKey: ['practitionersClientsNotesRetrieve', { path: { client_id: clientId } }] 
      })
    },
    onError: () => {
      toast.error("Failed to delete note")
    },
  })

  const handleAddNote = () => {
    if (!newNote.trim()) return

    createNoteMutation.mutate({
      path: { client_id: clientId },
      body: { content: newNote },
    })
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
  }

  const handleSaveEdit = () => {
    if (!editingNote) return

    updateNoteMutation.mutate({
      path: { note_id: String(editingNote.id) },
      body: { content: editingNote.content },
    })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleDeletePrompt = (noteId: string | number) => {
    setNoteToDelete(noteId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!noteToDelete) return

    deleteNoteMutation.mutate({
      path: { note_id: String(noteToDelete) },
    })
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setNoteToDelete(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full mb-4" />
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-20 w-full my-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Textarea
          placeholder="Add a new note about this client..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="mb-2 min-h-[100px]"
        />
        <Button 
          onClick={handleAddNote} 
          disabled={!newNote.trim() || createNoteMutation.isPending} 
          className="flex items-center"
        >
          {createNoteMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-medium">No notes yet</p>
          <p className="text-sm text-muted-foreground">Add your first note about this client above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note, index) => (
            <Card key={note.id} className="overflow-hidden">
              <CardContent className="p-4">
                {editingNote && editingNote.id === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingNote.content}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="mr-2 h-3 w-3" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveEdit} 
                        disabled={!editingNote.content.trim() || updateNoteMutation.isPending}
                      >
                        {updateNoteMutation.isPending ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-3 w-3" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start">
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      <div className="flex ml-4 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditNote(note)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeletePrompt(note.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                      {note.updated_at && note.updated_at !== note.created_at && 
                        ` (Edited ${format(parseISO(note.updated_at), "MMM d, yyyy 'at' h:mm a")})`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteNoteMutation.isPending}
            >
              {deleteNoteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
