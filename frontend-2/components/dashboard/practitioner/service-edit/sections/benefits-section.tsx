"use client"

import { useState, useEffect } from "react"
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

// Includes is now just a text field
// Benefits and agenda items are stored separately in the API

interface BenefitsSectionProps {
  service: ServiceReadable
  data: {
    what_youll_learn?: string
    prerequisites?: string
    includes?: string
    benefits?: Array<any>
    agenda_items?: Array<any>
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
  const [localData, setLocalData] = useState(data)
  const [learningGoals, setLearningGoals] = useState<string[]>([])
  const [newGoal, setNewGoal] = useState("")
  const [newBenefit, setNewBenefit] = useState({ title: "", description: "" })
  const [newAgendaItem, setNewAgendaItem] = useState({ title: "", description: "", duration_minutes: 0 })

  // Parse includes data - backend stores as JSON array, display as newline-separated text
  const includesText = Array.isArray(localData.includes) 
    ? localData.includes.join('\n') 
    : (typeof localData.includes === 'string' ? localData.includes : '')

  useEffect(() => {
    setLocalData(data)
    // Parse learning goals from string
    if (data.what_youll_learn) {
      const goals = data.what_youll_learn.split('\n').filter(g => g.trim())
      setLearningGoals(goals)
    }
  }, [data])

  const handleChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    onChange(newData)
  }

  const updateIncludesText = (text: string) => {
    // Convert text to array format for JSON field
    const includesArray = text.split('\n').filter(item => item.trim()).map(item => item.trim())
    handleChange('includes', includesArray.length > 0 ? includesArray : null)
  }

  const addLearningGoal = () => {
    if (newGoal.trim()) {
      const updatedGoals = [...learningGoals, newGoal.trim()]
      setLearningGoals(updatedGoals)
      handleChange('what_youll_learn', updatedGoals.join('\n'))
      setNewGoal("")
    }
  }

  const removeLearningGoal = (index: number) => {
    const updatedGoals = learningGoals.filter((_, i) => i !== index)
    setLearningGoals(updatedGoals)
    handleChange('what_youll_learn', updatedGoals.join('\n'))
  }

  const addBenefit = () => {
    if (newBenefit.title && newBenefit.description) {
      const currentBenefits = localData.benefits || []
      const benefit = {
        id: Date.now().toString(),
        ...newBenefit,
        order: currentBenefits.length
      }
      handleChange('benefits', [...currentBenefits, benefit])
      setNewBenefit({ title: "", description: "" })
    }
  }

  const removeBenefit = (id: string | number | undefined) => {
    const currentBenefits = localData.benefits || []
    handleChange('benefits', currentBenefits.filter(b => b.id !== id))
  }

  const addAgendaItem = () => {
    if (newAgendaItem.title) {
      const currentItems = localData.agenda_items || []
      const item = {
        id: Date.now().toString(),
        ...newAgendaItem,
        order: currentItems.length
      }
      handleChange('agenda_items', [...currentItems, item])
      setNewAgendaItem({ title: "", description: "", duration_minutes: 0 })
    }
  }

  const removeAgendaItem = (id: string | number | undefined) => {
    const currentItems = localData.agenda_items || []
    handleChange('agenda_items', currentItems.filter(item => item.id !== id))
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

        <div className="space-y-2">
          {learningGoals.map((goal, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm flex-1">{goal}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLearningGoal(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="flex gap-2">
            <Input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addLearningGoal()
                }
              }}
              placeholder="Add a learning outcome"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addLearningGoal}
              disabled={!newGoal.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
          {(localData.benefits || []).map((benefit) => (
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
                  onClick={() => removeBenefit(benefit.id)}
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
                disabled={!newBenefit.title || !newBenefit.description}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Benefit
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* What's Included */}
      <div className="space-y-4">
        <div>
          <Label>What's Included</Label>
          <p className="text-sm text-muted-foreground mt-1">
            List everything included with this service
          </p>
        </div>
        
        <Textarea
          value={includesText}
          onChange={(e) => updateIncludesText(e.target.value)}
          placeholder="E.g., Workbook materials, access to online resources, post-session support, refreshments"
          rows={4}
          className="max-w-2xl"
        />
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
            {(localData.agenda_items || []).map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <h4 className="font-medium">{item.title}</h4>
                      {item.duration_minutes ? (
                        <span className="text-sm text-muted-foreground">
                          ({item.duration_minutes} min)
                        </span>
                      ) : null}
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
                    onClick={() => removeAgendaItem(item.id)}
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
                <Input
                  type="number"
                  value={newAgendaItem.duration_minutes || ""}
                  onChange={(e) => setNewAgendaItem({ ...newAgendaItem, duration_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="Duration in minutes (optional)"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAgendaItem}
                  disabled={!newAgendaItem.title}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agenda Item
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