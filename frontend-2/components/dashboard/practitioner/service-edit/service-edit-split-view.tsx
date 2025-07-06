"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  servicesRetrieveOptions,
  servicesUpdateMutation,
  servicesPartialUpdateMutation
} from "@/src/client/@tanstack/react-query.gen"
import type { ServiceReadable, ServiceCreateUpdateRequestWritable } from "@/src/client/types.gen"
import { useToast } from "@/hooks/use-toast"
import { patchWithFormData } from "@/lib/api-helpers"
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
  X
} from "lucide-react"
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
  {
    id: "revenue-sharing",
    title: "Revenue Sharing",
    description: "Configure revenue split with co-practitioners",
    component: RevenueSharingSection,
    required: false,
  },
  {
    id: "advanced",
    title: "Advanced Settings",
    description: "Terms, conditions, and additional options",
    component: AdvancedSection,
    required: false,
  },
  {
    id: "status-visibility",
    title: "Status & Visibility",
    description: "Control when and how your service appears to customers",
    component: StatusVisibilitySection,
    required: true,
  },
]

type SectionStatus = "complete" | "incomplete" | "optional"

export function ServiceEditSplitView({ serviceId }: ServiceEditSplitViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State
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
          category_id: service.category?.id,
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
          address_id: service.address?.id,
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
          category_id: service.category?.id,
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
          address_id: service.address?.id,
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
    
    // Check if we have a file to upload (only for media section)
    const hasFile = sectionId === 'media' && updates.image instanceof File
    
    console.log('Section updates:', sectionId, updates)
    console.log('Has file:', hasFile, updates.image)
    
    if (hasFile) {
      // For file uploads, we need to pass the raw updates object with the File
      // The generated client should handle FormData serialization
      console.log('Uploading image file:', updates.image)
      
      await updateMutation.mutateAsync({
        path: { id: parseInt(serviceId) },
        body: updates,
      })
    } else {
      // Regular JSON request
      await updateMutation.mutateAsync({
        path: { id: parseInt(serviceId) },
        body: updates,
      })
    }
    
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
      
      // Check for files
      Object.values(sectionUpdates).forEach(value => {
        if (value instanceof File) {
          hasFile = true
        }
      })
      
      Object.assign(updates, sectionUpdates)
    })

    if (hasFile) {
      // Create FormData for file upload
      const formData = new FormData()
      
      // Add all fields to FormData
      Object.entries(updates).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value)
        } else if (Array.isArray(value)) {
          // Handle arrays by appending each item
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              formData.append(`${key}[${index}]`, JSON.stringify(item))
            } else {
              formData.append(`${key}[${index}]`, String(item))
            }
          })
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects by stringifying
          formData.append(key, JSON.stringify(value))
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value))
        }
      })
      
      await updateMutation.mutateAsync({
        path: { id: parseInt(serviceId) },
        body: formData,
      })
    } else {
      // Regular JSON request
      await updateMutation.mutateAsync({
        path: { id: parseInt(serviceId) },
        body: updates,
      })
    }
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

  const visibleSections = sections.filter(section => 
    !section.conditional || (service && section.conditional(service))
  )
  
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
              ? "bg-primary/10 shadow-sm" 
              : "hover:bg-muted/60"
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
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {section.title}
                    </h4>
                    {hasChanges && (
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  {!isCompact && (
                    <p className={cn(
                      "text-[10px] text-muted-foreground truncate mt-0.5",
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
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    Req
                  </Badge>
                )}
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <>
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />
                  <div className="absolute inset-0 ring-1 ring-primary/20 rounded-lg" />
                </>
              )}
            </button>
      )
    }
    
    return (
          <div className={cn(
            "flex flex-col h-full",
            isCompact ? "space-y-0.5" : "space-y-1"
          )}>
            {/* Required sections */}
            {requiredSections.map((section, index) => renderSection(section, index))}
            
            {/* Divider between required and optional */}
            {showDivider && (
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}
            
            {/* Optional sections */}
            {optionalSections.map((section, index) => renderSection(section, index + requiredSections.length))}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
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
        <div className="hidden lg:flex w-72 bg-muted/30 border-r">
          <div className="flex flex-col w-full h-screen">
            {/* Sidebar Header - Compact */}
            <div className="flex-shrink-0 bg-background border-b p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="-ml-2 mb-3 text-xs"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Back
              </Button>
              
              <div className="space-y-3">
                <div>
                  <h2 className="font-semibold text-sm truncate pr-2">{service.name}</h2>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <Progress value={progressPercentage} className="h-1.5 w-20" />
                      <span className="text-xs font-medium text-primary">{Math.round(progressPercentage)}%</span>
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

            {/* Sidebar Navigation - No scroll needed */}
            <div className="flex-1 p-3 bg-gradient-to-b from-transparent to-muted/20">
              <div className="h-full flex flex-col">
                <SidebarContent />
              </div>
            </div>
            
            {/* Bottom Actions */}
            <div className="flex-shrink-0 p-3 pt-2 border-t bg-background/80">
              <div className="flex gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Preview Service</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Duplicate Service</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs">
                        <Archive className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Archive Service</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
          {/* Sticky Header for Mobile */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b lg:hidden">
            <div className="px-4 py-3 ml-16">
              <h1 className="font-semibold">{service.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{Math.round(progressPercentage)}% Complete</span>
                {unsavedChanges.size > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveAll}
                    disabled={updateMutation.isPending}
                  >
                    Save ({unsavedChanges.size})
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-6 pb-20">
            {/* Service Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{service.name}</h1>
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
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {visibleSections.map((section) => {
                const SectionComponent = section.component
                const hasChanges = unsavedChanges.has(section.id)

                const isActive = activeSection === section.id
                
                return (
                  <div
                    key={section.id}
                    ref={(el) => sectionRefs.current[section.id] = el}
                    className="scroll-mt-24"
                  >
                    <Card className={cn(
                      "transition-all duration-300",
                      isActive ? "ring-2 ring-primary/30 shadow-lg" : "hover:shadow-md"
                    )}>
                      <CardHeader className={cn(
                        "transition-colors duration-300",
                        isActive && "bg-primary/5"
                      )}>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <span className={cn(
                                "transition-colors duration-300",
                                isActive && "text-primary"
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
                        <SectionComponent
                          service={service}
                          data={sectionData[section.id] || {}}
                          onChange={(data) => handleSectionChange(section.id, data)}
                          onSave={() => handleSaveSection(section.id)}
                          hasChanges={hasChanges}
                          isSaving={updateMutation.isPending}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}