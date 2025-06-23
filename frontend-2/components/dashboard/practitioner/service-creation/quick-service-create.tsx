"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Plus, Tag } from "lucide-react"
import { 
  servicesCreateMutation,
  serviceCategoriesListOptions,
  practitionerCategoriesListOptions
} from "@/src/client/@tanstack/react-query.gen"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CompactCategoryManager from "../categories/compact-category-manager"

// Form validation schema
const formSchema = z.object({
  serviceType: z.string().min(1, "Please select a service type"),
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid number",
  }),
  categoryId: z.string().optional(),
  practitionerCategoryId: z.string().optional(),
  shortDescription: z.string().min(10, "Description must be at least 10 characters").max(200),
})

type FormData = z.infer<typeof formSchema>

// Service type mapping
const SERVICE_TYPES = [
  { id: 1, code: "session", name: "Session", description: "One-on-one appointments" },
  { id: 2, code: "workshop", name: "Workshop", description: "Group events with specific dates" },
  { id: 3, code: "course", name: "Course", description: "Multi-session programs" },
  { id: 4, code: "package", name: "Package", description: "Bundle of different services" },
  { id: 5, code: "bundle", name: "Bundle", description: "Multiple sessions of the same service" },
]

export function QuickServiceCreate() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)

  // Fetch categories
  const { data: globalCategories, refetch: refetchGlobalCategories } = useQuery({
    ...serviceCategoriesListOptions({}),
  })

  const { data: practitionerCategories, refetch: refetchPractitionerCategories } = useQuery({
    ...practitionerCategoriesListOptions({}),
  })

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceType: "",
      name: "",
      price: "0",
      categoryId: "",
      practitionerCategoryId: "",
      shortDescription: "",
    },
  })

  // Create service mutation
  const createMutation = useMutation({
    ...servicesCreateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Service created!",
        description: "Now let's add more details to your service.",
      })
      // Redirect to the service editor
      if (data?.id) {
        router.push(`/dashboard/practitioner/services/edit/${data.id}`)
      } else {
        console.error('No service ID in response:', data)
        router.push('/dashboard/practitioner/services')
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create service",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
      setIsCreating(false)
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsCreating(true)
    
    const selectedType = SERVICE_TYPES.find(t => t.code === data.serviceType)
    if (!selectedType) {
      setIsCreating(false)
      return
    }

    // Create minimal service
    await createMutation.mutateAsync({
      body: {
        name: data.name,
        service_type_id: selectedType.id,
        price: parseFloat(data.price),
        short_description: data.shortDescription,
        status: 'draft',
        is_active: false,
        is_public: false,
        // Required fields with defaults
        description: data.shortDescription, // Will be expanded later
        duration_minutes: 60, // Default, will be updated
        max_participants: 1,
        min_participants: 1,
        experience_level: "all_levels",
        location_type: "virtual",
        what_youll_learn: "",
        prerequisites: "",
        // Optional category
        ...(data.categoryId && { category_id: parseInt(data.categoryId) }),
        ...(data.practitionerCategoryId && { practitioner_category_id: parseInt(data.practitionerCategoryId) }),
      }
    })
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <Link href="/dashboard/practitioner/services">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Service</CardTitle>
          <CardDescription>
            Let's start with the basics. You can add more details after creating your service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Service Type */}
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="What type of service is this?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-sm text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 60-Minute Yoga Session, 8-Week Mindfulness Course" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a clear, descriptive name that tells clients what you're offering
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      You can always adjust pricing later or add special offers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categories */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Global Category */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {globalCategories?.results?.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Practitioner Category */}
                <FormField
                  control={form.control}
                  name="practitionerCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <Tag className="h-4 w-4 mr-2" />
                          Your Category (Optional)
                        </FormLabel>
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
                        onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                        value={field.value || "none"}
                        key={practitionerCategories?.results?.length} // Force re-render when categories change
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select or create your category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {practitionerCategories?.results?.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: category.color || '#9CAF88' }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Short Description */}
              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Give a brief overview of what this service offers..."
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A short summary that appears in search results (max 200 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/practitioner/services")}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Service"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(open) => {
        setShowCategoryDialog(open)
        // Refetch categories when dialog closes
        if (!open) {
          refetchPractitionerCategories()
          refetchGlobalCategories()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Your Categories</DialogTitle>
            <DialogDescription>
              Create and organize your personal service categories
            </DialogDescription>
          </DialogHeader>
          <CompactCategoryManager onCategoryChange={() => {
            refetchPractitionerCategories()
            refetchGlobalCategories()
          }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}