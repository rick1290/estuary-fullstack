"use client"

import { useState, useEffect } from "react"
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
import { 
  CheckCircle2, 
  AlertCircle, 
  Circle,
  Save,
  Eye,
  Archive,
  Copy,
  ChevronLeft,
  Loader2
} from "lucide-react"

// Import section components
import { BasicInfoSection } from "./sections/basic-info-section"
import { PricingDurationSection } from "./sections/pricing-duration-section"
import { ScheduleAvailabilitySection } from "./sections/schedule-availability-section"
import { ScheduleSelectionSection } from "./sections/schedule-selection-section"
import { LocationSection } from "./sections/location-section"
import { MediaSection } from "./sections/media-section"
import { BenefitsSection } from "./sections/benefits-section"
import { ResourcesSection } from "./sections/resources-section"
import { RevenueSharingSection } from "./sections/revenue-sharing-section"
import { AdvancedSection } from "./sections/advanced-section"

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
    id: "schedule-selection",
    title: "Schedule Selection",
    description: "Choose which availability schedule to use",
    component: ScheduleSelectionSection,
    required: true,
    conditional: (service: ServiceReadable) => service.service_type_info?.type_code === 'session',
  },
  {
    id: "schedule-availability",
    title: "Schedule & Availability",
    description: "When your service is available",
    component: ScheduleAvailabilitySection,
    required: true,
    conditional: (service: ServiceReadable) => service.service_type_info?.type_code !== 'session',
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
          scheduleId: service.schedule_id,
        },
        "schedule-availability": {
          // This would be populated from availability data
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
        },
        "resources": {
          // resources: service.resources,
        },
        "advanced": {
          terms_conditions: service.terms_conditions,
          experience_level: service.experience_level,
          age_min: service.age_min,
          age_max: service.age_max,
          is_featured: service.is_featured,
          status: service.status,
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
      case "schedule-availability":
        return true // Check availability data
      case "location":
        return !!data.location_type
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

  // Save all changes
  const handleSaveAll = async () => {
    const updates: Partial<ServiceCreateUpdateRequestWritable> = {}
    
    // Merge all changed sections
    unsavedChanges.forEach(sectionId => {
      Object.assign(updates, sectionData[sectionId])
    })

    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
  }

  // Save specific section
  const handleSaveSection = async (sectionId: string) => {
    const updates = sectionData[sectionId]
    
    await updateMutation.mutateAsync({
      path: { id: parseInt(serviceId) },
      body: updates,
    })
    
    setUnsavedChanges(prev => {
      const newSet = new Set(prev)
      newSet.delete(sectionId)
      return newSet
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
              {service.status}
            </Badge>
            <Badge variant="outline">
              {service.service_type_info?.display_name}
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
          {unsavedChanges.size > 0 && (
            <Button
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

      {/* Progress Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Completion Status</CardTitle>
          <CardDescription>
            Complete all required sections to publish your service
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      <Accordion 
        type="multiple" 
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-4"
      >
        {visibleSections.map((section) => {
          const SectionComponent = section.component
          const status = sectionStatus[section.id] || "optional"
          const hasChanges = unsavedChanges.has(section.id)

          return (
            <AccordionItem 
              key={section.id} 
              value={section.id}
              className="border rounded-lg"
            >
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    {getSectionIcon(status)}
                    <div className="text-left">
                      <div className="font-medium flex items-center gap-2">
                        {section.title}
                        {hasChanges && (
                          <Badge variant="outline" className="text-xs">
                            Unsaved
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {section.description}
                      </div>
                    </div>
                  </div>
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
  )
}