"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  servicesUploadCoverImageCreateMutation,
  aiImagesGenerateCreateMutation
} from "@/src/client/@tanstack/react-query.gen"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Wand2
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

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatedImageId, setGeneratedImageId] = useState<number | null>(null)

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

  // AI Image Generation mutation
  const generateImageMutation = useMutation({
    ...aiImagesGenerateCreateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Image Generated! ✨",
        description: "Your AI-generated image is ready"
      })
      if (data.image_url) {
        setGeneratedImageUrl(data.image_url)
        setGeneratedImageId(data.id)
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.body?.error || error?.message || "Failed to generate image"
      toast({
        title: "Generation Failed",
        description: errorMessage,
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

  // AI Image Generation handlers
  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for the image",
        variant: "destructive"
      })
      return
    }

    try {
      await generateImageMutation.mutateAsync({
        body: { prompt: aiPrompt }
      })
    } catch (error) {
      // Error handled in mutation onError
    }
  }

  const handleUseGeneratedImage = async () => {
    if (!generatedImageId) return

    // Call backend to apply generated image to service
    try {
      const session = await fetch('/api/auth/session').then(r => r.json())
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiUrl}/api/v1/ai-images/${generatedImageId}/apply-to-service/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service_id: service.id }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to apply image')
      }

      const data = await response.json()

      // Update preview with new image URL
      if (data.image_url) {
        const imageUrl = data.image_url.startsWith('http')
          ? data.image_url
          : `${apiUrl}${data.image_url}`
        setCoverImagePreview(imageUrl)
      }

      // Clear AI generation state
      setGeneratedImageUrl(null)
      setGeneratedImageId(null)
      setAiPrompt("")

      // Invalidate queries to refresh service data
      queryClient.invalidateQueries({ queryKey: ['services'] })

      toast({
        title: "Success! ✨",
        description: "AI-generated image set as cover image"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save generated image",
        variant: "destructive"
      })
    }
  }

  const cancelGeneratedImage = () => {
    setGeneratedImageUrl(null)
    setGeneratedImageId(null)
  }

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      <div className="space-y-4">
        <div>
          <Label>Cover Image</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your own image or generate one with AI
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
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
          </TabsContent>

          {/* AI Generation Tab */}
          <TabsContent value="ai" className="space-y-4">
            {generatedImageUrl ? (
              <div className="space-y-4">
                <div className="relative w-full max-w-md">
                  <img
                    src={generatedImageUrl}
                    alt="AI generated"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={cancelGeneratedImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUseGeneratedImage}
                    disabled={uploadCoverImageMutation.isPending}
                    className="flex-1"
                  >
                    {uploadCoverImageMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Use This Image
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelGeneratedImage}
                    disabled={uploadCoverImageMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-md space-y-4">
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">AI Image Generation</h4>
                      <p className="text-xs text-muted-foreground">
                        Describe your ideal service image and AI will create it for you. Images are generated following wellness brand guidelines.
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Describe Your Image</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="E.g., A peaceful yoga studio with natural light and plants..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Be specific about mood, setting, and elements you want to see
                  </p>
                </div>

                <Button
                  onClick={handleGenerateImage}
                  disabled={generateImageMutation.isPending || !aiPrompt.trim()}
                  className="w-full"
                >
                  {generateImageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating... (this may take 30-60 seconds)
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
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