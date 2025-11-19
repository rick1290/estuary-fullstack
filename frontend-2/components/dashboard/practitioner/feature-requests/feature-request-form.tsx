"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { featureRequestsCreateMutation } from "@/src/client/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Lightbulb, Loader2 } from "lucide-react"

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(255),
  description: z.string().min(20, "Please provide more details (at least 20 characters)"),
  category: z.enum([
    "scheduling",
    "payments",
    "analytics",
    "client_management",
    "messaging",
    "ui_ux",
    "mobile",
    "integrations",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high"]),
})

type FormData = z.infer<typeof formSchema>

const categories = [
  { value: "scheduling", label: "Scheduling" },
  { value: "payments", label: "Payments & Billing" },
  { value: "analytics", label: "Analytics & Reports" },
  { value: "client_management", label: "Client Management" },
  { value: "messaging", label: "Messaging" },
  { value: "ui_ux", label: "UI/UX" },
  { value: "mobile", label: "Mobile App" },
  { value: "integrations", label: "Integrations" },
  { value: "other", label: "Other" },
]

const priorities = [
  { value: "low", label: "Low - Nice to have" },
  { value: "medium", label: "Medium - Would improve workflow" },
  { value: "high", label: "High - Critical for my practice" },
]

export default function FeatureRequestForm() {
  const queryClient = useQueryClient()
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      priority: "medium",
    },
  })

  const createMutation = useMutation({
    ...featureRequestsCreateMutation(),
    onSuccess: () => {
      toast.success("Feature request submitted!", {
        description: "Thank you for your feedback. We'll review it soon.",
      })
      setIsSubmitted(true)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] })

      // Reset submitted state after 3 seconds
      setTimeout(() => setIsSubmitted(false), 3000)
    },
    onError: (error: any) => {
      toast.error("Failed to submit request", {
        description: error.message || "Please try again later",
      })
    },
  })

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      body: data,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-sage-600" />
          <CardTitle>Submit a Feature Request</CardTitle>
        </div>
        <CardDescription>
          Have an idea to improve the platform? Let us know what features would help your practice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Add recurring appointments" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short, clear title for your feature request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the feature you'd like to see and how it would help your practice..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Please provide as much detail as possible about what you need and why
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((pri) => (
                          <SelectItem key={pri.value} value={pri.value}>
                            {pri.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending || isSubmitted}
              className="w-full md:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isSubmitted ? (
                "Submitted!"
              ) : (
                "Submit Feature Request"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
