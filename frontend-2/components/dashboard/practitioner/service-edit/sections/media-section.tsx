"use client"

import { useState, useEffect } from "react"
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
  data: {
    image?: string | File
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function MediaSection({ 
  service, 
  data, 
  onChange, 
  onSave, 
  hasChanges, 
  isSaving 
}: MediaSectionProps) {
  const [localData, setLocalData] = useState(data)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Don't update localData if it's just the initial image URL
    // We only want to track actual changes (new files or removals)
    if (data.image && typeof data.image === 'string') {
      // This is the initial image URL, just set the preview
      setCoverImagePreview(data.image)
      // Don't set localData.image to the URL string
      setLocalData({ ...data, image: undefined })
    } else {
      setLocalData(data)
      // Set preview for File objects
      if (data.image instanceof File) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setCoverImagePreview(reader.result as string)
        }
        reader.readAsDataURL(data.image)
      }
    }
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Update data
      handleChange('image', file)
    }
  }

  const removeCoverImage = () => {
    setCoverImagePreview(null)
    handleChange('image', '') // Use empty string instead of null for removal
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

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || isUploading}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Section"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}