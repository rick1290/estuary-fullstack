"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  journalListOptions,
  journalListQueryKey,
  journalCreateMutation,
  journalDestroyMutation,
} from "@/src/client/@tanstack/react-query.gen"
import { journalCreate, journalDestroy } from "@/src/client/sdk.gen"
import type {
  JournalEntryReadable,
  JournalEntryCreateRequestWritable,
  EntryTypeEnum,
  PaginatedJournalEntryListReadable,
} from "@/src/client/types.gen"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Lightbulb,
  PenLine,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

interface JournalSectionProps {
  bookingUuid?: string
  serviceUuid?: string
  accentColor?: "sage" | "teal" | "amber"
}

const ENTRY_TYPES: {
  value: EntryTypeEnum
  label: string
  icon: typeof Lightbulb
  color: string
}[] = [
  { value: "intention", label: "Intention", icon: Lightbulb, color: "text-amber-600 bg-amber-50" },
  { value: "note", label: "Note", icon: PenLine, color: "text-olive-600 bg-olive-50" },
  { value: "reflection", label: "Reflection", icon: Sparkles, color: "text-teal-600 bg-teal-50" },
  { value: "takeaway", label: "Takeaway", icon: BookOpen, color: "text-sage-600 bg-sage-50" },
]

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  return new Date(String(value))
}

export default function JournalSection({
  bookingUuid,
  serviceUuid,
  accentColor = "sage",
}: JournalSectionProps) {
  const queryClient = useQueryClient()
  const [newContent, setNewContent] = useState("")
  const [newType, setNewType] = useState<EntryTypeEnum>("note")
  const [isAdding, setIsAdding] = useState(false)

  // Fetch journal entries
  const { data: entriesData, isLoading } = useQuery({
    ...journalListOptions({
      query: {
        ordering: "-created_at",
        page_size: 50,
      },
    }),
  })

  // All entries from the API (already user-scoped on the backend)
  const allEntries: JournalEntryReadable[] =
    (entriesData as PaginatedJournalEntryListReadable | undefined)?.results ?? []

  // Create entry mutation
  const { mutate: createEntry, isPending: isCreating } = useMutation({
    mutationFn: async (data: { content: string; entry_type: EntryTypeEnum }) => {
      const body: JournalEntryCreateRequestWritable = {
        content: data.content,
        entry_type: data.entry_type,
        ...(bookingUuid ? { booking_uuid: bookingUuid } : {}),
        ...(serviceUuid ? { service_uuid: serviceUuid } : {}),
      }
      return journalCreate({ body })
    },
    onSuccess: () => {
      setNewContent("")
      setIsAdding(false)
      toast.success("Journal entry saved")
      queryClient.invalidateQueries({ queryKey: journalListQueryKey() })
    },
    onError: () => {
      toast.error("Failed to save entry")
    },
  })

  // Delete entry mutation
  const { mutate: deleteEntry } = useMutation({
    mutationFn: async (uuid: string) => {
      return journalDestroy({ path: { public_uuid: uuid } })
    },
    onSuccess: () => {
      toast.success("Entry deleted")
      queryClient.invalidateQueries({ queryKey: journalListQueryKey() })
    },
    onError: () => {
      toast.error("Failed to delete entry")
    },
  })

  return (
    <div className="mb-11">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-sage-200/60">
        <div className="text-[11px] font-medium tracking-widest uppercase text-olive-500">
          Your Journal
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="text-olive-500 hover:text-olive-700 rounded-full text-xs h-7"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Entry
          </Button>
        )}
      </div>

      {/* New entry form */}
      {isAdding && (
        <div className="bg-white border border-sage-200/60 rounded-xl p-5 mb-4">
          {/* Entry type selector */}
          <div className="flex gap-2 mb-3">
            {ENTRY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setNewType(type.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  newType === type.value
                    ? type.color + " ring-1 ring-current/20"
                    : "text-olive-400 bg-cream-50 hover:bg-sage-50"
                }`}
              >
                <type.icon className="h-3 w-3" />
                {type.label}
              </button>
            ))}
          </div>

          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={
              newType === "intention"
                ? "What's your intention for this session?"
                : newType === "reflection"
                  ? "What insights came up during this session?"
                  : newType === "takeaway"
                    ? "What will you take away from this experience?"
                    : "Write your thoughts..."
            }
            className="min-h-[100px] border-sage-200/60 bg-cream-50/30 text-[15px] font-light leading-relaxed text-olive-700 placeholder:text-olive-300 rounded-xl resize-none mb-3"
            autoFocus
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-sage-600 hover:bg-sage-700 text-white rounded-full px-5"
              onClick={() => createEntry({ content: newContent, entry_type: newType })}
              disabled={!newContent.trim() || isCreating}
            >
              {isCreating ? "Saving..." : "Save Entry"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-olive-400 rounded-full"
              onClick={() => {
                setIsAdding(false)
                setNewContent("")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Entries timeline */}
      {allEntries.length > 0 ? (
        <div className="space-y-3">
          {allEntries.map((entry) => {
            const typeConfig =
              ENTRY_TYPES.find((t) => t.value === entry.entry_type) ?? ENTRY_TYPES[1]
            const TypeIcon = typeConfig.icon
            return (
              <div
                key={entry.public_uuid ?? entry.id}
                className="bg-white border border-sage-200/60 rounded-xl p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color}`}
                  >
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 rounded-full ${typeConfig.color} border-current/20`}
                      >
                        {typeConfig.label}
                      </Badge>
                      <span className="text-[11px] text-olive-400">
                        {entry.created_at
                          ? format(toDate(entry.created_at), "MMM d, yyyy · h:mm a")
                          : ""}
                      </span>
                    </div>
                    <p className="text-[14px] font-light leading-relaxed text-olive-700 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (entry.public_uuid) deleteEntry(entry.public_uuid)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-olive-300 hover:text-red-400 transition p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : !isAdding ? (
        <div className="text-center py-8">
          <BookOpen className="h-8 w-8 text-olive-300 mx-auto mb-3" />
          <p className="text-sm text-olive-400 mb-1">No journal entries yet</p>
          <p className="text-xs text-olive-300 mb-4">
            Record your intentions, reflections, and takeaways
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-sage-200 text-olive-500"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Write Your First Entry
          </Button>
        </div>
      ) : null}
    </div>
  )
}
