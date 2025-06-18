"use client"

import type React from "react"

import { useState } from "react"
import { useServiceForm } from "@/hooks/use-service-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, FileText, Target } from "lucide-react"

export function LearningGoalsStep() {
  const { formState, updateFormField, validateStep } = useServiceForm()
  const [newGoal, setNewGoal] = useState("")
  const [goals, setGoals] = useState<string[]>(formState.learningGoals || [])

  const addGoal = () => {
    if (newGoal.trim()) {
      const updatedGoals = [...goals, newGoal.trim()]
      setGoals(updatedGoals)
      updateFormField("learningGoals", updatedGoals)
      validateStep("learningGoals")
      setNewGoal("")
    }
  }

  const removeGoal = (index: number) => {
    const updatedGoals = goals.filter((_, i) => i !== index)
    setGoals(updatedGoals)
    updateFormField("learningGoals", updatedGoals)
    validateStep("learningGoals")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addGoal()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Learning Goals & Terms</h2>
        <p className="text-muted-foreground">Define what participants will learn and any specific conditions for your service</p>
      </div>

      {/* Learning Goals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Learning Goals
          </CardTitle>
          <CardDescription>
            What will participants learn or achieve through your service?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="e.g., Develop a daily mindfulness practice"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={addGoal} disabled={!newGoal.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          {goals.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium">Learning Goals</h4>
              <ul className="space-y-2">
                {goals.map((goal, index) => (
                  <li key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                    <span>{goal}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeGoal(index)} aria-label="Remove goal">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-muted/50 p-6 rounded-md text-center">
              <p className="text-muted-foreground">No learning goals added yet.</p>
              <p className="text-sm mt-2">Add goals to help potential clients understand what they'll gain.</p>
            </div>
          )}

          <div className="bg-muted/30 p-4 rounded-md">
            <h4 className="font-medium mb-2">Tips for Effective Learning Goals</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Be specific about what participants will learn or achieve</li>
              <li>Focus on outcomes rather than activities</li>
              <li>Consider both knowledge and skills participants will gain</li>
              <li>Make goals measurable where possible</li>
              <li>Align goals with participant needs and expectations</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Terms & Conditions
          </CardTitle>
          <CardDescription>
            Specify any special terms, conditions, or requirements for this service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="terms-conditions">Service-Specific Terms (Optional)</Label>
            <Textarea
              id="terms-conditions"
              value={formState.terms_conditions || ''}
              onChange={(e) => updateFormField("terms_conditions", e.target.value)}
              placeholder="e.g., 24-hour cancellation policy, required equipment, dress code, health restrictions..."
              rows={6}
              className="resize-none"
            />
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <div>
                <p><strong>What to include:</strong> Cancellation policies, refund terms, required equipment, health restrictions, dress code, arrival instructions, or any other service-specific requirements.</p>
              </div>
            </div>
          </div>

          {/* Common Terms Examples */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Common Terms Examples:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">Cancellation:</p>
                <p className="text-blue-600 dark:text-blue-400">"48-hour cancellation policy. Late cancellations may incur a fee."</p>
              </div>
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">Health Requirements:</p>
                <p className="text-blue-600 dark:text-blue-400">"Please consult your doctor before participating if you have any health conditions."</p>
              </div>
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">Equipment:</p>
                <p className="text-blue-600 dark:text-blue-400">"Bring comfortable clothing and a yoga mat. Props will be provided."</p>
              </div>
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">Arrival:</p>
                <p className="text-blue-600 dark:text-blue-400">"Please arrive 10 minutes early for check-in and setup."</p>
              </div>
            </div>
          </div>

          {/* Character Count */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Clear terms help set proper expectations and avoid misunderstandings</span>
            <span>{formState.terms_conditions?.length || 0} characters</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
