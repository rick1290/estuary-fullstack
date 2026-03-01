"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  servicesRetrieveOptions,
  servicesUpdateMutation,
  servicesPartialUpdateMutation
} from "@/src/client/@tanstack/react-query.gen"
import type { ServiceDetailReadable as ServiceReadable, ServiceCreateUpdateRequestWritable } from "@/src/client/types.gen"
import { useToast } from "@/hooks/use-toast"
import { patchWithFormData } from "@/lib/api-helpers"
import { getServiceDetailUrl } from "@/lib/service-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  AlertCircle,
  Circle,
  Save,
  Eye,
  Archive,
  Copy,
  ChevronLeft,
  Loader2,
  HelpCircle,
  Sparkles,
  Menu,
  X,
  Rocket,
  ArrowRight,
  Star,
  Users,
  Calendar,
  AlertTriangle,
  CalendarPlus,
} from "lucide-react"
import { format } from "date-fns"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

// Import section components
import { BasicInfoSection } from "./sections/basic-info-section"
import { PricingDurationSection } from "./sections/pricing-duration-section"
import { ScheduleSelectionSection } from "./sections/schedule-selection-section"
import { LocationSection } from "./sections/location-section"
import { MediaSection } from "./sections/media-section"
import { BenefitsSection } from "./sections/benefits-section"
import { ResourcesSection } from "./sections/resources-section"
import { RevenueSharingSection } from "./sections/revenue-sharing-section"
import { AdvancedSection } from "./sections/advanced-section"
import { ServiceSessionsSection } from "./sections/service-sessions-section"
import { PackageCompositionSection } from "./sections/package-composition-section"
import { BundleConfigurationSection } from "./sections/bundle-configuration-section"
import { StatusVisibilitySection } from "./sections/status-visibility-section"
import { WaitlistSection } from "./sections/waitlist-section"
import { ServiceManageView } from "./service-manage-view"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ServiceEditSplitViewProps {
  serviceId: string
}

// Section configuration
const sections = [
  {
    id: "basic-info",
    title: "Basic Information",
    description: "Service title, description, and category",
    component: BasicInfoSection,
    required: true,
  },
  {
    id: "pricing-duration",
    title: "Pricing & Duration",
    description: "Service pricing, duration, and participant limits",
    component: PricingDurationSection,
    required: true,
  },
  {
    id: "bundle-configuration",
    title: "Bundle Configuration",
    description: "Configure which session service and how many are included",
    component: BundleConfigurationSection,
    required: true,
    conditional: (service: ServiceReadable) => service.service_type_code === 'bundle',
  },
  {
    id: "package-composition",
    title: "Package Contents",
    description: "Select which services are included in this package",
    component: PackageCompositionSection,
    required: true,
    conditional: (service: ServiceReadable) => service.service_type_code === 'package',
  },
  {
    id: "service-sessions",
    title: "Sessions & Schedule",
    description: "Define session dates and times",
    component: ServiceSessionsSection,
    required: true,
    conditional: (service: ServiceReadable) => service.service_type_code === 'workshop' || service.service_type_code === 'course',
  },
  {
    id: "schedule-selection",
    title: "Schedule & Availability",
    description: "Choose which availability schedule to use for this service",
    component: ScheduleSelectionSection,
    required: true,
    conditional: (service: ServiceReadable) => service.service_type_code === 'session',
  },
  {
    id: "location",
    title: "Location & Delivery",
    description: "Where and how the service is delivered",
    component: LocationSection,
    required: true,
  },
  {
    id: "media",
    title: "Images & Media",
    description: "Cover image and gallery",
    component: MediaSection,
    required: false,
  },
  {
    id: "benefits",
    title: "What's Included",
    description: "Benefits and what participants will learn",
    component: BenefitsSection,
    required: false,
  },
  {
    id: "resources",
    title: "Resources",
    description: "Additional materials and downloads",
    component: ResourcesSection,
    required: false,
  },
  // Hidden for now - not needed
  // {
  //   id: "revenue-sharing",
  //   title: "Revenue Sharing",
  //   description: "Configure revenue split with co-practitioners",
  //   component: RevenueSharingSection,
  //   required: false,
  // },
  {
    id: "advanced",
    title: "Advanced Settings",
    description: "Terms, conditions, and additional options",
    component: AdvancedSection,
    required: false,
  },
  {
    id: "waitlist",
    title: "Waitlist",
    description: "Customers waiting for availability",
    component: WaitlistSection,
    required: false,
    conditional: (service: ServiceReadable) =>
      (service.service_type_code === 'workshop' || service.service_type_code === 'course') &&
      parseInt(String(service.waitlist_count || '0')) > 0,
  },
  {
    id: "status-visibility",
    title: "Status & Visibility",
    description: "Control when and how your service appears to customers",
    component: StatusVisibilitySection,
    required: true,
  },
]

// Section ordering priority by service type (lower = appears first)
function getSectionPriority(sectionId: string, serviceTypeCode: string): number {
  const priorities: Record<string, Record<string, number>> = {
    session: {
      "basic-info": 0, "pricing-duration": 1, "schedule-selection": 2, "location": 3,
      "media": 4, "benefits": 5, "resources": 6, "advanced": 7, "status-visibility": 8,
    },
    workshop: {
      "basic-info": 0, "pricing-duration": 1, "service-sessions": 2, "location": 3,
      "media": 4, "benefits": 5, "resources": 6, "advanced": 7, "waitlist": 8, "status-visibility": 9,
    },
    course: {
      "basic-info": 0, "pricing-duration": 1, "service-sessions": 2, "media": 3,
      "benefits": 4, "resources": 5, "location": 6, "advanced": 7, "waitlist": 8, "status-visibility": 9,
    },
    bundle: {
      "basic-info": 0, "bundle-configuration": 1, "pricing-duration": 2, "media": 3,
      "advanced": 4, "status-visibility": 5,
    },
    package: {
      "basic-info": 0, "package-composition": 1, "pricing-duration": 2, "media": 3,
      "advanced": 4, "status-visibility": 5,
    },
  }
  const typePriorities = priorities[serviceTypeCode] || priorities.session
  return typePriorities[sectionId] ?? 99
}

type SectionStatus = "complete" | "incomplete" | "optional"

export function ServiceEditSplitView({ serviceId }: ServiceEditSplitViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State
  const [activeTab, setActiveTab] = useState<"manage" | "settings">("settings")
  const [activeSection, setActiveSection] = useState("basic-info")
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set())
  const [sectionData, setSectionData] = useState<Record<string, any>>({})
  const [sectionStatus, setSectionStatus] = useState<Record<string, SectionStatus>>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // Refs for sections and scroll container
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  
  // Fetch service data
  const { data: service, isLoading, error } = useQuery({
    ...servicesRetrieveOptions({ path: { id: parseInt(serviceId) } }),
  })

  // Update mutation
  const updateMutation = useMutation({
    ...servicesPartialUpdateMutation(),
    onSuccess: async () => {
      toast({
        title: "Service updated",
        description: "Your changes have been saved successfully.",
      })
      // Invalidate and refetch the service data
      await queryClient.invalidateQueries({ queryKey: ['services'] })
      await queryClient.invalidateQueries({ 
        queryKey: ['services', 'detail', parseInt(serviceId)] 
      })
      await queryClient.refetchQueries({
        queryKey: servicesRetrieveOptions({ path: { id: parseInt(serviceId) } }).queryKey
      })
      setUnsavedChanges(new Set())
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update service",
        variant: "destructive",
      })
    },
  })

  // Set initial tab based on service status
  const [initialTabSet, setInitialTabSet] = useState(false)
  useEffect(() => {
    if (service && !initialTabSet) {
      if (service.status !== 'draft') {
        setActiveTab("manage")
      }
      setInitialTabSet(true)
    }
  }, [service, initialTabSet])

  // Initialize section data from service
  useEffect(() => {
    if (service) {
      // Map service data to sections
      setSectionData({
        "basic-info": {
          name: service.name,
          title: service.title,
          description: service.description,
          short_description: service.short_description,
          modality_ids: service.modalities?.map(m => m.id) || [],
          practitioner_category_id: service.practitioner_category?.id,
          tags: service.tags,
        },
        "pricing-duration": {
          price: service.price,
          duration_minutes: service.duration_minutes,
          max_participants: service.max_participants,
          min_participants: service.min_participants,
        },
        "schedule-selection": {
          scheduleId: service.schedule_id || service.schedule?.id?.toString(),
        },
        "bundle-configuration": {
          sessions_included: service.sessions_included,
          child_service_configs: service.child_relationships?.map(rel => ({
            child_service_id: rel.child_service?.id,
            quantity: rel.quantity
          })) || [],
        },
        "package-composition": {
          child_service_configs: service.child_relationships?.map(rel => ({
            child_service_id: rel.child_service?.id,
            quantity: rel.quantity,
            discount_percentage: rel.discount_percentage,
            order: rel.order
          })) || [],
        },
        "service-sessions": {
          sessions: service.sessions || [],
        },
        "revenue-sharing": {
          additionalPractitioners: service.additional_practitioners || [],
        },
        "location": {
          location_type: service.location_type,
          practitioner_location_id: service.practitioner_location?.id,
        },
        "media": {
          image: service.image_url || service.image,
        },
        "benefits": {
          what_youll_learn: service.what_youll_learn,
          prerequisites: service.prerequisites,
          includes: service.includes,
          benefits: service.benefits || [],
          agenda_items: service.agenda_items || [],
        },
        "resources": {
          // resources: service.resources,
        },
        "advanced": {
          terms_conditions: service.terms_conditions,
          experience_level: service.experience_level,
          age_min: service.age_min,
          age_max: service.age_max,
        },
        "status-visibility": {
          status: service.status,
          is_featured: service.is_featured,
          is_active: service.is_active,
          is_public: service.is_public,
        },
      })

      // Calculate section completion status
      const newStatus: Record<string, SectionStatus> = {}
      const currentSectionData = {
        "basic-info": {
          name: service.name,
          title: service.title,
          description: service.description,
          short_description: service.short_description,
          modality_ids: service.modalities?.map(m => m.id) || [],
          practitioner_category_id: service.practitioner_category?.id,
          tags: service.tags,
        },
        "pricing-duration": {
          price: service.price,
          duration_minutes: service.duration_minutes,
          max_participants: service.max_participants,
          min_participants: service.min_participants,
        },
        "schedule-selection": {
          scheduleId: service.schedule_id || service.schedule?.id?.toString(),
        },
        "bundle-configuration": {
          sessions_included: service.sessions_included,
          child_service_configs: service.child_relationships?.map(rel => ({
            child_service_id: rel.child_service?.id,
            quantity: rel.quantity
          })) || [],
        },
        "package-composition": {
          child_service_configs: service.child_relationships?.map(rel => ({
            child_service_id: rel.child_service?.id,
            quantity: rel.quantity,
            discount_percentage: rel.discount_percentage,
            order: rel.order
          })) || [],
        },
        "service-sessions": {
          sessions: service.sessions || [],
        },
        "revenue-sharing": {
          additionalPractitioners: service.additional_practitioners || [],
        },
        "location": {
          location_type: service.location_type,
          practitioner_location_id: service.practitioner_location?.id,
        },
        "media": {
          image: service.image_url || service.image,
        },
        "benefits": {
          what_youll_learn: service.what_youll_learn,
          prerequisites: service.prerequisites,
          includes: service.includes,
          benefits: service.benefits || [],
          agenda_items: service.agenda_items || [],
        },
        "resources": {
          // resources: service.resources,
        },
        "advanced": {
          terms_conditions: service.terms_conditions,
          experience_level: service.experience_level,
          age_min: service.age_min,
          age_max: service.age_max,
        },
        "status-visibility": {
          status: service.status,
          is_featured: service.is_featured,
          is_active: service.is_active,
          is_public: service.is_public,
        },
      }
      
      sections.forEach(section => {
        if (!section.conditional || section.conditional(service)) {
          const data = currentSectionData[section.id] || {}
          const isComplete = checkSectionCompletion(section.id, data, service)
          newStatus[section.id] = isComplete ? "complete" : 
                                  section.required ? "incomplete" : "optional"
        }
      })
      setSectionStatus(newStatus)
    }
  }, [service])

  // Check if a section is complete
  const checkSectionCompletion = (sectionId: string, data: any, service: ServiceReadable): boolean => {
    switch (sectionId) {
      case "basic-info":
        return !!(data.name && data.description)
      case "pricing-duration":
        return !!(data.price && data.duration_minutes)
      case "schedule-selection":
        return !!data.scheduleId
      case "bundle-configuration":
        return !!(data.sessions_included && data.child_service_configs?.length)
      case "package-composition":
        return !!data.child_service_configs?.length
      case "service-sessions":
        return !!data.sessions?.length
      case "location":
        return !!data.location_type
      case "status-visibility":
        return !!data.status
      default:
        return true
    }
  }

  // Handle section data changes
  const handleSectionChange = (sectionId: string, data: any) => {
    setSectionData(prev => ({ ...prev, [sectionId]: data }))
    setUnsavedChanges(prev => new Set(prev).add(sectionId))
    
    // Update section status
    if (service) {
      const isComplete = checkSectionCompletion(sectionId, data, service)
      const section = sections.find(s => s.id === sectionId)
      setSectionStatus(prev => ({
        ...prev,
        [sectionId]: isComplete ? "complete" : 
                     section?.required ? "incomplete" : "optional"
      }))
    }
  }

  // Save specific section
  const handleSaveSection = useCallback(async (sectionId: string) => {
    let updates = { ...sectionData[sectionId] }

    // Map scheduleId to schedule field for API
    if (sectionId === 'schedule-selection' && updates.scheduleId) {
      updates = {
        schedule: parseInt(updates.scheduleId)
      }
      delete updates.scheduleId
    }

    // Map practitioner_location_id to practitioner_location field for API
    if (sectionId === 'location' && updates.practitioner_location_id) {
      updates.practitioner_location = parseInt(updates.practitioner_location_id)
      delete updates.practitioner_location_id
    }

    // Simply send the update
    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
    
    setUnsavedChanges(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
    })
  }, [sectionData, updateMutation, serviceId])

  // Save all changes
  const handleSaveAll = async () => {
    const updates: Partial<ServiceCreateUpdateRequestWritable> = {}
    let hasFile = false

    // Merge all changed sections
    unsavedChanges.forEach(sectionId => {
      const sectionUpdates = { ...sectionData[sectionId] }

      // Map scheduleId to schedule field for API
      if (sectionId === 'schedule-selection' && sectionUpdates.scheduleId) {
        sectionUpdates.schedule = parseInt(sectionUpdates.scheduleId)
        delete sectionUpdates.scheduleId
      }

      // Map practitioner_location_id to practitioner_location field for API
      if (sectionId === 'location' && sectionUpdates.practitioner_location_id) {
        sectionUpdates.practitioner_location = parseInt(sectionUpdates.practitioner_location_id)
        delete sectionUpdates.practitioner_location_id
      }

      // Ensure includes is always an array or null (never a string)
      if ('includes' in sectionUpdates) {
        if (typeof sectionUpdates.includes === 'string') {
          // Convert string to array
          sectionUpdates.includes = sectionUpdates.includes.split('\n').filter((item: string) => item.trim())
        }
        if (Array.isArray(sectionUpdates.includes) && sectionUpdates.includes.length === 0) {
          sectionUpdates.includes = null
        }
      }

      // Check for files
      Object.values(sectionUpdates).forEach(value => {
        if (value instanceof File) {
          hasFile = true
        }
      })

      Object.assign(updates, sectionUpdates)
    })

    // Let the API client handle the request format
    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
  }

  // Publish service (draft -> active)
  const handlePublish = async () => {
    // Save any pending changes first, then set status to active
    const updates: any = {}
    unsavedChanges.forEach(sectionId => {
      const sectionUpdates = { ...sectionData[sectionId] }
      if (sectionId === 'schedule-selection' && sectionUpdates.scheduleId) {
        sectionUpdates.schedule = parseInt(sectionUpdates.scheduleId)
        delete sectionUpdates.scheduleId
      }
      if (sectionId === 'location' && sectionUpdates.practitioner_location_id) {
        sectionUpdates.practitioner_location = parseInt(sectionUpdates.practitioner_location_id)
        delete sectionUpdates.practitioner_location_id
      }
      Object.assign(updates, sectionUpdates)
    })

    updates.status = 'active'
    updates.is_active = true
    updates.is_public = true

    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
    setUnsavedChanges(new Set())
  }

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = sectionRefs.current[sectionId]
    const container = scrollContainerRef.current
    
    if (element && container) {
      const elementTop = element.offsetTop
      const containerTop = container.offsetTop
      const scrollPosition = elementTop - containerTop - 20 // 20px offset from top
      
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      })
    }
    setMobileOpen(false)
  }

  const serviceTypeCode = service?.service_type_code || 'session'
  const visibleSections = sections
    .filter(section => !section.conditional || (service && section.conditional(service)))
    .sort((a, b) => getSectionPriority(a.id, serviceTypeCode) - getSectionPriority(b.id, serviceTypeCode))
  
  // Handle scroll spy
  useEffect(() => {
    if (!service || !scrollContainerRef.current) return
    
    const scrollContainer = scrollContainerRef.current
    
    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      const containerTop = scrollContainer.getBoundingClientRect().top

      for (const section of visibleSections) {
        const element = sectionRefs.current[section.id]
        if (element) {
          const rect = element.getBoundingClientRect()
          const elementTop = rect.top - containerTop
          const elementBottom = elementTop + rect.height
          
          // Check if the section is in the viewport (with some offset for better UX)
          if (elementTop <= 150 && elementBottom > 150) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    // Initial check
    handleScroll()
    
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [service, visibleSections])

  // Get section icon based on status
  const getSectionIcon = (status: SectionStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "incomplete":
        return <AlertCircle className="h-4 w-4 text-amber-600" />
      case "optional":
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load service</p>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    )
  }
  
  // Calculate overall progress
  const totalSections = visibleSections.filter(s => s.required).length
  const completedSections = visibleSections.filter(
    s => s.required && sectionStatus[s.id] === "complete"
  ).length
  const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

  // Sidebar content - Compact to fit viewport
  const SidebarContent = () => {
    // Calculate dynamic spacing based on number of sections
    const sectionCount = visibleSections.length
    const isCompact = sectionCount > 8
    
    // Separate required and optional sections
    const requiredSections = visibleSections.filter(s => s.required)
    const optionalSections = visibleSections.filter(s => !s.required)
    const showDivider = requiredSections.length > 0 && optionalSections.length > 0
    
    const renderSection = (section: typeof sections[0], index: number) => {
      const status = sectionStatus[section.id] || "optional"
      const hasChanges = unsavedChanges.has(section.id)
      const isActive = activeSection === section.id

      return (
        <button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          className={cn(
            "w-full text-left px-2 rounded-lg transition-all duration-200 group relative flex-shrink-0",
            isCompact ? "py-1.5" : "py-2",
            isActive
              ? "bg-sage-100 shadow-sm"
              : "hover:bg-cream-50/50"
          )}
        >
              <div className="flex items-center gap-2">
                {/* Status Icon */}
                <div className={cn(
                  "flex-shrink-0 transition-all duration-200",
                  isActive && "scale-110"
                )}>
                  {status === "complete" ? (
                    <CheckCircle2 className={cn(
                      "text-green-600",
                      isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                  ) : status === "incomplete" ? (
                    <AlertCircle className={cn(
                      "text-amber-600",
                      isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                  ) : (
                    <Circle className={cn(
                      "text-muted-foreground",
                      isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn(
                      "font-medium leading-tight transition-colors truncate",
                      isCompact ? "text-xs" : "text-sm",
                      isActive ? "text-sage-800" : "text-foreground"
                    )}>
                      {section.title}
                    </h4>
                    {hasChanges && (
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  {!isCompact && (
                    <p className={cn(
                      "text-xs text-muted-foreground truncate mt-0.5",
                      isActive ? "opacity-80" : "opacity-60"
                    )}>
                      {section.description}
                    </p>
                  )}
                </div>
                
                {/* Required badge - only show if not compact */}
                {!isCompact && section.required && (
                  <Badge 
                    variant="outline" 
                    className="text-xs px-1 py-0 h-4"
                  >
                    Req
                  </Badge>
                )}
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <>
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-sage-600 rounded-r" />
                  <div className="absolute inset-0 ring-1 ring-sage-200 rounded-lg" />
                </>
              )}
            </button>
      )
    }
    
    // Separate required and optional config sections
    const configRequired = visibleSections.filter(s => s.required)
    const configOptional = visibleSections.filter(s => !s.required)
    const showConfigDivider = configRequired.length > 0 && configOptional.length > 0

    return (
          <div className={cn(
            "flex flex-col h-full",
            isCompact ? "space-y-0.5" : "space-y-1"
          )}>
            {/* Required config sections */}
            {configRequired.map((section, index) => renderSection(section, index))}

            {/* Divider between required and optional */}
            {showConfigDivider && (
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Optional</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}

            {/* Optional sections */}
            {configOptional.map((section, index) => renderSection(section, index + configRequired.length))}
      </div>
    )
  }

  const isDraft = service.status === 'draft'

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* Sticky header — shared across both tabs */}
        <div className="flex-shrink-0 border-b bg-background">
          <div className="px-6 pt-4 pb-0 max-w-6xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="-ml-2 mb-3 text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Back
            </Button>

            {/* Service name + badges */}
            <h1 className="font-serif text-2xl font-light text-olive-900 mb-2">{service.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                {service.status}
              </Badge>
              <Badge variant="outline">
                {service.service_type_display || service.service_type_code}
              </Badge>
              {service.is_featured && (
                <Badge variant="default" className="bg-amber-100 text-amber-800">
                  Featured
                </Badge>
              )}
            </div>

            {/* Context strip — type-specific meta pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {service.average_rating && parseFloat(String(service.average_rating)) > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5 text-xs font-light text-olive-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {parseFloat(String(service.average_rating)).toFixed(1)}
                  {service.total_reviews && parseInt(String(service.total_reviews)) > 0 && (
                    <span className="text-muted-foreground">({service.total_reviews} review{parseInt(String(service.total_reviews)) !== 1 ? 's' : ''})</span>
                  )}
                </span>
              )}
              {service.total_bookings && parseInt(String(service.total_bookings)) > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5 text-xs font-light text-olive-600">
                  <Users className="h-3 w-3" />
                  {service.total_bookings} booking{parseInt(String(service.total_bookings)) !== 1 ? 's' : ''}
                </span>
              )}
              {service.next_session_date && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-sage-200/60 rounded-full px-3.5 py-1.5 text-xs font-light text-olive-600">
                  <Calendar className="h-3 w-3" />
                  Next: {format(new Date(String(service.next_session_date)), "MMM d, yyyy")}
                </span>
              )}
              {service.has_ended && (
                <span className="inline-flex items-center gap-1.5 bg-terracotta-50 border border-terracotta-200 rounded-full px-3.5 py-1.5 text-xs font-light text-terracotta-700">
                  <AlertTriangle className="h-3 w-3" />
                  Service has ended
                </span>
              )}
            </div>

            {/* Tab bar — only for non-draft services */}
            {!isDraft && (
              <div className="mt-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manage" | "settings")}>
                  <TabsList className="bg-transparent p-0 h-auto gap-0">
                    <TabsTrigger
                      value="manage"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
                    >
                      Manage
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
                    >
                      Settings
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Spacing when no tabs (draft) */}
            {isDraft && <div className="h-4" />}
          </div>
        </div>

        {/* Manage tab content */}
        {activeTab === "manage" && !isDraft && (
          <div className="flex-1 overflow-auto">
            <ServiceManageView
              service={service}
              onNavigateToSettings={(sectionId) => {
                setActiveTab("settings")
                if (sectionId) {
                  // Small delay to let settings tab render before scrolling
                  setTimeout(() => scrollToSection(sectionId), 100)
                }
              }}
            />
          </div>
        )}

        {/* Settings tab — hidden (not unmounted) to preserve scroll + form state */}
        <div className={cn("flex-1 overflow-hidden", activeTab !== "settings" && "hidden")}>
          <div className="flex h-full overflow-hidden">

            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 right-4 z-50">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-6">
                    <h2 className="font-semibold mb-4">Sections</h2>
                    <SidebarContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-72 bg-cream-50/50 border-r">
              <div className="flex flex-col w-full h-full">
                {/* Sidebar Header - Progress + Save */}
                <div className="flex-shrink-0 bg-background border-b p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
                          <Progress value={progressPercentage} className="h-1.5 w-20" />
                          <span className="text-xs font-medium text-sage-700">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            {completedSections}/{totalSections}
                          </span>
                        </div>
                      </div>
                    </div>

                    {unsavedChanges.size > 0 && (
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={handleSaveAll}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save All ({unsavedChanges.size})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sidebar Navigation */}
                <div className="flex-1 p-3 bg-gradient-to-b from-transparent to-muted/20">
                  <div className="h-full flex flex-col">
                    <SidebarContent />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content — scrollable sections */}
            <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
              <div className="max-w-4xl mx-auto p-6 pb-20">

                {/* Service Ended Banner */}
                {service.status === 'active' && service.has_ended && (
                  <Card className="mb-8 border-2 border-terracotta-200 bg-terracotta-50">
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100">
                            <AlertTriangle className="h-5 w-5 text-terracotta-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-terracotta-900">This service has ended</h3>
                            <p className="text-sm text-terracotta-700">
                              All scheduled sessions are in the past. Add new dates or archive this service.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-terracotta-300 text-terracotta-700 hover:bg-terracotta-100"
                            onClick={() => scrollToSection('service-sessions')}
                          >
                            <CalendarPlus className="h-4 w-4 mr-1.5" />
                            Add New Dates
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-terracotta-300 text-terracotta-700 hover:bg-terracotta-100"
                            onClick={async () => {
                              await updateMutation.mutateAsync({
                                path: { id: parseInt(serviceId) },
                                body: { status: 'archived', is_active: false, is_public: false },
                              })
                            }}
                            disabled={updateMutation.isPending}
                          >
                            <Archive className="h-4 w-4 mr-1.5" />
                            Archive
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Publish Banner - only shown for draft services */}
                {service.status === 'draft' && (
                  <Card className={cn(
                    "mb-8 border-2",
                    progressPercentage === 100
                      ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                      : "border-sage-200 bg-gradient-to-r from-sage-50 to-cream-50"
                  )}>
                    <CardContent className="py-5">
                      {progressPercentage === 100 ? (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                              <Rocket className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-green-900">Ready to go live!</h3>
                              <p className="text-sm text-green-700">
                                All required sections are complete. Publish to make this service visible and bookable.
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={handlePublish}
                            disabled={updateMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 shrink-0"
                            size="lg"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Rocket className="h-4 w-4 mr-2" />
                            )}
                            Publish Service
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100">
                              <AlertCircle className="h-5 w-5 text-sage-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-olive-900">Almost there!</h3>
                              <p className="text-sm text-muted-foreground">
                                Complete {totalSections - completedSections} more required {totalSections - completedSections === 1 ? 'section' : 'sections'} to publish this service.
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              const firstIncomplete = visibleSections.find(
                                s => s.required && sectionStatus[s.id] !== "complete"
                              )
                              if (firstIncomplete) scrollToSection(firstIncomplete.id)
                            }}
                          >
                            Continue Setup
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Sections */}
                <div className="space-y-8">
                  {visibleSections.map((section) => {
                    const SectionComponent = section.component
                    const hasChanges = unsavedChanges.has(section.id)
                    const isActive = activeSection === section.id

                    return (
                      <div
                        key={section.id}
                        ref={(el) => { sectionRefs.current[section.id] = el }}
                        className="scroll-mt-24"
                      >
                        <Card className={cn(
                          "transition-all duration-300",
                          isActive ? "ring-2 ring-sage-300/50 shadow-lg" : "hover:shadow-md"
                        )}>
                          <CardHeader className={cn(
                            "transition-colors duration-300",
                            isActive && "bg-sage-50/50"
                          )}>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <span className={cn(
                                    "transition-colors duration-300",
                                    isActive && "text-sage-800"
                                  )}>
                                    {section.title}
                                  </span>
                                  {section.required && (
                                    <Badge variant="outline" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>{section.description}</CardDescription>
                              </div>
                              {hasChanges && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSection(section.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {section.id === 'media' ? (
                              <MediaSection service={service} />
                            ) : section.id === 'resources' ? (
                              <ResourcesSection service={service} />
                            ) : (
                              <SectionComponent
                                service={service}
                                data={sectionData[section.id] || {}}
                                onChange={(data) => handleSectionChange(section.id, data)}
                                onSave={() => handleSaveSection(section.id)}
                                hasChanges={hasChanges}
                                isSaving={updateMutation.isPending}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  )
}