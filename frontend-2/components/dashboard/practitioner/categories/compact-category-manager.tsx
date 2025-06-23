"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreVertical, Edit, Trash2, FolderOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  practitionerCategoriesListOptions,
  practitionerCategoriesCreateMutation,
  practitionerCategoriesUpdateMutation,
  practitionerCategoriesDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"

// Color options for categories
const COLOR_OPTIONS = [
  { name: "Blue", value: "#3B82F6", bg: "bg-blue-500" },
  { name: "Green", value: "#10B981", bg: "bg-emerald-500" },
  { name: "Purple", value: "#8B5CF6", bg: "bg-violet-500" },
  { name: "Pink", value: "#EC4899", bg: "bg-pink-500" },
  { name: "Orange", value: "#F59E0B", bg: "bg-amber-500" },
  { name: "Red", value: "#EF4444", bg: "bg-red-500" },
  { name: "Teal", value: "#14B8A6", bg: "bg-teal-500" },
  { name: "Indigo", value: "#6366F1", bg: "bg-indigo-500" },
]

interface PractitionerCategory {
  id: number
  name: string
  description?: string
  color?: string
  service_count?: number
  created_at: string
  updated_at: string
}

interface CategoryFormData {
  name: string
  description: string
  color: string
}

const initialFormData: CategoryFormData = {
  name: "",
  description: "",
  color: COLOR_OPTIONS[0].value,
}

interface CompactCategoryManagerProps {
  onCategoryChange?: () => void
}

export default function CompactCategoryManager({ onCategoryChange }: CompactCategoryManagerProps = {}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<PractitionerCategory | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: categoriesData, isLoading, refetch } = useQuery(practitionerCategoriesListOptions())
  
  const categories = categoriesData?.results || []

  const createMutation = useMutation({
    ...practitionerCategoriesCreateMutation(),
    onSuccess: (data) => {
      console.log('Category created:', data)
      queryClient.invalidateQueries({ queryKey: ['practitionerCategoriesList'] })
      refetch() // Force immediate refetch
      onCategoryChange?.() // Notify parent
      setIsCreateDialogOpen(false)
      setFormData(initialFormData)
      toast({
        title: "Category Created",
        description: "Your new category has been created successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormData }) => {
      // Mock API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-categories'] })
      setIsEditDialogOpen(false)
      setEditingCategory(null)
      setFormData(initialFormData)
      toast({
        title: "Category Updated",
        description: "Your category has been updated successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Mock API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-categories'] })
      toast({
        title: "Category Deleted",
        description: "Your category has been deleted successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      })
      return
    }
    createMutation.mutate({ body: formData })
  }

  const handleEdit = (category: PractitionerCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || COLOR_OPTIONS[0].value,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!editingCategory) return
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      })
      return
    }
    
    updateMutation.mutate({ 
      path: { id: editingCategory.id },
      body: formData 
    })
  }

  const handleDelete = (category: PractitionerCategory) => {
    if (category.service_count && category.service_count > 0) {
      toast({
        title: "Cannot Delete",
        description: `This category has ${category.service_count} services. Please move or delete them first.`,
        variant: "destructive",
      })
      return
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteMutation.mutate({ path: { id: category.id } })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Personal Categories</h3>
          <p className="text-sm text-muted-foreground">
            Organize your services with custom categories
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Create a custom category to organize your services
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Massage Therapy, Yoga Classes"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-foreground scale-110'
                          : 'border-muted-foreground/30 hover:border-foreground/50'
                      } ${color.bg}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-lg p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-muted rounded-full"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-5 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <FolderOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h4 className="font-semibold mb-2">No Categories Yet</h4>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first category to organize your services
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm truncate">{category.name}</h4>
                    {category.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(category)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(category)}
                      className="text-destructive"
                      disabled={category.service_count > 0}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {category.service_count || 0} services
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update your category details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Massage Therapy, Yoga Classes"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category..."
                rows={2}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-foreground scale-110'
                        : 'border-muted-foreground/30 hover:border-foreground/50'
                    } ${color.bg}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}