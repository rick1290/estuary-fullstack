"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  Sparkles
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

interface ServiceEditAccordionProps {
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

export function ServiceEditAccordion({ serviceId }: ServiceEditAccordionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State
  const [openSections, setOpenSections] = useState<string[]>(["basic-info"])
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set())
  const [sectionData, setSectionData] = useState<Record<string, any>>({})
  const [sectionStatus, setSectionStatus] = useState<Record<string, SectionStatus>>({})
  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState(true)
  const [showHelp, setShowHelp] = useState(true)

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
          // gallery: service.gallery_images,
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
      
      // Auto-collapse completed sections if enabled
      if (autoCollapseEnabled && isComplete && openSections.includes(sectionId)) {
        // Find next incomplete section
        const currentVisibleSections = sections.filter(section => 
          !section.conditional || section.conditional(service)
        )
        const currentIndex = currentVisibleSections.findIndex(s => s.id === sectionId)
        const nextSection = currentVisibleSections.slice(currentIndex + 1).find(
          s => sectionStatus[s.id] !== "complete"
        )
        
        if (nextSection) {
          setOpenSections([nextSection.id])
        }
      }
    }
  }
  
  // Get visible sections for keyboard navigation
  const getVisibleSections = useCallback(() => {
    if (!service) return []
    return sections.filter(section => 
      !section.conditional || section.conditional(service)
    )
  }, [service])
  
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

    // For bundle configuration, ensure child_service_configs is properly formatted as array
    if (sectionId === 'bundle-configuration' && updates.child_service_configs) {
      // Ensure it's an array
      if (!Array.isArray(updates.child_service_configs)) {
        updates.child_service_configs = [updates.child_service_configs]
      }
      console.log('Saving bundle with child_service_configs:', updates.child_service_configs)
    }

    // Debug logging for package and bundle sections
    if (sectionId === 'package-composition' || sectionId === 'bundle-configuration') {
      console.log(`Saving ${sectionId}:`, updates)
    }

    // For package, bundle, and service sessions, the data is already properly formatted
    // No special handling needed

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
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!service) return
      
      const currentVisibleSections = getVisibleSections()
      const currentSection = openSections[0]
      const currentIndex = currentVisibleSections.findIndex(s => s.id === currentSection)
      
      if (e.key === "ArrowDown" && e.ctrlKey) {
        e.preventDefault()
        const nextSection = currentVisibleSections[currentIndex + 1]
        if (nextSection) {
          setOpenSections([nextSection.id])
        }
      } else if (e.key === "ArrowUp" && e.ctrlKey) {
        e.preventDefault()
        const prevSection = currentVisibleSections[currentIndex - 1]
        if (prevSection) {
          setOpenSections([prevSection.id])
        }
      } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (unsavedChanges.has(currentSection)) {
          handleSaveSection(currentSection)
        }
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openSections, getVisibleSections, unsavedChanges, service, handleSaveSection])

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
      
      // Handle package composition - child_service_configs is already in correct format
      if (sectionId === 'package-composition') {
        // child_service_configs is already properly formatted from the section
      }
      
      // Handle bundle configuration
      if (sectionId === 'bundle-configuration') {
        // sessions_included and child_service_configs are already properly formatted
      }
      
      // Handle service sessions
      if (sectionId === 'service-sessions') {
        // sessions array is already properly formatted
      }
      
      Object.assign(updates, sectionUpdates)
    })

    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
  }


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

  const visibleSections = sections.filter(section => 
    !section.conditional || section.conditional(service)
  )
  
  // Calculate overall progress
  const totalSections = visibleSections.filter(s => s.required).length
  const completedSections = visibleSections.filter(
    s => s.required && sectionStatus[s.id] === "complete"
  ).length
  const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Sticky Progress Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-7xl py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="h-8 w-px bg-border" />
                <div>
                  <h2 className="font-semibold">{service.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{Math.round(progressPercentage)}% Complete</span>
                    <span>{completedSections} of {totalSections} required sections</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {unsavedChanges.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSaveAll}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save All ({unsavedChanges.size})
                  </Button>
                )}
                
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAutoCollapseEnabled(!autoCollapseEnabled)}
                        className={cn(autoCollapseEnabled && "text-primary")}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{autoCollapseEnabled ? "Auto-collapse enabled" : "Auto-collapse disabled"}</p>
                      <p className="text-xs text-muted-foreground">Automatically move to next section when complete</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHelp(!showHelp)}
                        className={cn(showHelp && "text-primary")}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle help tooltips</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-1 mt-2" />
          </div>
        </div>
        
        <div className="container max-w-7xl py-6 space-y-6">
          {/* Main Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
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

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon">
                <Archive className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Help Card */}
          {showHelp && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <kbd className="px-2 py-1 text-xs bg-background rounded border">Ctrl+↑/↓</kbd>
                  <span>Navigate between sections</span>
                </div>
                <div className="flex items-start gap-2">
                  <kbd className="px-2 py-1 text-xs bg-background rounded border">Ctrl+S</kbd>
                  <span>Save current section</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Complete all required sections to publish your service</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Section Overview</CardTitle>
              <CardDescription>
                Your service is {Math.round(progressPercentage)}% ready to publish
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {Object.values(sectionStatus).filter(s => s === "complete").length} Complete
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>
                      {Object.values(sectionStatus).filter(s => s === "incomplete").length} Incomplete
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {Object.values(sectionStatus).filter(s => s === "optional").length} Optional
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accordion Sections */}
          <Accordion 
            type="multiple" 
            value={openSections}
            onValueChange={setOpenSections}
            className="space-y-4"
          >
            {visibleSections.map((section, index) => {
              const SectionComponent = section.component
              const status = sectionStatus[section.id] || "optional"
              const hasChanges = unsavedChanges.has(section.id)

              return (
                <AccordionItem 
                  key={section.id} 
                  value={section.id}
                  className={cn(
                    "border rounded-lg transition-colors",
                    status === "complete" && "border-green-200 bg-green-50/50",
                    status === "incomplete" && section.required && "border-amber-200"
                  )}
                >
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {getSectionIcon(status)}
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-2">
                            {section.title}
                            {section.required && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {hasChanges && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Unsaved
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {section.description}
                          </div>
                        </div>
                      </div>
                      {showHelp && index === 0 && openSections.length === 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground ml-4">
                              Click to expand
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Start here to build your service</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pt-6">
                    <SectionComponent
                      service={service}
                      data={sectionData[section.id] || {}}
                      onChange={(data) => handleSectionChange(section.id, data)}
                      onSave={() => handleSaveSection(section.id)}
                      hasChanges={hasChanges}
                      isSaving={updateMutation.isPending}
                    />
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </div>
    </TooltipProvider>
  )
}