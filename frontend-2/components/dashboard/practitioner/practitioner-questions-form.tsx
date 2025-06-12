"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Save, CheckCircle, Plus, Pencil, Trash2, MoveUp, MoveDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/ui/loading-spinner"

interface Question {
  id: string
  question: string
  answer: string
  order: number
}

// Mock function to get practitioner questions
const getPractitionerQuestions = async () => {
  // In a real app, this would fetch from an API
  return [
    {
      id: "q1",
      question: "What inspired you to become a wellness practitioner?",
      answer:
        "After experiencing my own health transformation, I became passionate about helping others achieve their wellness goals through holistic approaches.",
      order: 1,
    },
    {
      id: "q2",
      question: "What can clients expect in their first session with you?",
      answer:
        "In our first session, we'll discuss your goals, health history, and current challenges. I'll listen carefully to understand your needs and together we'll create a personalized plan.",
      order: 2,
    },
    {
      id: "q3",
      question: "How do you approach clients with different wellness goals?",
      answer:
        "I believe in personalized care. I adapt my approach based on each client's unique needs, preferences, and goals. There's no one-size-fits-all in wellness.",
      order: 3,
    },
  ]
}

interface PractitionerQuestionsFormProps {
  isOnboarding?: boolean
}

export default function PractitionerQuestionsForm({ isOnboarding = false }: PractitionerQuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // Form states
  const [questionText, setQuestionText] = useState("")
  const [answerText, setAnswerText] = useState("")

  const { toast } = useToast()

  // Load practitioner questions
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getPractitionerQuestions()
        setQuestions(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load practitioner questions:", error)
        toast({
          title: "Error",
          description: "Failed to load your questions. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  // Save all changes
  const saveChanges = async () => {
    setIsSaving(true)
    try {
      // In a real app, this would send data to an API
      console.log("Saving questions:", questions)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      toast({
        title: "Questions Updated",
        description: "Your questions have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save questions:", error)
      toast({
        title: "Error",
        description: "Failed to save your questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add or update question
  const saveQuestion = () => {
    if (!questionText || !answerText) {
      toast({
        title: "Missing Information",
        description: "Please fill in both the question and answer fields.",
        variant: "destructive",
      })
      return
    }

    if (editingQuestion) {
      // Update existing question
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingQuestion.id ? { ...q, question: questionText, answer: answerText } : q)),
      )
    } else {
      // Add new question
      const newQuestion: Question = {
        id: `q-${Date.now()}`,
        question: questionText,
        answer: answerText,
        order: questions.length + 1,
      }
      setQuestions((prev) => [...prev, newQuestion])
    }

    // Reset form and close dialog
    setQuestionText("")
    setAnswerText("")
    setEditingQuestion(null)
    setDialogOpen(false)
  }

  // Edit question
  const editQuestion = (question: Question) => {
    setEditingQuestion(question)
    setQuestionText(question.question)
    setAnswerText(question.answer)
    setDialogOpen(true)
  }

  // Delete question
  const deleteQuestion = (id: string) => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== id)
      // Update order values
      return filtered.map((q, i) => ({ ...q, order: i + 1 }))
    })
    toast({
      title: "Question Removed",
      description: "The question has been removed.",
    })
  }

  // Move question up in order
  const moveQuestionUp = (index: number) => {
    if (index <= 0) return
    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index - 1]
    newQuestions[index - 1] = temp

    // Update order values
    newQuestions.forEach((q, i) => {
      q.order = i + 1
    })

    setQuestions(newQuestions)
  }

  // Move question down in order
  const moveQuestionDown = (index: number) => {
    if (index >= questions.length - 1) return
    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index + 1]
    newQuestions[index + 1] = temp

    // Update order values
    newQuestions.forEach((q, i) => {
      q.order = i + 1
    })

    setQuestions(newQuestions)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {!isOnboarding && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Common Questions</h2>
          <p className="text-muted-foreground">Answer frequently asked questions from potential clients.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Questions & Answers</CardTitle>
          <CardDescription>
            These questions and answers will be displayed on your public profile to help potential clients learn more
            about you and your practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q, index) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.order}</TableCell>
                    <TableCell className="max-w-xs truncate">{q.question}</TableCell>
                    <TableCell className="max-w-sm truncate">{q.answer}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveQuestionUp(index)}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveQuestionDown(index)}
                          disabled={index === questions.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => editQuestion(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No questions added yet.</div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setEditingQuestion(null)
                  setQuestionText("")
                  setAnswerText("")
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
                <DialogDescription>
                  Add a question and answer that will help potential clients understand your practice better.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g., What can clients expect in their first session with you?"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea
                    id="answer"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Provide a detailed answer to the question..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveQuestion}>{editingQuestion ? "Update" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveChanges} disabled={isSaving}>
          {isSaving ? (
            <>Saving...</>
          ) : showSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
