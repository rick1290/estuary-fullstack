"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, CheckCircle, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  practitionersMyProfileRetrieveOptions, 
  practitionersPartialUpdateMutation,
  specializationsListOptions,
  stylesListOptions,
  topicsListOptions,
  modalitiesListOptions
} from "@/src/client/@tanstack/react-query.gen"

// Form schema with validation
const professionalFormSchema = z.object({
  years_of_experience: z.coerce.number().min(0, { message: "Years of experience must be a positive number." }),
  buffer_time: z.coerce.number().min(0, { message: "Buffer time must be a positive number." }),
  specializations: z.array(z.string()).min(1, { message: "Select at least one specialization." }),
  styles: z.array(z.string()).min(1, { message: "Select at least one style." }),
  topics: z.array(z.string()).min(1, { message: "Select at least one topic." }),
  modalities: z.array(z.string()).min(1, { message: "Select at least one modality." }),
})

type ProfessionalFormValues = z.infer<typeof professionalFormSchema>


interface PractitionerAvailabilityFormProps {
  isOnboarding?: boolean
}

export default function PractitionerAvailabilityForm({ isOnboarding = false }: PractitionerAvailabilityFormProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch data from API
  const { data: practitioner, isLoading: practitionerLoading } = useQuery(practitionersMyProfileRetrieveOptions())
  const { data: specializationsData, isLoading: specializationsLoading } = useQuery(specializationsListOptions())
  const { data: stylesData, isLoading: stylesLoading } = useQuery(stylesListOptions())
  const { data: topicsData, isLoading: topicsLoading } = useQuery(topicsListOptions())
  const { data: modalitiesData, isLoading: modalitiesLoading } = useQuery(modalitiesListOptions())

  // Ensure data is always an array - handle both direct arrays and paginated responses
  const specializations = Array.isArray(specializationsData) ? specializationsData : 
                         (specializationsData?.results && Array.isArray(specializationsData.results)) ? specializationsData.results : []
  const styles = Array.isArray(stylesData) ? stylesData : 
                 (stylesData?.results && Array.isArray(stylesData.results)) ? stylesData.results : []
  const topics = Array.isArray(topicsData) ? topicsData : 
                 (topicsData?.results && Array.isArray(topicsData.results)) ? topicsData.results : []
  const modalities = Array.isArray(modalitiesData) ? modalitiesData : 
                     (modalitiesData?.results && Array.isArray(modalitiesData.results)) ? modalitiesData.results : []

  const isLoading = practitionerLoading || specializationsLoading || stylesLoading || topicsLoading || modalitiesLoading

  // Initialize form with default values
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      years_of_experience: 0,
      buffer_time: 15,
      specializations: [],
      styles: [],
      topics: [],
      modalities: [],
    },
  })

  // Update form when data is loaded
  useEffect(() => {
    if (practitioner) {
      const specializationIds = practitioner.specializations?.map(s => s.id.toString()) || []
      const styleIds = practitioner.styles?.map(s => s.id.toString()) || []
      const topicIds = practitioner.topics?.map(s => s.id.toString()) || []
      const modalityIds = practitioner.modalities?.map(m => m.id.toString()) || []

      form.reset({
        years_of_experience: practitioner.years_of_experience || 0,
        buffer_time: practitioner.buffer_time || 15,
        specializations: specializationIds,
        styles: styleIds,
        topics: topicIds,
        modalities: modalityIds,
      })
    }
  }, [practitioner, form])

  // Setup mutation for updating profile
  const updateMutation = useMutation({
    ...practitionersPartialUpdateMutation(),
    onSuccess: () => {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      toast({
        title: "Professional Details Updated",
        description: "Your professional information has been saved successfully.",
      })
      // Invalidate and refetch the profile data
      queryClient.invalidateQueries({ queryKey: ['practitionersMyProfileRetrieve'] })
    },
    onError: (error) => {
      console.error("Failed to save professional details:", error)
      toast({
        title: "Error",
        description: "Failed to save your professional details. Please try again.",
        variant: "destructive",
      })
    }
  })

  // Handle form submission
  const onSubmit = async (data: ProfessionalFormValues) => {
    if (!practitioner?.id) return
    
    // Convert string IDs to numbers for the API
    const specialization_ids = data.specializations.map(id => parseInt(id))
    const style_ids = data.styles.map(id => parseInt(id))
    const topic_ids = data.topics.map(id => parseInt(id))
    const modality_ids = data.modalities.map(id => parseInt(id))

    updateMutation.mutate({
      path: { id: practitioner.id },
      body: {
        years_of_experience: data.years_of_experience,
        buffer_time: data.buffer_time,
        specialization_ids,
        style_ids,
        topic_ids,
        modality_ids
      }
    })
  }


  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {!isOnboarding && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Professional Details</h2>
          <p className="text-muted-foreground">Set up your services, specialties, and availability.</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="years_of_experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormDescription>How many years of professional experience do you have?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buffer_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buffer Time Between Sessions (minutes)</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select buffer time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No buffer</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="20">20 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>Time between consecutive sessions for preparation.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="specializations"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Specializations</FormLabel>
                      <FormDescription>Select your areas of specialization.</FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {specializations.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="specializations"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id.toString())}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id.toString()])
                                        : field.onChange(field.value?.filter((value) => value !== item.id.toString()))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{item.content}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="styles"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Teaching/Coaching Styles</FormLabel>
                      <FormDescription>Select the styles that best describe your approach.</FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {styles.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="styles"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id.toString())}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id.toString()])
                                        : field.onChange(field.value?.filter((value) => value !== item.id.toString()))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{item.content}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="topics"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Topics</FormLabel>
                      <FormDescription>Select the topics you cover in your practice.</FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {topics.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="topics"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id.toString())}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id.toString()])
                                        : field.onChange(field.value?.filter((value) => value !== item.id.toString()))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{item.content}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="modalities"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Session Modalities</FormLabel>
                      <FormDescription>Select the ways you offer your services.</FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {modalities.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="modalities"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id.toString())}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id.toString()])
                                        : field.onChange(field.value?.filter((value) => value !== item.id.toString()))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.name}
                                  <span className="text-xs text-muted-foreground ml-1">({item.description})</span>
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

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
  )
}
