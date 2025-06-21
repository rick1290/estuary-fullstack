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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  practitionersMyProfileRetrieveOptions,
  practitionersQuestionsRetrieveOptions,
  practitionersQuestionsCreateMutation,
  practitionersQuestionsUpdateMutation,
  practitionersQuestionsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"

// Define Question type based on actual API structure
interface Question {
  id: number
  title: string
  order: number
}


interface PractitionerQuestionsFormProps {
  isOnboarding?: boolean
}

export default function PractitionerQuestionsForm({ isOnboarding = false }: PractitionerQuestionsFormProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [questionText, setQuestionText] = useState("")

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch practitioner profile to get ID
  const { data: practitioner } = useQuery(practitionersMyProfileRetrieveOptions())
  
  // Fetch questions
  const { data: questionsData, isLoading, refetch: refetchQuestions } = useQuery({
    ...practitionersQuestionsRetrieveOptions({ path: { id: practitioner?.id || "" } }),
    enabled: !!practitioner?.id
  })

  // Ensure data is always an array - handle both direct arrays and paginated responses
  const questions = Array.isArray(questionsData) ? questionsData : 
                   (questionsData?.results && Array.isArray(questionsData.results)) ? questionsData.results : []

  // Utility function to refresh all data
  const refreshAllData = () => {
    refetchQuestions()
    queryClient.invalidateQueries()
  }

  // Setup mutations
  const createQuestionMutation = useMutation({
    ...practitionersQuestionsCreateMutation(),
    onSuccess: () => {
      refreshAllData()
      toast({
        title: "Question Added",
        description: "Your question has been added successfully.",
      })
    }
  })

  const updateQuestionMutation = useMutation({
    ...practitionersQuestionsUpdateMutation(),
    onSuccess: () => {
      refreshAllData()
      toast({
        title: "Question Updated",
        description: "Your question has been updated successfully.",
      })
    }
  })

  const deleteQuestionMutation = useMutation({
    ...practitionersQuestionsDestroyMutation(),
    onSuccess: () => {
      refreshAllData()
      toast({
        title: "Question Removed",
        description: "The question has been removed.",
      })
    }
  })

  // Add or update question
  const saveQuestion = async () => {
    if (!questionText || !practitioner?.id) {
      toast({
        title: "Missing Information",
        description: "Please fill in the question field.",
        variant: "destructive",
      })
      return
    }

    const questionData = {
      title: questionText,
      order: editingQuestion ? editingQuestion.order : questions.length + 1
    }

    if (editingQuestion) {
      // Update existing question
      updateQuestionMutation.mutate({
        path: { id: practitioner.id, question_id: editingQuestion.id },
        body: questionData
      })
    } else {
      // Add new question
      createQuestionMutation.mutate({
        path: { id: practitioner.id },
        body: questionData
      })
    }

    // Reset form and close dialog
    setQuestionText("")
    setEditingQuestion(null)
    setDialogOpen(false)
  }

  // Edit question
  const editQuestion = (question: Question) => {
    setEditingQuestion(question)
    setQuestionText(question.title)
    setDialogOpen(true)
  }

  // Delete question
  const deleteQuestion = (id: string | number) => {
    if (!practitioner?.id) return
    deleteQuestionMutation.mutate({
      path: { id: practitioner.id, question_id: id.toString() }
    })
  }

  // Move question up in order
  const moveQuestionUp = async (index: number) => {
    if (index <= 0 || !practitioner?.id) return
    const q1 = questions[index]
    const q2 = questions[index - 1]
    
    // Update both questions with swapped order values
    await updateQuestionMutation.mutateAsync({
      path: { id: practitioner.id, question_id: q1.id },
      body: { title: q1.title, order: q2.order }
    })
    await updateQuestionMutation.mutateAsync({
      path: { id: practitioner.id, question_id: q2.id },
      body: { title: q2.title, order: q1.order }
    })
    
    refreshAllData()
  }

  // Move question down in order
  const moveQuestionDown = async (index: number) => {
    if (index >= questions.length - 1 || !practitioner?.id) return
    const q1 = questions[index]
    const q2 = questions[index + 1]
    
    // Update both questions with swapped order values
    await updateQuestionMutation.mutateAsync({
      path: { id: practitioner.id, question_id: q1.id },
      body: { title: q1.title, order: q2.order }
    })
    await updateQuestionMutation.mutateAsync({
      path: { id: practitioner.id, question_id: q2.id },
      body: { title: q2.title, order: q1.order }
    })
    
    refreshAllData()
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q, index) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.order}</TableCell>
                    <TableCell className="max-w-md">{q.title}</TableCell>
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
                  Add a common question that will help potential clients understand your practice better.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="question">Question</Label>
                  <Textarea
                    id="question"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g., What can clients expect in their first session with you?"
                    className="min-h-[100px]"
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

    </div>
  )
}
