"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { servicesUploadCoverImageCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { 
  Upload, 
  X, 
  Image as ImageIcon,
  Loader2
} from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"

interface MediaSectionProps {
  service: ServiceReadable
}

export function MediaSection({ service }: MediaSectionProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const uploadCoverImageMutation = useMutation({
    ...servicesUploadCoverImageCreateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Cover image updated successfully"
      })
      // Update preview with new image URL
      if (data.image_url) {
        const imageUrl = data.image_url.startsWith('http') 
          ? data.image_url 
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${data.image_url}`
        setCoverImagePreview(imageUrl)
      }
      // Invalidate service queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setSelectedFile(null)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload cover image",
        variant: "destructive"
      })
    }
  })
  
  // Set initial preview from service image
  useEffect(() => {
    if (service.image_url) {
      const imageUrl = service.image_url.startsWith('http') 
        ? service.image_url 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${service.image_url}`
      setCoverImagePreview(imageUrl)
    }
  }, [service.image_url])


  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive"
        })
        return
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      setSelectedFile(file)
    }
  }
  
  const handleUpload = async () => {
    if (!selectedFile) return
    
    try {
      await uploadCoverImageMutation.mutateAsync({
        path: { id: service.id },
        body: { image: selectedFile }
      })
    } catch (error) {
      // Error is handled in onError callback
    }
  }

  const removeCoverImage = () => {
    if (selectedFile) {
      // Cancel selected file
      setSelectedFile(null)
      // Reset to original image or null
      if (service.image_url) {
        const imageUrl = service.image_url.startsWith('http') 
          ? service.image_url 
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${service.image_url}`
        setCoverImagePreview(imageUrl)
      } else {
        setCoverImagePreview(null)
      }
    } else {
      // Remove current cover image (would need a separate endpoint)
      setCoverImagePreview(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      <div className="space-y-4">
        <div>
          <Label>Cover Image</Label>
          <p className="text-sm text-muted-foreground mt-1">
            This will be the main image displayed in listings and search results
          </p>
        </div>
        
        {coverImagePreview ? (
          <div className="space-y-4">
            <div className="relative w-full max-w-md">
              <img
                src={coverImagePreview}
                alt="Cover preview"
                className="w-full h-64 object-cover rounded-lg"
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
            
            {selectedFile && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpload}
                  disabled={uploadCoverImageMutation.isPending}
                  className="flex-1"
                >
                  {uploadCoverImageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Upload New Image"
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={removeCoverImage}
                  disabled={uploadCoverImageMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="max-w-md">
            <label className="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="hidden"
              />
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Upload Cover Image</span>
              <span className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </span>
            </label>
          </Card>
        )}
      </div>

      {/* Image Guidelines */}
      <Card className="bg-muted/50 p-4">
        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Image Guidelines
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Use high-quality images (minimum 800x600px)</li>
          <li>• Show your space, equipment, or service in action</li>
          <li>• Ensure good lighting and professional appearance</li>
          <li>• Avoid text overlays or heavy filters</li>
        </ul>
      </Card>

    </div>
  )
}