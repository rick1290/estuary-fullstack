"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Tag,
  User,
  Users,
  BookOpen,
  Package,
  Layers,
  MapPin,
  Video,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle2,
  Save,
  Eye,
  Sparkles,
  HelpCircle
} from "lucide-react"
import {
  servicesCreateMutation,
  practitionerCategoriesListOptions,
  schedulesListOptions,
  modalitiesListOptions
} from "@/src/client/@tanstack/react-query.gen"
import Link from "next/link"
import { PractitionerPageHeader } from "../practitioner-page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import CompactCategoryManager from "../categories/compact-category-manager"
import { BundleConfigStep } from "./steps/bundle-config-step"
import { WizardPackageBuilder, type PackageServiceItem } from "./steps/wizard-package-builder"
import { PackageStepSessions, type PackageSessionItem } from "./steps/package-step-sessions"
import { PackageStepPricing } from "./steps/package-step-pricing"

// Phase schemas for validation
const phase1Schema = z.object({
  serviceType: z.string().min(1, "Please select a service type"),
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  shortDescription: z.string().min(10, "Description must be at least 10 characters").max(300),
})

const phase2Schema = z.object({
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid number",
  }),
  duration_minutes: z.number().min(15, "Duration must be at least 15 minutes"),
  max_participants: z.number().min(1),
  location_type: z.enum(["virtual", "in_person"]),
  schedule_id: z.string().optional(),
})

const phase3Schema = z.object({
  modalityId: z.string().optional(),
  practitionerCategoryId: z.string().optional(),
  includes: z.string().optional(),
  description: z.string().min(50, "Please provide a detailed description").max(2000),
})

// Combined schema
const wizardSchema = phase1Schema.merge(phase2Schema).merge(phase3Schema)

type WizardFormData = z.infer<typeof wizardSchema>

// Service type configuration
const SERVICE_TYPES = [
  { 
    id: 1, 
    code: "session", 
    name: "Session", 
    description: "One-on-one appointments",
    icon: User,
    color: "bg-sage-100 text-sage-700",
    examples: "Coaching, Therapy, Consultation"
  },
  { 
    id: 2, 
    code: "workshop", 
    name: "Workshop", 
    description: "Group events with specific dates",
    icon: Users,
    color: "bg-terracotta-100 text-terracotta-700",
    examples: "Weekend Retreat, Masterclass"
  },
  { 
    id: 3, 
    code: "course", 
    name: "Course", 
    description: "Multi-session programs",
    icon: BookOpen,
    color: "bg-olive-100 text-olive-700",
    examples: "8-Week Program, Training Series"
  },
  { 
    id: 4, 
    code: "package", 
    name: "Package", 
    description: "Bundle of different services",
    icon: Package,
    color: "bg-blush-100 text-blush-700",
    examples: "Starter Pack, VIP Bundle"
  },
  { 
    id: 5, 
    code: "bundle", 
    name: "Bundle", 
    description: "Multiple sessions of the same service",
    icon: Layers,
    color: "bg-cream-100 text-cream-800",
    examples: "5-Session Pack, Monthly Pass"
  },
]

// Templates for quick start
const SERVICE_TEMPLATES = {
  session: {
    name: "60-Minute Consultation",
    shortDescription: "One-on-one personalized consultation session",
    price: "100",
    duration_minutes: 60,
    max_participants: 1,
    location_type: "virtual" as const,
  },
  workshop: {
    name: "Weekend Workshop",
    shortDescription: "Interactive group workshop experience",
    price: "250",
    duration_minutes: 180,
    max_participants: 12,
    location_type: "in_person" as const,
  },
  course: {
    name: "8-Week Program",
    shortDescription: "Comprehensive learning journey",
    price: "800",
    duration_minutes: 90,
    max_participants: 20,
    location_type: "hybrid" as const,
  },
  package: {
    name: "Wellness Package",
    shortDescription: "Complete wellness solution bundle",
    price: "500",
    duration_minutes: 60,
    max_participants: 1,
    location_type: "virtual" as const,
  },
  bundle: {
    name: "5-Session Bundle",
    shortDescription: "Save with a multi-session package",
    price: "450",
    duration_minutes: 60,
    max_participants: 1,
    location_type: "virtual" as const,
  },
}

export function GuidedServiceWizard() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentPhase, setCurrentPhase] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [selectedServiceType, setSelectedServiceType] = useState<string>("")
  const [useTemplate, setUseTemplate] = useState(false)

  // Bundle/Package configuration state
  const [bundleConfig, setBundleConfig] = useState({
    sessionServiceId: null as number | null,
    sessionsIncluded: 5,
    suggestedPrice: 0,
    suggestedDiscount: 10
  })
  const [packageConfig, setPackageConfig] = useState({
    selectedServices: [] as PackageServiceItem[],
    totalValue: 0
  })

  // New package builder state (improved flow)
  const [packageSessions, setPackageSessions] = useState<PackageSessionItem[]>([])
  const [packageDiscount, setPackageDiscount] = useState(15) // Default to recommended 15%
  const [packageFinalPrice, setPackageFinalPrice] = useState(0)

  // Fetch data
  const { data: modalities } = useQuery({
    ...modalitiesListOptions({}),
  })

  const { data: practitionerCategories, refetch: refetchPractitionerCategories } = useQuery({
    ...practitionerCategoriesListOptions({}),
  })

  const { data: schedules } = useQuery({
    ...schedulesListOptions({}),
  })

  // Form setup
  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      serviceType: "",
      name: "",
      price: "0",
      duration_minutes: 60,
      max_participants: 1,
      location_type: "virtual",
      modalityId: "",
      practitionerCategoryId: "",
      shortDescription: "",
      description: "",
      includes: "",
    },
    mode: "onSubmit", // Only validate on submit, not on change
  })

  // Determine if we need config steps (for bundles/packages)
  const needsConfigStep = selectedServiceType === 'bundle' || selectedServiceType === 'package'
  const isPackage = selectedServiceType === 'package'
  const isBundle = selectedServiceType === 'bundle'

  // Calculate total phases dynamically
  // Package: 1 (type) + 2 (sessions) + 3 (pricing) + 4 (basic info) + 5 (polish) = 5 phases
  // Bundle: 1 (type) + 2 (config) + 3 (basic info) + 4 (delivery) + 5 (polish) = 5 phases
  // Others: 1 (type) + 2 (basic info) + 3 (delivery) + 4 (polish) = 4 phases
  const totalPhases = needsConfigStep ? 5 : 4

  // Get the actual phase number accounting for config step
  const getDisplayPhase = (phase: number) => {
    if (!needsConfigStep || phase === 1) return phase
    return phase
  }

  // Apply template when service type changes
  useEffect(() => {
    if (selectedServiceType && useTemplate) {
      const template = SERVICE_TEMPLATES[selectedServiceType as keyof typeof SERVICE_TEMPLATES]
      if (template) {
        Object.entries(template).forEach(([key, value]) => {
          form.setValue(key as any, value)
        })
      }
    }
  }, [selectedServiceType, useTemplate, form])

  // Handle name suggestion from bundle/package config
  const handleNameSuggestion = (name: string) => {
    if (!form.getValues("name")) {
      form.setValue("name", name)
    }
  }

  // Auto-generate package name suggestion when sessions change
  useEffect(() => {
    if (isPackage && packageSessions.length > 0 && !form.getValues("name")) {
      if (packageSessions.length === 1) {
        const sessionName = packageSessions[0].service?.name || "Session"
        form.setValue("name", `${sessionName} Package`)
      } else {
        form.setValue("name", `${packageSessions.length}-Session Wellness Package`)
      }
    }
  }, [packageSessions.length, isPackage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create service mutation
  const createMutation = useMutation({
    ...servicesCreateMutation(),
    onSuccess: (data) => {
      toast({
        title: "Service created successfully! 🎉",
        description: "Redirecting to complete your service details...",
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

  // Phase validation - dynamic based on service type
  const validatePhase = async (phase: number) => {
    // For packages: 1 (type) + 2 (sessions) + 3 (pricing) + 4 (basic info) + 5 (polish)
    // Note: Packages SKIP the delivery details phase - price/duration/participants are calculated
    if (isPackage) {
      switch (phase) {
        case 1:
          return await form.trigger(["serviceType"])
        case 2:
          // Validate package sessions selection
          return packageSessions.length > 0
        case 3:
          // Validate pricing (discount is always valid since it has a default)
          return packageFinalPrice > 0
        case 4:
          // Basic info for packages
          return await form.trigger(["name", "shortDescription"])
        case 5:
          // Polish & Publish - only description needed (no price/duration/participants)
          return await form.trigger(["description"])
        default:
          return true
      }
    }
    // For bundles: 1 (type) + 2 (config) + 3 (basic info) + 4 (delivery) + 5 (polish)
    else if (isBundle) {
      switch (phase) {
        case 1:
          return await form.trigger(["serviceType"])
        case 2:
          // Validate bundle config
          return bundleConfig.sessionServiceId !== null && bundleConfig.sessionsIncluded >= 2
        case 3:
          return await form.trigger(["name", "shortDescription"])
        case 4:
          return await form.trigger(["price", "duration_minutes", "max_participants", "location_type"])
        case 5:
          return await form.trigger(["description"])
        default:
          return true
      }
    } else {
      // Standard flow for session/workshop/course
      switch (phase) {
        case 1:
          return await form.trigger(["serviceType"])
        case 2:
          return await form.trigger(["name", "shortDescription"])
        case 3:
          return await form.trigger(["price", "duration_minutes", "max_participants", "location_type"])
        case 4:
          return await form.trigger(["description"])
        default:
          return true
      }
    }
  }

  // Navigation - dynamic based on total phases
  const handleNext = async () => {
    const isValid = await validatePhase(currentPhase)
    if (isValid && currentPhase < totalPhases) {
      setCurrentPhase(currentPhase + 1)
    } else if (!isValid) {
      // Show specific error messages based on service type and phase
      if (isPackage && currentPhase === 2) {
        toast({
          title: "No sessions selected",
          description: "Please select at least one session to include in your package.",
          variant: "destructive"
        })
      } else if (isPackage && currentPhase === 3) {
        toast({
          title: "Pricing incomplete",
          description: "Please set a discount for your package.",
          variant: "destructive"
        })
      } else if (isBundle && currentPhase === 2) {
        toast({
          title: "Bundle configuration incomplete",
          description: "Please select a session service and set the number of sessions.",
          variant: "destructive"
        })
      }
    }
  }

  const handleBack = () => {
    if (currentPhase > 1) {
      setCurrentPhase(currentPhase - 1)
    }
  }

  // Submit handler
  const onSubmit = async (data: WizardFormData) => {
    setIsCreating(true)

    const selectedType = SERVICE_TYPES.find(t => t.code === data.serviceType)
    if (!selectedType) {
      setIsCreating(false)
      return
    }

    // Build child_service_configs for bundles and packages
    let childServiceConfigs: Array<{
      child_service_id: number
      quantity: number
      discount_percentage?: number
      order?: number
    }> | undefined

    let sessionsIncluded: number | undefined

    if (data.serviceType === 'bundle' && bundleConfig.sessionServiceId) {
      childServiceConfigs = [{
        child_service_id: bundleConfig.sessionServiceId,
        quantity: bundleConfig.sessionsIncluded
      }]
      sessionsIncluded = bundleConfig.sessionsIncluded
    } else if (data.serviceType === 'package' && packageSessions.length > 0) {
      // Use new package builder state
      childServiceConfigs = packageSessions.map(s => ({
        child_service_id: s.serviceId,
        quantity: 1, // Each session in package has quantity 1
        discount_percentage: 0, // Discount is applied at package level
        order: s.order
      }))
    }

    // Calculate package-specific values
    let finalPrice = data.price
    let finalDuration = data.duration_minutes
    let finalMaxParticipants = data.max_participants

    if (data.serviceType === 'package' && packageSessions.length > 0) {
      // Use the calculated final price from discount slider
      finalPrice = packageFinalPrice.toFixed(2)
      // Calculate total duration from all sessions
      finalDuration = packageSessions.reduce((sum, s) => sum + (s.service?.duration_minutes || 0), 0)
      // Packages are always for 1 participant
      finalMaxParticipants = 1
    }

    // Build request body
    const requestBody = {
      name: data.name,
      service_type_id: selectedType.id,
      price: finalPrice,
      short_description: data.shortDescription,
      description: data.description,
      duration_minutes: finalDuration,
      max_participants: finalMaxParticipants,
      min_participants: 1,
      location_type: data.location_type,
      status: 'draft',
      is_active: false,
      is_public: false,
      experience_level: "all_levels",
      what_youll_learn: "",
      prerequisites: "",
      includes: data.includes ? data.includes.split('\n').filter(item => item.trim()).map(item => item.trim()) : [],
      // Optional fields
      ...(data.schedule_id && data.schedule_id !== "none" && { schedule: parseInt(data.schedule_id) }),
      ...(data.modalityId && data.modalityId !== "none" && { modality_ids: [parseInt(data.modalityId)] }),
      ...(data.practitionerCategoryId && { practitioner_category_id: parseInt(data.practitionerCategoryId) }),
      // Bundle/Package specific fields
      ...(childServiceConfigs && { child_service_configs: childServiceConfigs }),
      ...(sessionsIncluded && { sessions_included: sessionsIncluded }),
    }

    // Create service - override headers to force JSON content type for nested objects
    await createMutation.mutateAsync({
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
      },
      bodySerializer: (body: typeof requestBody) => JSON.stringify(body),
    } as any)
  }

  // Progress calculation - dynamic based on total phases
  const progress = (currentPhase / totalPhases) * 100

  // Get schema for current phase
  const getCurrentSchema = () => {
    switch (currentPhase) {
      case 1: return phase1Schema
      case 2: return phase2Schema
      case 3: return phase3Schema
      default: return phase1Schema
    }
  }

  return (
    <TooltipProvider>
      <>
        {/* Standardized Header */}
        <PractitionerPageHeader
          title="Create Service"
          backLink="/dashboard/practitioner/services"
          backLabel="Services"
        />

        <div className="px-6 py-4">
          {/* Progress Bar */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Step {currentPhase} of {totalPhases}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* Phase 1: Core Setup */}
            {currentPhase === 1 && (
              <motion.div
                key="phase1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>What are you offering?</CardTitle>
                    <CardDescription>
                      Let's start with the basics of your service
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Service Type Selection */}
                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Service Type
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-medium mb-1">Choosing the right type:</p>
                                <ul className="text-xs space-y-1">
                                  <li>• <strong>Session:</strong> Best for regular 1-on-1 appointments</li>
                                  <li>• <strong>Workshop:</strong> One-time group events</li>
                                  <li>• <strong>Course:</strong> Multi-week programs</li>
                                  <li>• <strong>Package:</strong> Mix different services</li>
                                  <li>• <strong>Bundle:</strong> Multiple of the same service</li>
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                setSelectedServiceType(value)
                                // Auto-advance to next phase after selection
                                setTimeout(() => {
                                  setCurrentPhase(2)
                                }, 300)
                              }}
                              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                              {SERVICE_TYPES.map((type) => {
                                const Icon = type.icon
                                return (
                                  <label
                                    key={type.code}
                                    htmlFor={type.code}
                                    className={cn(
                                      "relative flex flex-col p-4 cursor-pointer rounded-lg border-2 transition-all",
                                      field.value === type.code
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    <RadioGroupItem
                                      id={type.code}
                                      value={type.code}
                                      className="sr-only"
                                    />
                                    <div className="flex items-start gap-3">
                                      <div className={cn("p-2 rounded-lg", type.color)}>
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium">{type.name}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {type.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          <span className="font-medium">Examples:</span> {type.examples}
                                        </p>
                                      </div>
                                    </div>
                                  </label>
                                )
                              })}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Phase 2: Bundle Config (only for bundle type) */}
            {currentPhase === 2 && isBundle && (
              <motion.div
                key="phase2-bundle-config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <BundleConfigStep
                      config={bundleConfig}
                      onConfigChange={setBundleConfig}
                      currentPrice={form.watch("price")}
                      onPriceChange={(price) => form.setValue("price", price)}
                      onNameSuggestion={handleNameSuggestion}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Phase 2: Package Session Selection (only for package type) */}
            {currentPhase === 2 && isPackage && (
              <motion.div
                key="phase2-package-sessions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <PackageStepSessions
                      selectedSessions={packageSessions}
                      onSessionsChange={setPackageSessions}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Phase 3: Package Pricing (only for package type) */}
            {currentPhase === 3 && isPackage && (
              <motion.div
                key="phase3-package-pricing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <PackageStepPricing
                      selectedSessions={packageSessions}
                      discountPercentage={packageDiscount}
                      onDiscountChange={setPackageDiscount}
                      finalPrice={packageFinalPrice}
                      onFinalPriceChange={setPackageFinalPrice}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Basic Info Phase:
                - Standard (session/workshop/course): Phase 2
                - Bundle: Phase 3 (after config)
                - Package: Phase 4 (after sessions + pricing)
            */}
            {((currentPhase === 2 && !needsConfigStep) || (currentPhase === 3 && isBundle) || (currentPhase === 4 && isPackage)) && (
              <motion.div
                key="phase-basic-info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Tell us about your {SERVICE_TYPES.find(t => t.code === selectedServiceType)?.name || 'service'}</CardTitle>
                    <CardDescription>
                      Give your service a name and description
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Template Option - hide for bundles/packages since we have config */}
                    {!needsConfigStep && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useTemplate}
                            onChange={(e) => setUseTemplate(e.target.checked)}
                            className="rounded"
                          />
                          Use our recommended template for {SERVICE_TYPES.find(t => t.code === selectedServiceType)?.name}s
                        </label>
                      </motion.div>
                    )}

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
                          <div className="flex justify-between text-sm">
                            <FormDescription>
                              A short summary that appears in search results
                            </FormDescription>
                            <span className={cn(
                              "text-muted-foreground",
                              field.value.length > 300 && "text-destructive"
                            )}>
                              {field.value.length}/300
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Delivery Details Phase:
                - Standard (session/workshop/course): Phase 3
                - Bundle: Phase 4 (after basic info)
                - Package: SKIP (price/duration/participants are calculated)
            */}
            {((currentPhase === 3 && !needsConfigStep) || (currentPhase === 4 && isBundle)) && (
              <motion.div
                key="phase-delivery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>How will you deliver it?</CardTitle>
                    <CardDescription>
                      Set up the practical details of your service
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Price - show as read-only info for bundles/packages since it was set in config */}
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              {needsConfigStep ? `${selectedServiceType === 'bundle' ? 'Bundle' : 'Package'} Price` : 'Price'}
                            </FormLabel>
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
                              {needsConfigStep
                                ? "Price was set in the previous step. You can adjust it here if needed."
                                : "You can adjust pricing later"
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Duration */}
                      <FormField
                        control={form.control}
                        name="duration_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Duration (minutes)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="15"
                                step="15"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value) || 60)}
                              />
                            </FormControl>
                            <FormDescription>
                              How long is each session?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Location Type */}
                    <FormField
                      control={form.control}
                      name="location_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location Type
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            >
                              <label
                                htmlFor="virtual"
                                className={cn(
                                  "flex items-center gap-3 p-4 cursor-pointer rounded-lg border-2 transition-all",
                                  field.value === "virtual"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <RadioGroupItem
                                  id="virtual"
                                  value="virtual"
                                  className="sr-only"
                                />
                                <Video className="h-5 w-5" />
                                <div>
                                  <p className="font-medium">Virtual</p>
                                  <p className="text-xs text-muted-foreground">Online sessions</p>
                                </div>
                              </label>
                              
                              <label
                                htmlFor="in_person"
                                className={cn(
                                  "flex items-center gap-3 p-4 cursor-pointer rounded-lg border-2 transition-all",
                                  field.value === "in_person"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <RadioGroupItem
                                  id="in_person"
                                  value="in_person"
                                  className="sr-only"
                                />
                                <MapPin className="h-5 w-5" />
                                <div>
                                  <p className="font-medium">In-Person</p>
                                  <p className="text-xs text-muted-foreground">Physical location</p>
                                </div>
                              </label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Max Participants */}
                    <FormField
                      control={form.control}
                      name="max_participants"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Maximum Participants
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            How many people can join? (1 for individual sessions)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Schedule Selection for Sessions */}
                    {selectedServiceType === "session" && (
                      <FormField
                        control={form.control}
                        name="schedule_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Availability Schedule (Optional)
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "none"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a schedule" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No schedule</SelectItem>
                                {schedules?.results?.map((schedule) => (
                                  <SelectItem key={schedule.id} value={String(schedule.id)}>
                                    {schedule.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose which availability schedule to use
                            </FormDescription>
                            {(!schedules?.results || schedules.results.length === 0) && (
                              <p className="text-sm text-destructive mt-2">
                                You haven't created any availability schedules yet. You can add one later in your{" "}
                                <Link href="/dashboard/practitioner/availability" className="underline hover:text-destructive/80">
                                  availability settings
                                </Link>.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Phase 4/5: Polish & Publish (phase 4 for standard, phase 5 for bundle/package) */}
            {((currentPhase === 4 && !needsConfigStep) || (currentPhase === 5 && needsConfigStep)) && (
              <motion.div
                key="phase-polish"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Make it shine!</CardTitle>
                    <CardDescription>
                      Add details that will help your service stand out
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Modality and Practitioner Category */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Modality */}
                      <FormField
                        control={form.control}
                        name="modalityId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Tag className="h-4 w-4 mr-2" />
                              Modality
                            </FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a modality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No modality</SelectItem>
                                {modalities?.results?.map((modality) => (
                                  <SelectItem key={modality.id} value={String(modality.id)}>
                                    {modality.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The primary practice modality for this service (e.g., Yoga, Meditation)
                            </FormDescription>
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
                              key={practitionerCategories?.results?.length}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select or create your category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No category</SelectItem>
                                {practitionerCategories?.results?.map((category) => (
                                  <SelectItem key={category.id} value={String(category.id)}>
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
                            <FormDescription>
                              Organize your services into your own custom categories (e.g., "Beginner Classes", "Premium Sessions")
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* What's Included */}
                    <FormField
                      control={form.control}
                      name="includes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What's Included (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g., Course materials, Personal feedback, Certificate of completion..."
                              className="resize-none"
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            List the key benefits or materials included
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Full Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide a detailed description of your service. Explain what participants can expect, the journey they'll go through, and the transformation they'll experience..."
                              className="resize-none"
                              rows={6}
                              {...field} 
                            />
                          </FormControl>
                          <div className="flex justify-between text-sm">
                            <FormDescription>
                              Tell the full story of your service
                            </FormDescription>
                            <span className={cn(
                              "text-muted-foreground",
                              field.value.length < 50 && "text-amber-600"
                            )}>
                              {field.value.length}/2000
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preview Card */}
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </h4>
                      <div className="space-y-2">
                        <h5 className="font-medium">{form.watch("name") || "Your Service Name"}</h5>
                        <p className="text-sm text-muted-foreground">
                          {form.watch("shortDescription") || "Your service description will appear here"}
                        </p>
                        {isPackage && packageSessions.length > 0 ? (
                          // Package-specific preview
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-primary">${packageFinalPrice.toFixed(2)}</span>
                              <span className="text-muted-foreground line-through">
                                ${packageSessions.reduce((sum, s) => sum + parseFloat(s.service?.price || "0"), 0).toFixed(2)}
                              </span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {packageDiscount}% off
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{packageSessions.length} sessions</span>
                              <span>•</span>
                              <span>{packageSessions.reduce((sum, s) => sum + (s.service?.duration_minutes || 0), 0)} min total</span>
                            </div>
                          </div>
                        ) : (
                          // Standard preview for other service types
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">${form.watch("price") || "0"}</span>
                            <span>{form.watch("duration_minutes") || 60} minutes</span>
                            <Badge variant="secondary">{form.watch("location_type") || "virtual"}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={currentPhase === 1 ? () => router.push("/dashboard/practitioner/services") : handleBack}
              disabled={isCreating}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentPhase === 1 ? "Cancel" : "Back"}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Draft saved",
                    description: "You can continue editing later",
                  })
                }}
                disabled={isCreating}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>

              {currentPhase < totalPhases ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isCreating}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="min-w-[120px]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Create {selectedServiceType === 'bundle' ? 'Bundle' : selectedServiceType === 'package' ? 'Package' : 'Service'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(open) => {
        setShowCategoryDialog(open)
        if (!open) {
          refetchPractitionerCategories()
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
          }} />
        </DialogContent>
      </Dialog>
        </div>
      </>
    </TooltipProvider>
  )
}