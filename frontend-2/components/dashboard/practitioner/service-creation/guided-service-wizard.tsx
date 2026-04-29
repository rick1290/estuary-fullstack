"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  HelpCircle,
  Image as ImageIcon,
  Upload,
  X,
  Wand2,
  FileText,
  Compass,
  Globe,
  Target,
  BookMarked,
  Shield,
} from "lucide-react"
import {
  servicesCreateMutation,
  practitionerCategoriesListOptions,
  schedulesListOptions,
  modalitiesListOptions,
  modalityCategoriesListOptions,
  aiImagesGenerateCreateMutation,
  servicesUploadCoverImageCreateMutation,
  practitionerLocationsListOptions,
  serviceSessionsCreateMutation
} from "@/src/client/@tanstack/react-query.gen"
import { CreateLocationDialog } from "../service-edit/sections/create-location-dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  description: z.string().min(50, "Please provide a detailed description (50+ characters)").max(2000),
})

const phase2Schema = z.object({
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid number",
  }),
  duration_minutes: z.number().min(1, "Duration must be at least 1 minute"),
  max_participants: z.number().min(1),
  location_type: z.enum(["virtual", "in_person"]),
  practitioner_location: z.number().optional(),
  schedule_id: z.string().optional(),
})

const phase3Schema = z.object({
  modalityId: z.string().optional(),
  practitionerCategoryId: z.string().optional(),
  includes: z.string().optional(),
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

  // Image step state
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [pendingAiImageId, setPendingAiImageId] = useState<number | null>(null)
  const [pendingAiImageUrl, setPendingAiImageUrl] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [generationsRemaining, setGenerationsRemaining] = useState<number | null>(null)
  const [imageActiveTab, setImageActiveTab] = useState("ai")

  // Publish choice state
  const [publishChoice, setPublishChoice] = useState<"publish" | "draft" | null>(null)

  // Celebration screen state
  const [creationComplete, setCreationComplete] = useState(false)
  const [createdServiceId, setCreatedServiceId] = useState<number | null>(null)
  const [createdServiceName, setCreatedServiceName] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)

  // Fetch data
  const { data: modalities } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 200 } }),
  })

  const { data: modalityCategories } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
  })

  // Group modalities by category slug for the dropdown
  const modalitiesByCategory = (modalities?.results || []).reduce<Record<string, any[]>>((acc, mod) => {
    const catSlug = (mod as any).category_slug || "other"
    if (!acc[catSlug]) acc[catSlug] = []
    acc[catSlug].push(mod)
    return acc
  }, {})

  const { data: practitionerCategories, refetch: refetchPractitionerCategories } = useQuery({
    ...practitionerCategoriesListOptions({}),
  })

  const { data: schedules } = useQuery({
    ...schedulesListOptions({}),
  })

  const { data: practitionerLocationsData, isLoading: locationsLoading, refetch: refetchLocations } = useQuery({
    ...practitionerLocationsListOptions(),
  })
  const practitionerLocations = practitionerLocationsData?.results || []
  const [showCreateLocationDialog, setShowCreateLocationDialog] = useState(false)

  type WizardSession = {
    id: string
    title: string
    start_time: string
    end_time: string
    max_participants?: number
  }
  const [wizardSessions, setWizardSessions] = useState<WizardSession[]>([])
  const [sessionsError, setSessionsError] = useState<string | null>(null)

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
      practitioner_location: undefined,
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
  const isWorkshopOrCourse = selectedServiceType === 'workshop' || selectedServiceType === 'course'

  // Build phases array dynamically based on service type
  const phases = useMemo(() => {
    const base: Array<{ key: string; title: string; icon: any }> = [
      { key: "type", title: "Service Type", icon: Compass },
    ]

    if (isBundle) {
      base.push({ key: "bundle-config", title: "Bundle Setup", icon: Layers })
    } else if (isPackage) {
      base.push({ key: "package-sessions", title: "Select Sessions", icon: Package })
      base.push({ key: "package-pricing", title: "Pricing", icon: DollarSign })
    }

    base.push({ key: "basic-info", title: "Basic Info", icon: FileText })

    if (isWorkshopOrCourse) {
      base.push({ key: "pricing-duration", title: "Pricing", icon: DollarSign })
      base.push({ key: "location", title: "Location", icon: MapPin })
      base.push({ key: "sessions", title: "Sessions", icon: Calendar })
    } else if (!isPackage) {
      base.push({ key: "delivery", title: "Details", icon: Clock })
    }

    base.push({ key: "image", title: "Cover Image", icon: ImageIcon })
    base.push({ key: "review", title: "Review & Launch", icon: CheckCircle2 })

    return base
  }, [isBundle, isPackage, isWorkshopOrCourse])

  const totalPhases = phases.length
  const currentPhaseKey = phases[currentPhase - 1]?.key || "type"

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

  // AI Image Generation mutation
  const generateImageMutation = useMutation({
    ...aiImagesGenerateCreateMutation(),
    onSuccess: (data: any) => {
      toast({
        title: "Image Generated!",
        description: "Your AI-generated image is ready. Click 'Use This' to select it.",
      })
      if (data.image_url) {
        setPendingAiImageUrl(data.image_url)
        setPendingAiImageId(data.id)
      }
      if (typeof data.generations_remaining_today === 'number') {
        setGenerationsRemaining(data.generations_remaining_today)
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.body?.error || error?.message || "Failed to generate image"
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    },
  })

  // Fetch initial AI generation stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const session = await fetch('/api/auth/session').then(r => r.json())
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/v1/ai-images/stats/`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken || ''}`
          },
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          if (typeof data.generations_remaining_today === 'number') {
            setGenerationsRemaining(data.generations_remaining_today)
          }
        }
      } catch {
        // Silently fail - not critical
      }
    }
    fetchStats()
  }, [])

  // Image handlers
  const generateExamplePrompt = () => {
    const serviceName = form.getValues("name") || "wellness service"
    const description = form.getValues("shortDescription") || ""
    const cleanDescription = description.replace(/\s+/g, ' ').trim().substring(0, 150)
    if (cleanDescription) {
      return `"${serviceName}" - ${cleanDescription}`
    }
    return `"${serviceName}"`
  }

  const handleWizardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive",
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setPendingImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setPendingImageFile(file)
      // Clear any AI image selection
      setPendingAiImageId(null)
      setPendingAiImageUrl(null)
    }
  }

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for the image",
        variant: "destructive",
      })
      return
    }
    try {
      await generateImageMutation.mutateAsync({
        body: { prompt: aiPrompt },
      })
    } catch {
      // Error handled in mutation onError
    }
  }

  const handleUseGeneratedImage = () => {
    // Clear file upload selection since we're using AI image
    setPendingImageFile(null)
    setPendingImagePreview(null)
    // pendingAiImageId and pendingAiImageUrl are already set from generation
  }

  const cancelGeneratedImage = () => {
    setPendingAiImageUrl(null)
    setPendingAiImageId(null)
  }

  const removeSelectedImage = () => {
    setPendingImageFile(null)
    setPendingImagePreview(null)
  }

  // Create service mutation
  const createMutation = useMutation({
    ...servicesCreateMutation(),
    onSuccess: async (data) => {
      if (!data?.id) {
        console.error('No service ID in response:', data)
        router.push('/dashboard/practitioner/services')
        return
      }

      // Create scheduled sessions for workshops/courses
      if (wizardSessions.length > 0) {
        const publishing = form.formState.submitCount > 0
        const sessionStatus = publishing ? "scheduled" : "draft"
        let sessionFailures = 0
        for (const [idx, s] of wizardSessions.entries()) {
          try {
            await (serviceSessionsCreateMutation() as any).mutationFn({
              body: {
                service: data.id,
                title: s.title || undefined,
                start_time: new Date(s.start_time),
                end_time: new Date(s.end_time),
                sequence_number: idx + 1,
                status: sessionStatus,
                max_participants: form.getValues("max_participants"),
              },
            })
          } catch (err) {
            sessionFailures += 1
            console.error("Session create failed", err)
          }
        }
        if (sessionFailures > 0) {
          toast({
            title: `${sessionFailures} session(s) couldn't be scheduled`,
            description: "Your service was created. Add the missing sessions in Settings → Sessions & Schedule.",
            variant: "destructive",
          })
        }
      }

      // Chain image upload/apply after service creation
      try {
        if (pendingImageFile) {
          await servicesUploadCoverImageCreateMutation().mutationFn({
            path: { id: data.id },
            body: { image: pendingImageFile },
          } as any)
        } else if (pendingAiImageId) {
          const session = await fetch('/api/auth/session').then(r => r.json())
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          await fetch(`${apiUrl}/api/v1/ai-images/${pendingAiImageId}/apply-to-service/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.accessToken || ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ service_id: data.id }),
            credentials: 'include',
          })
        }
      } catch {
        // Image upload failed — service still created, user can re-do in settings
      }

      // Show celebration screen instead of redirecting
      setCreatedServiceId(data.id)
      setCreatedServiceName(form.getValues("name"))
      setCreationComplete(true)
      setShowConfetti(true)
      setIsCreating(false)
      // Auto-hide confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000)
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

  // Phase validation — uses phase keys so it works regardless of ordering
  const validatePhase = async (phase: number) => {
    const key = phases[phase - 1]?.key
    switch (key) {
      case "type":
        return await form.trigger(["serviceType"])
      case "bundle-config":
        return bundleConfig.sessionServiceId !== null && bundleConfig.sessionsIncluded >= 2
      case "package-sessions":
        return packageSessions.length > 0
      case "package-pricing":
        return packageFinalPrice > 0
      case "basic-info":
        return await form.trigger(["name", "shortDescription", "description"])
      case "delivery": {
        const fieldsValid = await form.trigger(["price", "duration_minutes", "max_participants", "location_type"])
        const locType = form.getValues("location_type")
        const locId = form.getValues("practitioner_location")
        if (locType === "in_person" && !locId) {
          form.setError("practitioner_location", {
            type: "manual",
            message: "Please select or add a location for in-person services",
          })
          return false
        }
        return fieldsValid
      }
      case "pricing-duration":
        return await form.trigger(["price", "duration_minutes", "max_participants"])
      case "location": {
        const fieldsValid = await form.trigger(["location_type"])
        const locType = form.getValues("location_type")
        const locId = form.getValues("practitioner_location")
        if (locType === "in_person" && !locId) {
          form.setError("practitioner_location", {
            type: "manual",
            message: "Please select or add a location for in-person services",
          })
          return false
        }
        return fieldsValid
      }
      case "sessions": {
        if (wizardSessions.length === 0) {
          setSessionsError("Add at least one scheduled session before continuing.")
          return false
        }
        const invalid = wizardSessions.find(
          (s) => !s.start_time || !s.end_time || new Date(s.end_time) <= new Date(s.start_time)
        )
        if (invalid) {
          setSessionsError("Each session needs a start and end time, and must end after it starts.")
          return false
        }
        setSessionsError(null)
        return true
      }
      case "image":
        // Image step is optional — always valid
        return true
      case "review":
        // Review step is read-only — always valid
        return true
      default:
        return true
    }
  }

  // Navigation - dynamic based on total phases
  const handleNext = async () => {
    const isValid = await validatePhase(currentPhase)
    if (isValid && currentPhase < totalPhases) {
      setCurrentPhase(currentPhase + 1)
    } else if (!isValid) {
      // Show specific error messages based on phase key
      if (currentPhaseKey === "package-sessions") {
        toast({
          title: "No sessions selected",
          description: "Please select at least one session to include in your package.",
          variant: "destructive"
        })
      } else if (currentPhaseKey === "package-pricing") {
        toast({
          title: "Pricing incomplete",
          description: "Please set a discount for your package.",
          variant: "destructive"
        })
      } else if (currentPhaseKey === "bundle-config") {
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

  // Submit handler — called by both "Save as Draft" and "Create & Publish"
  const handleCreate = async (choice: "publish" | "draft") => {
    // Validate the final phase first
    const isValid = await validatePhase(currentPhase)
    if (!isValid) return

    setPublishChoice(choice)
    setIsCreating(true)

    const data = form.getValues()
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
      childServiceConfigs = packageSessions.map(s => ({
        child_service_id: s.serviceId,
        quantity: 1,
        discount_percentage: 0,
        order: s.order
      }))
    }

    // Calculate package-specific values
    let finalPrice = data.price
    let finalDuration = data.duration_minutes
    let finalMaxParticipants = data.max_participants

    if (data.serviceType === 'package' && packageSessions.length > 0) {
      finalPrice = packageFinalPrice.toFixed(2)
      finalDuration = packageSessions.reduce((sum, s) => sum + (s.service?.duration_minutes || 0), 0)
      finalMaxParticipants = 1
    }

    const isPublish = choice === "publish"

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
      ...(data.practitioner_location && { practitioner_location: data.practitioner_location }),
      status: isPublish ? 'active' : 'draft',
      is_active: isPublish,
      is_public: isPublish,
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

  // Keep form onSubmit for "Create & Publish" (form validation still applies)
  const onSubmit = async () => {
    await handleCreate("publish")
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
          {/* Celebration Screen */}
          {creationComplete && createdServiceId ? (
            <>
              {/* Confetti overlay */}
              {showConfetti && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
                  {[...Array(50)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        backgroundColor: ['#9CAF88', '#E07A5F', '#F4A261'][Math.floor(Math.random() * 3)]
                      }}
                      initial={{ y: -20, opacity: 1 }}
                      animate={{
                        y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
                        x: Math.random() * 200 - 100,
                        rotate: Math.random() * 360,
                        opacity: 0
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        delay: Math.random() * 2,
                        ease: "easeIn"
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="max-w-2xl mx-auto py-8">
                {/* Animated Checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-sage-500 to-terracotta-500 rounded-full flex items-center justify-center shadow-xl">
                    <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.5} />
                  </div>
                </motion.div>

                {/* Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-3xl font-bold text-olive-900 mb-2">
                    {publishChoice === "publish"
                      ? `${createdServiceName} is live!`
                      : "Your draft has been saved!"}
                  </h2>
                  <p className="text-muted-foreground">
                    {publishChoice === "publish"
                      ? "Your service is now visible to clients."
                      : "You can finish setting it up anytime from your dashboard."}
                  </p>
                </motion.div>

                {/* Availability nudge — every published service needs bookable slots */}
                {publishChoice === "publish" && selectedServiceType !== "bundle" && selectedServiceType !== "package" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mb-6"
                  >
                    <Card className="border-sage-300 bg-sage-50/60">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5 text-sage-700" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">Set up availability so clients can book</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Until you add available time slots, your service will show "No availability in the next 30 days" and clients won't be able to book it.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => router.push("/dashboard/practitioner/availability")}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Set up availability
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/practitioner/services/${createdServiceId}`)}
                            >
                              Later
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Intake form prompt — workshops, courses, or in-person services */}
                {(selectedServiceType === "workshop" ||
                  selectedServiceType === "course" ||
                  form.getValues("location_type") === "in_person") && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                  >
                    <Card className="border-terracotta-200 bg-terracotta-50/40">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 bg-terracotta-100 rounded-full flex items-center justify-center shrink-0">
                          <Shield className="h-5 w-5 text-terracotta-700" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">Need an intake form?</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {selectedServiceType === "workshop" || selectedServiceType === "course"
                              ? "For group or ceremonial work, intake forms help you screen participants for safety and fit."
                              : "For in-person services, intake forms let you collect relevant history before clients arrive."}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => router.push("/dashboard/practitioner/intake")}
                            >
                              Create intake form
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/practitioner/services/${createdServiceId}`)}
                            >
                              Not now
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Level Up Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-8"
                >
                  <h3 className="text-lg font-semibold text-center mb-4">Level Up Your Service</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border-sage-200"
                      onClick={() => router.push(`/dashboard/practitioner/services/${createdServiceId}/settings?section=benefits`)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Target className="h-5 w-5 text-sage-700" />
                        </div>
                        <h4 className="font-medium text-sm mb-1">Learning Goals & Prerequisites</h4>
                        <p className="text-xs text-muted-foreground">Help clients know what to expect</p>
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border-terracotta-200"
                      onClick={() => router.push(`/dashboard/practitioner/services/${createdServiceId}/settings?section=resources`)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 bg-terracotta-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookMarked className="h-5 w-5 text-terracotta-700" />
                        </div>
                        <h4 className="font-medium text-sm mb-1">Resources & Materials</h4>
                        <p className="text-xs text-muted-foreground">Upload files for participants</p>
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border-blush-200"
                      onClick={() => router.push(`/dashboard/practitioner/services/${createdServiceId}/settings?section=advanced`)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 bg-blush-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Shield className="h-5 w-5 text-blush-700" />
                        </div>
                        <h4 className="font-medium text-sm mb-1">Terms & Advanced Rules</h4>
                        <p className="text-xs text-muted-foreground">Cancellation policies and more</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                  <Button
                    size="lg"
                    onClick={() => router.push(`/dashboard/practitioner/services/${createdServiceId}`)}
                    className="min-w-[180px]"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View My Service
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push("/dashboard/practitioner/services")}
                  >
                    Back to Services
                  </Button>
                </motion.div>
              </div>
            </>
          ) : (
          <>
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
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    <RadioGroupItem
                                      id={type.code}
                                      value={type.code}
                                      className="sr-only"
                                    />
                                    {field.value === type.code && (
                                      <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-primary" />
                                    )}
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

            {/* Bundle Config Phase */}
            {currentPhaseKey === "bundle-config" && (
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

            {/* Package Session Selection Phase */}
            {currentPhaseKey === "package-sessions" && (
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

            {/* Package Pricing Phase */}
            {currentPhaseKey === "package-pricing" && (
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

            {/* Basic Info Phase */}
            {currentPhaseKey === "basic-info" && (
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
                        <Checkbox
                          id="use-template"
                          checked={useTemplate}
                          onCheckedChange={(v) => setUseTemplate(v === true)}
                        />
                        <Label htmlFor="use-template" className="text-sm font-normal cursor-pointer">
                          Use our recommended template for {SERVICE_TYPES.find(t => t.code === selectedServiceType)?.name}s
                        </Label>
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
                              Tell the full story of your service (minimum 50 characters)
                            </FormDescription>
                            <span className={cn(
                              "text-muted-foreground",
                              field.value.length < 50 && field.value.length > 0 && "text-amber-600"
                            )}>
                              {field.value.length}/2000
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              Modality (Optional)
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
                              <SelectContent className="max-h-80">
                                <SelectItem value="none">No modality</SelectItem>
                                {(modalityCategories?.results || []).map((cat) => {
                                  const catMods = modalitiesByCategory[(cat as any).slug ?? ""] || []
                                  if (catMods.length === 0) return null
                                  return (
                                    <SelectGroup key={cat.id}>
                                      <SelectLabel className="text-xs font-semibold text-olive-500 uppercase tracking-wider">
                                        {cat.name}
                                      </SelectLabel>
                                      {catMods.map((modality: any) => (
                                        <SelectItem key={modality.id} value={String(modality.id)}>
                                          {modality.name}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              e.g., Yoga, Meditation, Breathwork
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
                              Organize into your own custom categories
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
                            List the key benefits or materials included (one per line)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Delivery / Pricing / Location Phases (unified card, section-gated) */}
            {(currentPhaseKey === "delivery" || currentPhaseKey === "pricing-duration" || currentPhaseKey === "location") && (
              <motion.div
                key={`phase-${currentPhaseKey}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {currentPhaseKey === "pricing-duration" && "Pricing & Duration"}
                      {currentPhaseKey === "location" && "Where will it happen?"}
                      {currentPhaseKey === "delivery" && "How will you deliver it?"}
                    </CardTitle>
                    <CardDescription>
                      {currentPhaseKey === "pricing-duration" && "Set the price, duration, and capacity for each session."}
                      {currentPhaseKey === "location" && "Choose where attendees will meet you."}
                      {currentPhaseKey === "delivery" && "Set up the practical details of your service"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(currentPhaseKey === "delivery" || currentPhaseKey === "pricing-duration") && (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Price - with $ prefix, matching settings page */}
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => {
                          const priceGuidance: Record<string, { placeholder: string; hint: string }> = {
                            session: {
                              placeholder: "e.g. 120",
                              hint: "Most practitioners charge $80–$180 per session. Free is fine too — set to 0.",
                            },
                            workshop: {
                              placeholder: "e.g. 75",
                              hint: "Group workshops typically run $40–$150 per participant depending on length.",
                            },
                            course: {
                              placeholder: "e.g. 350",
                              hint: "Multi-session courses typically run $200–$800 total.",
                            },
                            bundle: {
                              placeholder: "e.g. 500",
                              hint: "Bundles are usually priced at a 10–20% discount vs. buying sessions individually.",
                            },
                            package: {
                              placeholder: "e.g. 400",
                              hint: "Packages combine multiple services — price to reflect the total value.",
                            },
                          }
                          const guidance = priceGuidance[selectedServiceType] || {
                            placeholder: "0",
                            hint: "Set to 0 for free services",
                          }
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                {needsConfigStep ? `${selectedServiceType === 'bundle' ? 'Bundle' : 'Package'} Price` : 'Price'}
                              </FormLabel>
                              <FormControl>
                                <div className="relative max-w-xs">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder={guidance.placeholder}
                                    className="pl-8"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                {needsConfigStep
                                  ? "Price was set in the previous step. You can adjust it here if needed."
                                  : guidance.hint
                                }
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />

                      {/* Duration - with preset buttons, matching settings page */}
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
                              <div className="max-w-xs space-y-2">
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  placeholder="e.g. 60"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                />
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { value: 30, label: "30m" },
                                    { value: 45, label: "45m" },
                                    { value: 60, label: "1h" },
                                    { value: 90, label: "1.5h" },
                                    { value: 120, label: "2h" },
                                    { value: 180, label: "3h" },
                                  ].map((preset) => (
                                    <Button
                                      key={preset.value}
                                      type="button"
                                      variant={field.value === preset.value ? "default" : "outline"}
                                      size="sm"
                                      className="h-7 text-xs px-2.5"
                                      onClick={() => field.onChange(preset.value)}
                                    >
                                      {preset.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    )}

                    {(currentPhaseKey === "delivery" || currentPhaseKey === "location") && (
                    <>
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

                    {/* Practitioner Location picker — shown when In-Person selected */}
                    {form.watch("location_type") === "in_person" && (
                      <FormField
                        control={form.control}
                        name="practitioner_location"
                        render={({ field }) => (
                          <FormItem className="space-y-3 pl-6 border-l-2">
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Select Address
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            {locationsLoading ? (
                              <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Loading locations...</span>
                              </div>
                            ) : practitionerLocations.length > 0 ? (
                              <div className="space-y-3">
                                <Select
                                  value={field.value?.toString()}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a location" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {practitionerLocations.map((location: any) => {
                                      const displayName =
                                        location.name ||
                                        `${location.address_line1}, ${location.city_name || ""}, ${location.state_code || ""}`
                                      return (
                                        <SelectItem key={location.id} value={location.id.toString()}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{displayName}</span>
                                            {location.name && (
                                              <span className="text-xs text-muted-foreground">
                                                {location.address_line1}, {location.city_name}, {location.state_code}
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>

                                {field.value && (() => {
                                  const selected = practitionerLocations.find((l: any) => l.id === field.value)
                                  if (!selected) return null
                                  return (
                                    <div className="p-3 border rounded-lg bg-muted/30">
                                      <div className="flex items-start gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                          <p className="font-medium">{selected.name || "Location"}</p>
                                          <p className="text-muted-foreground">{selected.address_line1}</p>
                                          {selected.address_line2 && (
                                            <p className="text-muted-foreground">{selected.address_line2}</p>
                                          )}
                                          <p className="text-muted-foreground">
                                            {selected.city_name}, {selected.state_code} {selected.postal_code}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })()}

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCreateLocationDialog(true)}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add New Location
                                </Button>
                              </div>
                            ) : (
                              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  You haven't added any locations yet. Add your first location to offer in-person services.
                                </p>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={() => setShowCreateLocationDialog(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Your First Location
                                </Button>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    </>
                    )}

                    {(currentPhaseKey === "delivery" || currentPhaseKey === "pricing-duration") && (
                    <>
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
                    </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Sessions Phase — workshops & courses only */}
            {currentPhaseKey === "sessions" && (
              <motion.div
                key="phase-sessions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      When will it happen?
                    </CardTitle>
                    <CardDescription>
                      Add at least one scheduled date and time. Clients can't book a {selectedServiceType} until it has a scheduled session.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {wizardSessions.length === 0 && (
                      <div className="p-6 border-2 border-dashed rounded-lg text-center">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          No sessions added yet. Add your first session to make this {selectedServiceType} bookable.
                        </p>
                      </div>
                    )}

                    {wizardSessions.map((session, index) => (
                      <Card key={session.id} className="border-muted">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">Session {index + 1}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWizardSessions(wizardSessions.filter((s) => s.id !== session.id))
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`session-title-${session.id}`}>Title (optional)</Label>
                            <Input
                              id={`session-title-${session.id}`}
                              placeholder={selectedServiceType === "course" ? `Week ${index + 1}` : "e.g. Morning session"}
                              value={session.title}
                              onChange={(e) => {
                                setWizardSessions(
                                  wizardSessions.map((s) =>
                                    s.id === session.id ? { ...s, title: e.target.value } : s
                                  )
                                )
                              }}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`session-start-${session.id}`}>Start</Label>
                              <Input
                                id={`session-start-${session.id}`}
                                type="datetime-local"
                                value={session.start_time}
                                onChange={(e) => {
                                  setWizardSessions(
                                    wizardSessions.map((s) =>
                                      s.id === session.id ? { ...s, start_time: e.target.value } : s
                                    )
                                  )
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`session-end-${session.id}`}>End</Label>
                              <Input
                                id={`session-end-${session.id}`}
                                type="datetime-local"
                                value={session.end_time}
                                onChange={(e) => {
                                  setWizardSessions(
                                    wizardSessions.map((s) =>
                                      s.id === session.id ? { ...s, end_time: e.target.value } : s
                                    )
                                  )
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {sessionsError && (
                      <p className="text-sm text-destructive">{sessionsError}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const duration = form.getValues("duration_minutes") || 60
                          const last = wizardSessions[wizardSessions.length - 1]
                          const baseStart = last?.start_time
                            ? new Date(new Date(last.start_time).getTime() + 7 * 24 * 60 * 60 * 1000)
                            : (() => {
                                const d = new Date()
                                d.setDate(d.getDate() + 7)
                                d.setHours(18, 0, 0, 0)
                                return d
                              })()
                          const baseEnd = new Date(baseStart.getTime() + duration * 60 * 1000)
                          const toLocalInput = (d: Date) => {
                            const pad = (n: number) => String(n).padStart(2, "0")
                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                          }
                          setWizardSessions([
                            ...wizardSessions,
                            {
                              id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                              title: "",
                              start_time: toLocalInput(baseStart),
                              end_time: toLocalInput(baseEnd),
                            },
                          ])
                          setSessionsError(null)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Session
                      </Button>

                      {wizardSessions.length > 0 && selectedServiceType === "course" && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            const last = wizardSessions[wizardSessions.length - 1]
                            if (!last?.start_time || !last?.end_time) return
                            const nextStart = new Date(new Date(last.start_time).getTime() + 7 * 24 * 60 * 60 * 1000)
                            const nextEnd = new Date(new Date(last.end_time).getTime() + 7 * 24 * 60 * 60 * 1000)
                            const toLocalInput = (d: Date) => {
                              const pad = (n: number) => String(n).padStart(2, "0")
                              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                            }
                            setWizardSessions([
                              ...wizardSessions,
                              {
                                id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                title: `Week ${wizardSessions.length + 1}`,
                                start_time: toLocalInput(nextStart),
                                end_time: toLocalInput(nextEnd),
                              },
                            ])
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Duplicate + 1 Week
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Cover Image Phase */}
            {currentPhaseKey === "image" && (
              <motion.div
                key="phase-image"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Cover Image
                    </CardTitle>
                    <CardDescription>
                      Add a visual identity to your service. You can skip this and add one later in Settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs value={imageActiveTab} onValueChange={setImageActiveTab} className="w-full">
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
                        {pendingImagePreview ? (
                          <div className="space-y-4">
                            <div className="relative w-full max-w-md">
                              <img
                                src={pendingImagePreview}
                                alt="Cover preview"
                                className="w-full h-64 object-cover rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={removeSelectedImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Image selected. It will be uploaded when you create the service.
                            </p>
                          </div>
                        ) : (
                          <Card className="max-w-md">
                            <label className="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleWizardImageChange}
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
                        {pendingAiImageUrl ? (
                          <div className="space-y-4">
                            <div className="relative w-full max-w-md">
                              <img
                                src={pendingAiImageUrl}
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
                            <div className="flex gap-2 max-w-md">
                              <Button
                                type="button"
                                onClick={handleUseGeneratedImage}
                                className="flex-1"
                              >
                                <Wand2 className="h-4 w-4 mr-2" />
                                Use This Image
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  cancelGeneratedImage()
                                  setAiPrompt("")
                                }}
                              >
                                Try Again
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-md space-y-4">
                            <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                              <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">AI Image Generation</h4>
                                    {generationsRemaining !== null && (
                                      <Badge variant="secondary" className="text-xs">
                                        {generationsRemaining} left today
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Describe your ideal service image and AI will create it for you.
                                  </p>
                                </div>
                              </div>
                            </Card>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="wizard-ai-prompt">Describe Your Image</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAiPrompt(generateExamplePrompt())}
                                  className="h-7 text-xs"
                                >
                                  <Wand2 className="h-3 w-3 mr-1" />
                                  Use Example
                                </Button>
                              </div>
                              <Textarea
                                id="wizard-ai-prompt"
                                placeholder={generateExamplePrompt()}
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                rows={4}
                                className="resize-none"
                              />
                            </div>

                            <Button
                              type="button"
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

                    <p className="text-sm text-muted-foreground">
                      You can add or change the image later in Settings.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Review & Launch Phase */}
            {currentPhaseKey === "review" && (
              <motion.div
                key="phase-review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Review Your Service
                    </CardTitle>
                    <CardDescription>
                      Everything looks good? Launch it or save as a draft.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Review Summary Card */}
                    <div className="border rounded-lg overflow-hidden bg-white">
                      {(pendingImagePreview || pendingAiImageUrl) ? (
                        <img
                          src={pendingImagePreview || pendingAiImageUrl || ""}
                          alt="Cover"
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-32 bg-gradient-to-br from-cream-100 via-sage-50 to-terracotta-50 flex items-center justify-center">
                          <div className="flex items-center gap-2 text-olive-500 text-xs">
                            <ImageIcon className="h-4 w-4" />
                            No cover image — a default placeholder will be shown
                          </div>
                        </div>
                      )}
                      <div className="p-5 space-y-4">
                        {/* Type + Name */}
                        <div className="flex items-start gap-3 flex-wrap">
                          <Badge variant="secondary" className="mt-0.5">
                            {SERVICE_TYPES.find(t => t.code === selectedServiceType)?.name || 'Service'}
                          </Badge>
                          <h3 className="text-lg font-semibold flex-1">{form.watch("name") || "Untitled Service"}</h3>
                        </div>

                        {/* Short Description */}
                        <p className="text-sm text-muted-foreground italic">
                          {form.watch("shortDescription") || "No description"}
                        </p>

                        {/* Price, Duration, Location, Participants */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                          {isPackage && packageSessions.length > 0 ? (
                            <>
                              <span className="font-medium text-primary text-base">${packageFinalPrice.toFixed(2)}</span>
                              <span className="text-muted-foreground">·</span>
                              <span>{packageSessions.length} sessions</span>
                              <span className="text-muted-foreground">·</span>
                              <span>{packageSessions.reduce((sum, s) => sum + (s.service?.duration_minutes || 0), 0)} min total</span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-primary text-base">${form.watch("price") || "0"}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {form.watch("duration_minutes") || 60} min
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="flex items-center gap-1">
                                {form.watch("location_type") === "virtual" ? (
                                  <Video className="h-3.5 w-3.5" />
                                ) : (
                                  <MapPin className="h-3.5 w-3.5" />
                                )}
                                {form.watch("location_type") === "virtual" ? "Virtual" : (() => {
                                  const locId = form.watch("practitioner_location")
                                  const loc = practitionerLocations.find((l: any) => l.id === locId)
                                  return loc?.name || loc?.city || "In-person"
                                })()}
                              </span>
                              {(form.watch("max_participants") || 1) > 1 && (
                                <>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    Up to {form.watch("max_participants")}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Modality + Category */}
                        {(form.watch("modalityId") || form.watch("practitionerCategoryId")) && (
                          <div className="flex flex-wrap gap-2">
                            {form.watch("modalityId") && form.watch("modalityId") !== "none" && (
                              <Badge variant="outline">
                                {modalities?.results?.find(m => String(m.id) === form.watch("modalityId"))?.name || "Modality"}
                              </Badge>
                            )}
                            {form.watch("practitionerCategoryId") && form.watch("practitionerCategoryId") !== "none" && (
                              <Badge variant="outline">
                                {practitionerCategories?.results?.find(c => String(c.id) === form.watch("practitionerCategoryId"))?.name || "Category"}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Full description excerpt */}
                        {form.watch("description") && (
                          <div className="pt-3 border-t border-sage-100">
                            <p className="text-xs font-medium uppercase tracking-wider text-olive-500 mb-2">About this service</p>
                            <p className="text-sm text-olive-700 line-clamp-4 whitespace-pre-wrap">
                              {form.watch("description")}
                            </p>
                          </div>
                        )}

                        {/* Sessions list for workshops/courses */}
                        {isWorkshopOrCourse && wizardSessions.length > 0 && (
                          <div className="pt-3 border-t border-sage-100">
                            <p className="text-xs font-medium uppercase tracking-wider text-olive-500 mb-2">
                              {wizardSessions.length} scheduled session{wizardSessions.length !== 1 ? "s" : ""}
                            </p>
                            <ul className="space-y-1 text-sm text-olive-700">
                              {wizardSessions.slice(0, 3).map((s, i) => (
                                <li key={s.id} className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-olive-400" />
                                  <span>{s.title || `Session ${i + 1}`}</span>
                                  <span className="text-olive-500 text-xs">
                                    {new Date(s.start_time).toLocaleDateString()}
                                  </span>
                                </li>
                              ))}
                              {wizardSessions.length > 3 && (
                                <li className="text-xs text-olive-500 italic">
                                  +{wizardSessions.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Availability heads-up */}
                    {selectedServiceType !== "bundle" && selectedServiceType !== "package" && (
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                        <Calendar className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900">
                          <p className="font-medium mb-0.5">Heads up — clients can't book until you set availability.</p>
                          <p className="text-amber-800">
                            After publishing, head to{" "}
                            <Link href="/dashboard/practitioner/availability" className="underline font-medium">
                              Availability
                            </Link>{" "}
                            to add bookable time slots.
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                      Published services are immediately visible to clients. Drafts can be completed later.
                    </p>
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
              {currentPhaseKey !== "review" ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isCreating}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreate("draft")}
                    disabled={isCreating}
                  >
                    {isCreating && publishChoice === "draft" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleCreate("publish")}
                    disabled={isCreating}
                    className="min-w-[140px]"
                  >
                    {isCreating && publishChoice === "publish" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Create & Publish
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>
          </>
          )}

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

      <CreateLocationDialog
        open={showCreateLocationDialog}
        onOpenChange={setShowCreateLocationDialog}
        onLocationCreated={() => {
          setShowCreateLocationDialog(false)
          refetchLocations().then((res) => {
            const newest = res.data?.results?.[0]
            if (newest?.id) {
              form.setValue("practitioner_location", newest.id, { shouldValidate: true })
            }
          })
        }}
      />
        </div>
      </>
    </TooltipProvider>
  )
}