"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, Upload, X } from "lucide-react"

export function MediaStep() {
  const { formState, updateFormField, validateStep } = useServiceForm()
  const [dragActive, setDragActive] = useState(false)

  // In a real app, you would handle file uploads to a storage service
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // For demo purposes, we're just storing the file name
      updateFormField("coverImage", URL.createObjectURL(file))
      validateStep("coverImage")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // For demo purposes, we're just storing the file name
      updateFormField("coverImage", URL.createObjectURL(e.dataTransfer.files[0]))
      validateStep("coverImage")
    }
  }

  const removeCoverImage = () => {
    updateFormField("coverImage", "")
  }

  const handleChange = (field: string, value: string) => {
    updateFormField(field, value)
    validateStep(field)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Media</h2>
        <p className="text-muted-foreground">Upload images and videos to showcase your service</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image</Label>
              {!formState.coverImage ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center ${
                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Drag and drop your image here or click to browse
                    </div>
                    <Input
                      id="coverImage"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("coverImage")?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Image
                    src={formState.coverImage || "/placeholder.svg"}
                    alt="Cover image"
                    width={600}
                    height={300}
                    className="rounded-lg object-cover w-full h-48"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeCoverImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (optional)</Label>
              <Input
                id="videoUrl"
                value={formState.videoUrl || ""}
                onChange={(e) => handleChange("videoUrl", e.target.value)}
                placeholder="Enter YouTube or Vimeo URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaDescription">Media Description</Label>
              <Textarea
                id="mediaDescription"
                value={formState.mediaDescription || ""}
                onChange={(e) => handleChange("mediaDescription", e.target.value)}
                placeholder="Describe the media content"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
