"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Image from "next/image"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImagePlus, Upload, X, FileText, AlertCircle, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadState {
  isUploading: boolean
  progress: number
  error?: string
  file?: File
}

export function MediaStep() {
  const { formState, updateFormField, validateStep } = useServiceForm()
  const [dragActive, setDragActive] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>({ isUploading: false, progress: 0 })
  const { toast } = useToast()

  // Handle file upload - in production this would upload to CloudFlare R2
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadState({ isUploading: true, progress: 0, file })

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadState(prev => ({ 
        ...prev, 
        progress: Math.min(prev.progress + 20, 90) 
      }))
    }, 200)

    try {
      // In production: Upload to CloudFlare R2 and get URL
      // For now, create a local preview URL
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const previewUrl = URL.createObjectURL(file)
      updateFormField("image", previewUrl)
      updateFormField("coverImage", previewUrl)
      
      setUploadState({ isUploading: false, progress: 100 })
      validateStep("media")
      
      toast({ 
        title: "Image uploaded successfully", 
        description: "Your service image has been uploaded." 
      })
    } catch (error) {
      setUploadState({ 
        isUploading: false, 
        progress: 0, 
        error: "Upload failed. Please try again." 
      })
      toast({ 
        title: "Upload failed", 
        description: "Please try again.",
        variant: "destructive" 
      })
    } finally {
      clearInterval(progressInterval)
    }
  }, [updateFormField, validateStep, toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, WebP)",
          variant: "destructive"
        })
        return
      }
      
      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Images must be under 10MB",
          variant: "destructive"
        })
        return
      }
      
      handleFileUpload(file)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please drop an image file",
          variant: "destructive"
        })
        return
      }
      
      handleFileUpload(file)
    }
  }, [handleFileUpload, toast])

  const removeImage = () => {
    updateFormField("image", "")
    updateFormField("coverImage", "")
    setUploadState({ isUploading: false, progress: 0 })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Image (Optional)</h2>
        <p className="text-muted-foreground">Upload a high-quality image to showcase your service. While optional, images help attract more customers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Cover Image
            <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
            {(formState.image || formState.coverImage) && <Check className="h-4 w-4 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription>
            This image will be the main visual representation of your service in listings and search results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!formState.image && !formState.coverImage ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-medium">Upload Service Image</h4>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Drag and drop your image here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports JPG, PNG, WebP up to 10MB
                  </p>
                </div>
                <div>
                  <Input
                    id="imageUpload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadState.isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("imageUpload")?.click()}
                    disabled={uploadState.isUploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadState.isUploading ? "Uploading..." : "Select Image"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Image
                  src={formState.image || formState.coverImage || "/placeholder.svg"}
                  alt="Service cover image"
                  width={600}
                  height={300}
                  className="rounded-lg object-cover w-full h-64 border"
                />
                <div className="absolute top-2 right-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  removeImage()
                  document.getElementById("imageUpload")?.click()
                }}
                className="w-full"
                disabled={uploadState.isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Replace Image
              </Button>
            </div>
          )}

          {uploadState.isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading image...</span>
                <span>{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="h-2" />
            </div>
          )}

          {uploadState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadState.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Image Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Image Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2 text-primary">Technical Requirements</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Minimum resolution: 1200x600 pixels</li>
                <li>• Aspect ratio: 2:1 (landscape) preferred</li>
                <li>• File formats: JPG, PNG, WebP</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-primary">Content Best Practices</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Show your service environment or results</li>
                <li>• Use professional, well-lit photography</li>
                <li>• Avoid text overlays or watermarks</li>
                <li>• Ensure you have rights to use the image</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Tip:</strong> Videos and additional resources can be added after service creation through the Service Resources section.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}