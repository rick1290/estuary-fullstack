"use client"

import { useState } from "react"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Check, 
  Plus, 
  Trash2, 
  
  Star, 
  Heart, 
  Shield, 
  Trophy,
  Zap,
  Calendar,
  Users,
  Clock,
  Target,
  Sparkles,
  AlertCircle
} from "lucide-react"

interface Benefit {
  id: string
  title: string
  description: string
  icon?: string
  order: number
}

const availableIcons = [
  { value: "check", label: "Check", icon: Check },
  { value: "star", label: "Star", icon: Star },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "shield", label: "Shield", icon: Shield },
  { value: "trophy", label: "Trophy", icon: Trophy },
  { value: "zap", label: "Lightning", icon: Zap },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "users", label: "Users", icon: Users },
  { value: "clock", label: "Clock", icon: Clock },
  { value: "target", label: "Target", icon: Target },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
]

export function BenefitsStep() {
  const { formState, updateFormField } = useServiceForm()
  const [editingBenefit, setEditingBenefit] = useState<Partial<Benefit>>({
    title: "",
    description: "",
    icon: "check",
  })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const benefits = formState.benefits || []

  const handleAddBenefit = () => {
    if (!editingBenefit.title?.trim()) return

    const newBenefit: Benefit = {
      id: editingId || Date.now().toString(),
      title: editingBenefit.title,
      description: editingBenefit.description || "",
      icon: editingBenefit.icon || "check",
      order: editingId ? benefits.find(b => b.id === editingId)?.order || benefits.length : benefits.length,
    }

    let updatedBenefits = [...benefits]
    
    if (editingId) {
      updatedBenefits = updatedBenefits.map(b => 
        b.id === editingId ? newBenefit : b
      )
    } else {
      updatedBenefits.push(newBenefit)
    }

    updateFormField("benefits", updatedBenefits)
    resetForm()
  }

  const handleRemoveBenefit = (id: string) => {
    const updatedBenefits = benefits
      .filter(b => b.id !== id)
      .map((b, index) => ({ ...b, order: index }))
    updateFormField("benefits", updatedBenefits)
  }

  const handleEditBenefit = (benefit: Benefit) => {
    setEditingBenefit({
      title: benefit.title,
      description: benefit.description,
      icon: benefit.icon,
    })
    setEditingId(benefit.id)
    setIsAdding(true)
  }

  const resetForm = () => {
    setEditingBenefit({ title: "", description: "", icon: "check" })
    setIsAdding(false)
    setEditingId(null)
  }

  const moveBenefit = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= benefits.length) return

    const items = [...benefits]
    const [movedItem] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, movedItem)

    const updatedBenefits = items.map((item, index) => ({
      ...item,
      order: index,
    }))

    updateFormField("benefits", updatedBenefits)
  }

  const getIconComponent = (iconName?: string) => {
    const iconConfig = availableIcons.find(i => i.value === iconName)
    const Icon = iconConfig?.icon || Check
    return <Icon className="h-5 w-5" />
  }

  const suggestedBenefits = {
    session: [
      { title: "Personalized Attention", description: "One-on-one focus tailored to your needs" },
      { title: "Flexible Scheduling", description: "Book at times that work for you" },
      { title: "Progress Tracking", description: "Monitor your journey and celebrate wins" },
    ],
    workshop: [
      { title: "Small Group Setting", description: "Limited spots for personalized guidance" },
      { title: "Interactive Learning", description: "Hands-on practice with expert feedback" },
      { title: "Community Connection", description: "Meet like-minded individuals" },
    ],
    course: [
      { title: "Structured Curriculum", description: "Progressive learning path" },
      { title: "Lifetime Access", description: "Review materials anytime" },
      { title: "Certificate of Completion", description: "Recognize your achievement" },
    ],
    bundle: [
      { title: "Bulk Savings", description: "Save compared to individual sessions" },
      { title: "Extended Validity", description: "Use credits at your own pace" },
      { title: "Priority Booking", description: "First access to popular time slots" },
    ],
    package: [
      { title: "Complete Solution", description: "Everything you need in one package" },
      { title: "Curated Experience", description: "Thoughtfully combined services" },
      { title: "Better Value", description: "Save compared to booking separately" },
    ],
  }

  const suggestions = suggestedBenefits[formState.serviceType as keyof typeof suggestedBenefits] || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Benefits</h2>
        <p className="text-muted-foreground">
          Highlight what makes your {formState.serviceType} special. Benefits help customers understand the value they'll receive.
        </p>
      </div>

      {/* Current Benefits */}
      {benefits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Benefits</CardTitle>
            <CardDescription>
              Use arrows to reorder. The first 3-5 benefits are most important.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveBenefit(index, 'up')}
                      disabled={index === 0}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-muted-foreground"
                      >
                        <path
                          d="M6 3L2 7H10L6 3Z"
                          fill="currentColor"
                        />
                      </svg>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveBenefit(index, 'down')}
                      disabled={index === benefits.length - 1}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-muted-foreground"
                      >
                        <path
                          d="M6 9L10 5H2L6 9Z"
                          fill="currentColor"
                        />
                      </svg>
                    </Button>
                  </div>
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    {getIconComponent(benefit.icon)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{benefit.title}</h4>
                    {benefit.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {benefit.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBenefit(benefit)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveBenefit(benefit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Benefit Form */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit" : "Add"} Benefit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="benefitTitle">Benefit Title</Label>
              <Input
                id="benefitTitle"
                value={editingBenefit.title}
                onChange={(e) => setEditingBenefit({ ...editingBenefit, title: e.target.value })}
                placeholder="e.g., Personalized Attention"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="benefitDescription">Description (optional)</Label>
              <Textarea
                id="benefitDescription"
                value={editingBenefit.description}
                onChange={(e) => setEditingBenefit({ ...editingBenefit, description: e.target.value })}
                placeholder="Brief explanation of this benefit..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {availableIcons.map((iconOption) => {
                  const Icon = iconOption.icon
                  return (
                    <button
                      key={iconOption.value}
                      type="button"
                      onClick={() => setEditingBenefit({ ...editingBenefit, icon: iconOption.value })}
                      className={`p-3 rounded-lg border transition-colors ${
                        editingBenefit.icon === iconOption.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      title={iconOption.label}
                    >
                      <Icon className="h-5 w-5 mx-auto" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAddBenefit}
                disabled={!editingBenefit.title?.trim()}
              >
                {editingId ? "Update" : "Add"} Benefit
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Benefit
        </Button>
      )}

      {/* Suggestions */}
      {benefits.length === 0 && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Benefits</CardTitle>
            <CardDescription>
              Click to add these common benefits for {formState.serviceType}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left h-auto p-4"
                  onClick={() => {
                    const newBenefit: Benefit = {
                      id: Date.now().toString(),
                      title: suggestion.title,
                      description: suggestion.description,
                      icon: "check",
                      order: benefits.length,
                    }
                    updateFormField("benefits", [...benefits, newBenefit])
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Practices */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips for effective benefits:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Focus on outcomes and value, not just features</li>
            <li>• Keep titles concise and descriptions brief</li>
            <li>• Order by importance - put the best benefits first</li>
            <li>• Use 3-7 benefits for optimal impact</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}