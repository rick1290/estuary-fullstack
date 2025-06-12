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

// Mock data for dropdowns
const SPECIALIZATIONS = [
  { id: "1", content: "Meditation Coach" },
  { id: "2", content: "Yoga Instructor" },
  { id: "3", content: "Nutritionist" },
  { id: "4", content: "Life Coach" },
  { id: "5", content: "Fitness Trainer" },
  { id: "6", content: "Mental Health Counselor" },
  { id: "7", content: "Career Coach" },
  { id: "8", content: "Relationship Counselor" },
]

const STYLES = [
  { id: "1", content: "Gentle" },
  { id: "2", content: "Energetic" },
  { id: "3", content: "Analytical" },
  { id: "4", content: "Focused" },
  { id: "5", content: "Intuitive" },
  { id: "6", content: "Structured" },
  { id: "7", content: "Holistic" },
  { id: "8", content: "Practical" },
]

const TOPICS = [
  { id: "1", content: "Wellness" },
  { id: "2", content: "Mental Health" },
  { id: "3", content: "Fitness" },
  { id: "4", content: "Nutrition" },
  { id: "5", content: "Career Development" },
  { id: "6", content: "Relationships" },
  { id: "7", content: "Stress Management" },
  { id: "8", content: "Personal Growth" },
]

const MODALITIES = [
  { id: "1", name: "Virtual", description: "Virtual sessions" },
  { id: "2", name: "In-Person", description: "In-Person sessions" },
  { id: "3", name: "Chat", description: "Chat sessions" },
  { id: "4", name: "Group", description: "Group sessions" },
]

// Mock function to get practitioner data
const getPractitionerProfessionalData = async () => {
  // In a real app, this would fetch from an API
  return {
    years_of_experience: 5,
    buffer_time: 15,
    specializations: ["1", "3"],
    styles: ["1", "4"],
    topics: ["1", "2", "3"],
    modalities: ["1", "2", "3"],
  }
}

interface PractitionerAvailabilityFormProps {
  isOnboarding?: boolean
}

export default function PractitionerAvailabilityForm({ isOnboarding = false }: PractitionerAvailabilityFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [newSpecialization, setNewSpecialization] = useState("")
  const [newStyle, setNewStyle] = useState("")
  const [newTopic, setNewTopic] = useState("")
  const { toast } = useToast()

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

  // Load practitioner data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getPractitionerProfessionalData()
        form.reset({
          years_of_experience: data.years_of_experience,
          buffer_time: data.buffer_time,
          specializations: data.specializations,
          styles: data.styles,
          topics: data.topics,
          modalities: data.modalities,
        })
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load practitioner professional data:", error)
        toast({
          title: "Error",
          description: "Failed to load your professional details. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    loadData()
  }, [form, toast])

  // Handle form submission
  const onSubmit = async (data: ProfessionalFormValues) => {
    setIsSaving(true)
    try {
      // In a real app, this would send data to an API
      console.log("Saving professional data:", data)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      toast({
        title: "Professional Details Updated",
        description: "Your professional information has been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save professional details:", error)
      toast({
        title: "Error",
        description: "Failed to save your professional details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add custom specialization
  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      const customId = `custom-${Date.now()}`
      SPECIALIZATIONS.push({ id: customId, content: newSpecialization.trim() })
      const currentValues = form.getValues().specializations
      form.setValue("specializations", [...currentValues, customId])
      setNewSpecialization("")
    }
  }

  // Add custom style
  const addStyle = () => {
    if (newStyle.trim()) {
      const customId = `custom-${Date.now()}`
      STYLES.push({ id: customId, content: newStyle.trim() })
      const currentValues = form.getValues().styles
      form.setValue("styles", [...currentValues, customId])
      setNewStyle("")
    }
  }

  // Add custom topic
  const addTopic = () => {
    if (newTopic.trim()) {
      const customId = `custom-${Date.now()}`
      TOPICS.push({ id: customId, content: newTopic.trim() })
      const currentValues = form.getValues().topics
      form.setValue("topics", [...currentValues, customId])
      setNewTopic("")
    }
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
                      {SPECIALIZATIONS.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="specializations"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(field.value?.filter((value) => value !== item.id))
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
                    <div className="flex items-center mt-4">
                      <Input
                        placeholder="Add custom specialization"
                        value={newSpecialization}
                        onChange={(e) => setNewSpecialization(e.target.value)}
                        className="max-w-sm mr-2"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addSpecialization}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
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
                      {STYLES.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="styles"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(field.value?.filter((value) => value !== item.id))
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
                    <div className="flex items-center mt-4">
                      <Input
                        placeholder="Add custom style"
                        value={newStyle}
                        onChange={(e) => setNewStyle(e.target.value)}
                        className="max-w-sm mr-2"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addStyle}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
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
                      {TOPICS.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="topics"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(field.value?.filter((value) => value !== item.id))
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
                    <div className="flex items-center mt-4">
                      <Input
                        placeholder="Add custom topic"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        className="max-w-sm mr-2"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addTopic}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
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
                      {MODALITIES.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="modalities"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(field.value?.filter((value) => value !== item.id))
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
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
