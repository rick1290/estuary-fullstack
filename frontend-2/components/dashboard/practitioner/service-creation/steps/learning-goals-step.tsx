"use client"

import type React from "react"

import { useState } from "react"
import { useServiceForm } from "@/hooks/use-service-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"

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
        <h2 className="text-xl font-semibold mb-2">Learning Goals</h2>
        <p className="text-muted-foreground">Define what participants will learn or achieve through your service</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
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
                <h3 className="font-medium">Learning Goals</h3>
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
              <h3 className="font-medium mb-2">Tips for Effective Learning Goals</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Be specific about what participants will learn or achieve</li>
                <li>Focus on outcomes rather than activities</li>
                <li>Consider both knowledge and skills participants will gain</li>
                <li>Make goals measurable where possible</li>
                <li>Align goals with participant needs and expectations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
