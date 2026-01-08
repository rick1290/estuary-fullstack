"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, X, Check, Loader2, GripVertical } from "lucide-react"
import { toast } from "sonner"
import {
  practitionerCategoriesListOptions,
  practitionerCategoriesCreateMutation,
  practitionerCategoriesPartialUpdateMutation,
  practitionerCategoriesDestroyMutation,
} from "@/src/client/@tanstack/react-query.gen"
import type { PractitionerServiceCategoryReadable } from "@/src/client/types.gen"

interface ManageCategoriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Predefined colors for categories
const CATEGORY_COLORS = [
  { name: "Sage", value: "#9CAF88" },
  { name: "Terracotta", value: "#E07A5F" },
  { name: "Olive", value: "#7A6F5D" },
  { name: "Blush", value: "#F4A261" },
  { name: "Slate", value: "#64748b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Teal", value: "#14b8a6" },
]

export function ManageCategoriesDialog({ open, onOpenChange }: ManageCategoriesDialogProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state for creating/editing
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: CATEGORY_COLORS[0].value,
  })

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery({
    ...practitionerCategoriesListOptions(),
    enabled: open,
  })

  const categories = categoriesData?.data?.results || categoriesData?.results || []

  // Create mutation
  const createMutation = useMutation({
    ...practitionerCategoriesCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerCategoriesList"] })
      toast.success("Category created successfully")
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create category")
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    ...practitionerCategoriesPartialUpdateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerCategoriesList"] })
      toast.success("Category updated successfully")
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update category")
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    ...practitionerCategoriesDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerCategoriesList"] })
      toast.success("Category deleted successfully")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete category")
    },
  })

  const resetForm = () => {
    setFormData({ name: "", description: "", color: CATEGORY_COLORS[0].value })
    setEditingId(null)
    setIsCreating(false)
  }

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required")
      return
    }
    createMutation.mutate({
      body: {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
      },
    })
  }

  const handleUpdate = () => {
    if (!editingId || !formData.name.trim()) {
      toast.error("Category name is required")
      return
    }
    updateMutation.mutate({
      path: { id: editingId },
      body: {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
      },
    })
  }

  const handleDelete = (category: PractitionerServiceCategoryReadable) => {
    if (!category.id) return

    if (category.service_count && category.service_count > 0) {
      toast.error(`Cannot delete category with ${category.service_count} service(s). Remove services first.`)
      return
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteMutation.mutate({ path: { id: category.id } })
    }
  }

  const startEditing = (category: PractitionerServiceCategoryReadable) => {
    setEditingId(category.id || null)
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || CATEGORY_COLORS[0].value,
    })
    setIsCreating(false)
  }

  const startCreating = () => {
    resetForm()
    setIsCreating(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Create custom categories to organize your services. Categories help clients find your offerings.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Category List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 && !isCreating ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No categories yet. Create your first category to organize your services.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    editingId === category.id ? "border-sage-500 bg-sage-50" : "hover:bg-muted/50"
                  }`}
                >
                  {editingId === category.id ? (
                    // Edit mode
                    <div className="flex-1 space-y-3">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Category name"
                        className="h-8"
                      />
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description (optional)"
                        className="min-h-[60px] text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Color:</Label>
                        <div className="flex gap-1">
                          {CATEGORY_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className={`w-6 h-6 rounded-full border-2 ${
                                formData.color === color.value ? "border-gray-800" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => setFormData({ ...formData, color: color.value })}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdate}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="ml-1">Save</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetForm}>
                          <X className="h-4 w-4" />
                          <span className="ml-1">Cancel</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color || CATEGORY_COLORS[0].value }}
                        />
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        {category.service_count !== undefined && category.service_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {category.service_count} service{category.service_count !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEditing(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create Form */}
          {isCreating && (
            <div className="p-3 rounded-lg border border-sage-500 bg-sage-50 space-y-3">
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="New category name"
                className="h-8"
                autoFocus
              />
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description (optional)"
                className="min-h-[60px] text-sm"
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Color:</Label>
                <div className="flex gap-1">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 ${
                        formData.color === color.value ? "border-gray-800" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="ml-1">Create</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  <X className="h-4 w-4" />
                  <span className="ml-1">Cancel</span>
                </Button>
              </div>
            </div>
          )}

          {/* Add Category Button */}
          {!isCreating && !editingId && (
            <Button variant="outline" className="w-full" onClick={startCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
