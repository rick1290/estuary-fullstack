"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Plus, Edit, Trash, Save, X } from "lucide-react"
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

interface ClientNotesProps {
  clientId: string
}

interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string | null
}

// Mock data - replace with actual API call
const mockNotes = [
  {
    id: "1",
    content:
      "Client expressed interest in group workshops for team building. Follow up with corporate package options.",
    createdAt: "2023-04-28T14:30:00",
    updatedAt: null,
  },
  {
    id: "2",
    content: "Prefers morning sessions. Has mentioned stress related to work-life balance.",
    createdAt: "2023-03-15T10:00:00",
    updatedAt: "2023-03-16T09:45:00",
  },
  {
    id: "3",
    content: "Allergic to lavender - avoid using this essential oil during sessions.",
    createdAt: "2023-02-10T13:00:00",
    updatedAt: null,
  },
]

export default function ClientNotes({ clientId }: ClientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState("")
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call
    const fetchNotes = async () => {
      setLoading(true)
      // Replace with actual API call
      setTimeout(() => {
        setNotes(mockNotes)
        setLoading(false)
      }, 1000)
    }

    fetchNotes()
  }, [clientId])

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const newNoteObj = {
      id: Date.now().toString(),
      content: newNote,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }

    setNotes([newNoteObj, ...notes])
    setNewNote("")
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
  }

  const handleSaveEdit = () => {
    if (!editingNote) return

    const updatedNotes = notes.map((note) =>
      note.id === editingNote.id ? { ...editingNote, updatedAt: new Date().toISOString() } : note,
    )

    setNotes(updatedNotes)
    setEditingNote(null)
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleDeletePrompt = (noteId: string) => {
    setNoteToDelete(noteId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!noteToDelete) return

    const updatedNotes = notes.filter((note) => note.id !== noteToDelete)
    setNotes(updatedNotes)
    setDeleteDialogOpen(false)
    setNoteToDelete(null)
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setNoteToDelete(null)
  }

  if (loading) {
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
        <Button onClick={handleAddNote} disabled={!newNote.trim()} className="flex items-center">
          <Plus className="mr-2 h-4 w-4" />
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
                      <Button size="sm" onClick={handleSaveEdit} disabled={!editingNote.content.trim()}>
                        <Save className="mr-2 h-3 w-3" />
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
                      {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      {note.updatedAt && ` (Edited ${format(new Date(note.updatedAt), "MMM d, yyyy 'at' h:mm a")})`}
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
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
