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
    onSuccess: () => {
      toast({
        title: "Service updated",
        description: "Your changes have been saved successfully.",
      })
      queryClient.invalidateQueries({ queryKey: ['services', serviceId] })
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
          image: service.image,
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
      sections.forEach(section => {
        if (!section.conditional || section.conditional(service)) {
          const data = sectionData[section.id] || {}
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
    
    // Merge all changed sections
    unsavedChanges.forEach(sectionId => {
      const sectionUpdates = { ...sectionData[sectionId] }
      
      // Map scheduleId to schedule field for API
      if (sectionId === 'schedule-selection' && sectionUpdates.scheduleId) {
        sectionUpdates.schedule = parseInt(sectionUpdates.scheduleId)
        delete sectionUpdates.scheduleId
      }
      
      Object.assign(updates, sectionUpdates)
    })

    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
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

  // Sidebar content
  const SidebarContent = () => (
    <div className="space-y-1">
      {visibleSections.map((section, index) => {
        const status = sectionStatus[section.id] || "optional"
        const hasChanges = unsavedChanges.has(section.id)
        const isActive = activeSection === section.id

        return (
          <div key={section.id} className="relative">
            {/* Connection line between sections */}
            {index < visibleSections.length - 1 && (
              <div className="absolute left-7 top-12 bottom-0 w-px bg-border/50" />
            )}
            
            <button
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 shadow-sm scale-[1.02]" 
                  : "hover:bg-muted/80 hover:shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : status === "complete" 
                      ? "bg-green-100 text-green-700"
                      : status === "incomplete"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                )}>
                  {status === "complete" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "incomplete" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-medium text-sm leading-tight transition-all duration-200",
                        isActive ? "text-primary" : "text-foreground"
                      )}>
                        {section.title}
                      </h4>
                      <p className={cn(
                        "text-xs text-muted-foreground mt-0.5 transition-all duration-200",
                        isActive ? "opacity-100" : "opacity-60"
                      )}>
                        {section.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1 items-end">
                      {section.required && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            isActive && "border-primary/50"
                          )}
                        >
                          Required
                        </Badge>
                      )}
                      {hasChanges && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-[10px] text-amber-600 font-medium">Modified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 ring-2 ring-primary/20 rounded-xl" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )

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
        <div className="hidden lg:flex w-80 bg-muted/30 border-r">
          <div className="flex flex-col w-full h-screen">
            {/* Sidebar Header - Fixed */}
            <div className="flex-shrink-0 bg-background border-b">
              <div className="p-6 space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="-ml-2 hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </Button>
                
                <div>
                  <h2 className="font-semibold text-lg">Service Configuration</h2>
                  <p className="text-sm text-muted-foreground truncate mt-1">{service.name}</p>
                </div>
                
                {/* Progress Card */}
                <div className="bg-primary/5 rounded-lg p-4 space-y-3 border border-primary/10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2 bg-primary/10" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-xs font-medium">{Object.values(sectionStatus).filter(s => s === "complete").length}</p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <p className="text-xs font-medium">{Object.values(sectionStatus).filter(s => s === "incomplete").length}</p>
                      <p className="text-xs text-muted-foreground">Required</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center">
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs font-medium">{Object.values(sectionStatus).filter(s => s === "optional").length}</p>
                      <p className="text-xs text-muted-foreground">Optional</p>
                    </div>
                  </div>
                </div>
                
                {unsavedChanges.size > 0 && (
                  <Button
                    className="w-full shadow-sm"
                    onClick={handleSaveAll}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save All Changes ({unsavedChanges.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar Navigation - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-3">
                  Configuration Sections
                </p>
                <SidebarContent />
              </div>
            </div>
            
            {/* Quick Actions - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t bg-background">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
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