"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import { useServiceCategories, usePractitionerCategories } from "@/hooks/use-categories"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Plus, Tag } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import CompactCategoryManager from "../../categories/compact-category-manager"

export function BasicInfoStep() {
  const { formState, updateFormField, validateStep, errors } = useServiceForm()
  const { data: globalCategories = [], isLoading: isLoadingGlobal } = useServiceCategories()
  const { data: practitionerCategories = [], isLoading: isLoadingPractitioner } = usePractitionerCategories()
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  
  console.log('BasicInfoStep - Categories Debug:', {
    globalCategories,
    practitionerCategories,
    isLoadingGlobal,
    isLoadingPractitioner,
    formState_category_id: formState.category_id,
    formState_practitioner_category_id: formState.practitioner_category_id
  })

  const handleChange = (field: string, value: string) => {
    updateFormField(field, value)
  }

  const handleBlur = (field: string) => {
    validateStep(field)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
        <p className="text-muted-foreground">Provide the essential details about your service</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center">
                Service Title
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="title"
                value={formState.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                onBlur={() => handleBlur("basicInfo")}
                placeholder="Enter a clear, descriptive title"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
            </div>

            {/* Global Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center">
                Global Category
                <span className="text-muted-foreground ml-1 text-xs">(Optional)</span>
              </Label>
              <Select
                value={formState.category_id?.toString() || "none"}
                onValueChange={(value) => updateFormField("category_id", value && value !== "none" ? parseInt(value) : undefined)}
                onOpenChange={() => handleBlur("basicInfo")}
              >
                <SelectTrigger id="category" className={errors.category_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a global category" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingGlobal ? (
                    <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">No category</SelectItem>
                      {globalCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-sm text-destructive mt-1">{errors.category_id}</p>}
            </div>

            {/* Practitioner Category */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="practitioner-category" className="flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Personal Category
                  <span className="text-muted-foreground ml-1 text-xs">(Recommended)</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryDialog(true)}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </div>
              <Select
                value={formState.practitioner_category_id?.toString() || "none"}
                onValueChange={(value) => updateFormField("practitioner_category_id", value && value !== "none" ? parseInt(value) : undefined)}
                onOpenChange={() => handleBlur("basicInfo")}
              >
                <SelectTrigger id="practitioner-category" className={errors.practitioner_category_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select or create a personal category" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingPractitioner ? (
                    <SelectItem value="loading" disabled>Loading your categories...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">No category</SelectItem>
                      {practitionerCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center gap-2">
                            {category.color && (
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            {category.name}
                            {category.service_count > 0 && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {category.service_count}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {practitionerCategories.length === 0 && !isLoadingPractitioner && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Create personal categories to organize your services (e.g., "Massage Therapy", "Yoga Classes").
                    This helps you manage your offerings and makes it easier for clients to browse.
                  </p>
                </div>
              )}
              {errors.practitioner_category_id && <p className="text-sm text-destructive mt-1">{errors.practitioner_category_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center">
                Description
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Textarea
                id="description"
                value={formState.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                onBlur={() => handleBlur("basicInfo")}
                placeholder="Describe your service in detail"
                rows={5}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center">
                  Price ($)
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formState.price || ""}
                  onChange={(e) => handleChange("price", e.target.value)}
                  onBlur={() => handleBlur("basicInfo")}
                  placeholder="0.00"
                  className={errors.price ? "border-destructive" : ""}
                />
                {errors.price && <p className="text-sm text-destructive mt-1">{errors.price}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center">
                  Duration (minutes)
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Select
                  value={formState.duration_minutes?.toString() || ""}
                  onValueChange={(value) => updateFormField("duration_minutes", parseInt(value))}
                  onOpenChange={() => handleBlur("basicInfo")}
                >
                  <SelectTrigger id="duration" className={errors.duration_minutes ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
                {errors.duration_minutes && <p className="text-sm text-destructive mt-1">{errors.duration_minutes}</p>}
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please fix the errors above to proceed to the next step.</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Personal Categories</DialogTitle>
            <DialogDescription>
              Create and organize your personal service categories
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CompactCategoryManager />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCategoryDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
