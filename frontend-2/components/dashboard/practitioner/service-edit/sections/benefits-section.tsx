"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  X,
  GripVertical,
  Target,
  BookOpen,
  CheckCircle,
  Sparkles
} from "lucide-react"
import type { ServiceReadable } from "@/src/client/types.gen"
import {
  servicesBenefitsCreateMutation,
  servicesBenefitsDestroyMutation,
  servicesAgendaCreateMutation,
  servicesAgendaDestroyMutation,
  servicesRetrieveOptions
} from "@/src/client/@tanstack/react-query.gen"
import { toast } from "sonner"

interface BenefitsSectionProps {
  service: ServiceReadable
  data: {
    what_youll_learn?: string
    prerequisites?: string
    includes?: string | string[]
  }
  onChange: (data: any) => void
  onSave: () => void
  hasChanges: boolean
  isSaving: boolean
}

export function BenefitsSection({
  service,
  data,
  onChange,
  onSave,
  hasChanges,
  isSaving
}: BenefitsSectionProps) {
  const queryClient = useQueryClient()
  const [localData, setLocalData] = useState(data)
  const [includesList, setIncludesList] = useState<string[]>([])
  const [newIncludeItem, setNewIncludeItem] = useState("")
  const [newBenefit, setNewBenefit] = useState({ title: "", description: "" })
  const [newAgendaItem, setNewAgendaItem] = useState({ title: "", description: "", order: 0 })

  useEffect(() => {
    setLocalData(data)
    // Parse includes list from array
    if (Array.isArray(data.includes)) {
      setIncludesList(data.includes)
    } else if (data.includes && typeof data.includes === 'string') {
      // Handle legacy string data - split by newlines
      setIncludesList(data.includes.split('\n').filter(item => item.trim()))
    } else {
      setIncludesList([])
    }
  }, [data])

  // Mutations for benefits
  const createBenefitMutation = useMutation({
    ...servicesBenefitsCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicesRetrieveOptions({ path: { id: service.id! } }).queryKey
      })
      toast.success("Benefit added")
      setNewBenefit({ title: "", description: "" })
    },
    onError: () => {
      toast.error("Failed to add benefit")
    }
  })

  const deleteBenefitMutation = useMutation({
    ...servicesBenefitsDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicesRetrieveOptions({ path: { id: service.id! } }).queryKey
      })
      toast.success("Benefit removed")
    },
    onError: () => {
      toast.error("Failed to remove benefit")
    }
  })

  // Mutations for agenda items
  const createAgendaMutation = useMutation({
    ...servicesAgendaCreateMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicesRetrieveOptions({ path: { id: service.id! } }).queryKey
      })
      toast.success("Agenda item added")
      setNewAgendaItem({ title: "", description: "", order: 0 })
    },
    onError: () => {
      toast.error("Failed to add agenda item")
    }
  })

  const deleteAgendaMutation = useMutation({
    ...servicesAgendaDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicesRetrieveOptions({ path: { id: service.id! } }).queryKey
      })
      toast.success("Agenda item removed")
    },
    onError: () => {
      toast.error("Failed to remove agenda item")
    }
  })

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const addIncludeItem = () => {
    if (newIncludeItem.trim()) {
      const updatedList = [...includesList, newIncludeItem.trim()]
      setIncludesList(updatedList)
      handleChange('includes', updatedList)
      setNewIncludeItem("")
    }
  }

  const removeIncludeItem = (index: number) => {
    const updatedList = includesList.filter((_, i) => i !== index)
    setIncludesList(updatedList)
    handleChange('includes', updatedList.length > 0 ? updatedList : null)
  }

  const addBenefit = () => {
    if (newBenefit.title && newBenefit.description) {
      createBenefitMutation.mutate({
        path: { id: service.id! },
        body: {
          title: newBenefit.title,
          description: newBenefit.description,
          order: service.benefits?.length || 0
        }
      })
    }
  }

  const removeBenefit = (id: number) => {
    deleteBenefitMutation.mutate({
      path: {
        id: service.id!,
        benefit_id: id
      }
    })
  }

  const addAgendaItem = () => {
    if (newAgendaItem.title) {
      createAgendaMutation.mutate({
        path: { id: service.id! },
        body: {
          title: newAgendaItem.title,
          description: newAgendaItem.description || undefined,
          order: service.agenda_items?.length || 0
        }
      })
    }
  }

  const removeAgendaItem = (id: number) => {
    deleteAgendaMutation.mutate({
      path: {
        id: service.id!,
        agenda_id: id
      }
    })
  }

  // Check if service type should show agenda items
  const showAgendaItems = service.service_type_code === 'workshop' || service.service_type_code === 'course'

  return (
    <div className="space-y-6">
      {/* What You'll Learn */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            What You'll Learn
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Key takeaways and skills participants will gain
          </p>
        </div>

        <Textarea
          value={localData.what_youll_learn || ""}
          onChange={(e) => handleChange('what_youll_learn', e.target.value)}
          placeholder="Describe what participants will learn from this experience..."
          rows={4}
          className="max-w-2xl"
        />
      </div>

      {/* Prerequisites */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Prerequisites
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            What participants should know or have before joining
          </p>
        </div>
        
        <Textarea
          value={localData.prerequisites || ""}
          onChange={(e) => handleChange('prerequisites', e.target.value)}
          placeholder="E.g., Basic yoga mat, comfortable clothing, no prior experience needed"
          rows={3}
          className="max-w-2xl"
        />
      </div>

      {/* Key Benefits */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Key Benefits
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Highlight the main benefits of your service
          </p>
        </div>

        <div className="space-y-3">
          {(service.benefits || []).map((benefit) => (
            <Card key={benefit.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {benefit.description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBenefit(benefit.id!)}
                  disabled={deleteBenefitMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          <Card className="p-4 border-dashed">
            <div className="space-y-3">
              <Input
                value={newBenefit.title}
                onChange={(e) => setNewBenefit({ ...newBenefit, title: e.target.value })}
                placeholder="Benefit title"
              />
              <Textarea
                value={newBenefit.description}
                onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                placeholder="Describe this benefit"
                rows={2}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addBenefit}
                disabled={!newBenefit.title || !newBenefit.description || createBenefitMutation.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {createBenefitMutation.isPending ? "Adding..." : "Add Benefit"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* What's Included */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            What's Included
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            List everything included with this service
          </p>
        </div>

        <div className="space-y-2">
          {includesList.map((item, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm flex-1">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeIncludeItem(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newIncludeItem}
              onChange={(e) => setNewIncludeItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addIncludeItem()
                }
              }}
              placeholder="Add an item (e.g., Workbook materials, refreshments)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addIncludeItem}
              disabled={!newIncludeItem.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Agenda Items (for workshops and courses) */}
      {showAgendaItems && (
        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Session Agenda
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Outline the agenda or curriculum for your {service.service_type_code}
            </p>
          </div>

          <div className="space-y-3">
            {(service.agenda_items || []).map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <h4 className="font-medium">{item.title}</h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2 ml-8">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAgendaItem(item.id!)}
                    disabled={deleteAgendaMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            <Card className="p-4 border-dashed">
              <div className="space-y-3">
                <Input
                  value={newAgendaItem.title}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                  placeholder="Agenda item title"
                />
                <Textarea
                  value={newAgendaItem.description || ""}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAgendaItem}
                  disabled={!newAgendaItem.title || createAgendaMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createAgendaMutation.isPending ? "Adding..." : "Add Agenda Item"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      )}
    </div>
  )
}