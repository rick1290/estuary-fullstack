"use client"

import { useServiceForm } from "@/hooks/use-service-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function BasicInfoStep() {
  const { formState, updateFormField, validateStep, errors } = useServiceForm()

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

            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center">
                Category
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Select
                value={formState.category || ""}
                onValueChange={(value) => handleChange("category", value)}
                onOpenChange={() => handleBlur("basicInfo")}
              >
                <SelectTrigger id="category" className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="mental-health">Mental Health</SelectItem>
                  <SelectItem value="spiritual">Spiritual</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category}</p>}
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
                  value={formState.duration?.toString() || ""}
                  onValueChange={(value) => handleChange("duration", value)}
                  onOpenChange={() => handleBlur("basicInfo")}
                >
                  <SelectTrigger id="duration" className={errors.duration ? "border-destructive" : ""}>
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
                {errors.duration && <p className="text-sm text-destructive mt-1">{errors.duration}</p>}
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
    </div>
  )
}
