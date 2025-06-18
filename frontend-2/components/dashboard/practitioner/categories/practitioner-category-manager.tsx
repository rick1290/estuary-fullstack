"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, MoreVertical, Edit, Trash2, FolderOpen, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

export default function PractitionerCategoryManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<PractitionerCategory | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // TODO: Replace with actual API when available
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['practitioner-categories'],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return [
        {
          id: 1,
          name: "Wellness Sessions",
          description: "General wellness and relaxation services",
          color: "#3B82F6",
          service_count: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Therapy & Healing",
          description: "Therapeutic and healing-focused services",
          color: "#10B981",
          service_count: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as PractitionerCategory[]
    },
  })

  // TODO: Replace with actual API mutations when available
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      // Mock API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id: Date.now(), ...data, service_count: 0 }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioner-categories'] })
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
    createMutation.mutate(formData)
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
    
    updateMutation.mutate({ id: editingCategory.id, data: formData })
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
      deleteMutation.mutate(category.id)
    }
  }

  const selectedColor = COLOR_OPTIONS.find(color => color.value === formData.color) || COLOR_OPTIONS[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Service Categories</h2>
          <p className="text-muted-foreground">
            Organize your services with custom categories
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  rows={3}
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
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-4"></div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Categories Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first category to organize your services
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(category)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(category)}
                        className="text-destructive"
                        disabled={category.service_count > 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {category.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {category.service_count || 0} services
                  </Badge>
                </div>
              </CardContent>
            </Card>
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
                rows={3}
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
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
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