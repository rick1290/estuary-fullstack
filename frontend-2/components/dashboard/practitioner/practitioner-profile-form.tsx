"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ImagePlus, Upload, X, Save, CheckCircle, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { practitionersMyProfileRetrieveOptions, practitionersPartialUpdateMutation } from "@/src/client/@tanstack/react-query.gen"

// Form schema with validation
const profileFormSchema = z.object({
  display_name: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  professional_title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  quote: z.string().optional(),
  bio: z.string().min(10, { message: "Bio must be at least 10 characters." }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface PractitionerProfileFormProps {
  isOnboarding?: boolean
}

export default function PractitionerProfileForm({ isOnboarding = false }: PractitionerProfileFormProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch practitioner profile data
  const { data: practitioner, isLoading, error } = useQuery(practitionersMyProfileRetrieveOptions())

  // Initialize form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: "",
      professional_title: "",
      quote: "",
      bio: "",
    },
  })

  // Update form when data is loaded
  useEffect(() => {
    if (practitioner) {
      form.reset({
        display_name: practitioner.display_name || "",
        professional_title: practitioner.professional_title || "",
        quote: practitioner.quote || "",
        bio: practitioner.bio || "",
      })
      setVideoUrl(practitioner.profile_video_url || null)
    }
  }, [practitioner, form])

  // Setup mutation for updating profile
  const updateMutation = useMutation({
    ...practitionersPartialUpdateMutation(),
    onSuccess: () => {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      })
      // Invalidate and refetch the profile data
      queryClient.invalidateQueries({ queryKey: ['practitionersMyProfileRetrieve'] })
    },
    onError: (error) => {
      console.error("Failed to save profile:", error)
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    if (!practitioner?.id) return
    
    updateMutation.mutate({
      path: { id: practitioner.id },
      body: data
    })
  }

  // Handle profile image upload
  const handleImageUpload = () => {
    // In a real app, this would open a file picker and upload the image
    toast({
      title: "Image Upload",
      description: "Profile image upload functionality would be implemented here.",
    })
  }

  // Handle profile video upload
  const handleVideoUpload = () => {
    // In a real app, this would open a file picker and upload the video
    setVideoUrl("/generic-media-placeholder.png")
    toast({
      title: "Video Upload",
      description: "Profile video upload functionality would be implemented here.",
    })
  }

  // Handle video removal
  const handleRemoveVideo = () => {
    setVideoUrl(null)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-semibold">Failed to load profile</h2>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!isOnboarding && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Basic Information</h2>
          <p className="text-muted-foreground">This information will be displayed on your public profile.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage
                    src={practitioner?.profile_image_url || "/placeholder.svg?height=200&width=200&query=profile"}
                    alt={practitioner?.display_name}
                  />
                  <AvatarFallback>{practitioner?.display_name?.charAt(0) || "P"}</AvatarFallback>
                </Avatar>

                <Button variant="outline" size="sm" onClick={handleImageUpload} className="w-full">
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>

                <div className="w-full pt-4 border-t">
                  <Label className="block mb-2">Profile Video (optional)</Label>
                  {videoUrl ? (
                    <div className="relative">
                      <div className="aspect-video bg-muted rounded-md overflow-hidden">
                        <img
                          src={videoUrl || "/placeholder.svg"}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 rounded-full"
                        onClick={handleRemoveVideo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleVideoUpload} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Video
                    </Button>
                  )}
                </div>

                <div className="w-full pt-4 border-t">
                  <Label className="block mb-2">Profile URL Slug</Label>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-muted-foreground">{practitioner?.slug || 'Not available'}</p>
                    {practitioner?.slug && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/practitioners/${practitioner.slug}`)
                          toast({
                            title: "Copied!",
                            description: "Profile URL copied to clipboard",
                          })
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Your unique profile URL identifier.</p>
                </div>

                <div className="w-full pt-4 border-t">
                  <Label className="block mb-2">Email Address</Label>
                  <p className="text-sm text-muted-foreground">{practitioner?.user?.email || 'Not available'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Contact support to change your email address.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Jane Smith" {...field} />
                    </FormControl>
                    <FormDescription>This is the name that will be displayed to clients.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="professional_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Wellness Coach & Nutritionist" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your professional title or role (e.g., "Yoga Instructor", "Life Coach").
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quote/Tagline (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="A short inspirational quote or tagline" {...field} />
                    </FormControl>
                    <FormDescription>A short quote or tagline that represents your philosophy.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief overview of your background and expertise..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A concise summary that appears in search results and cards (100-150 words recommended).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>Saving...</>
                  ) : showSuccess ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
