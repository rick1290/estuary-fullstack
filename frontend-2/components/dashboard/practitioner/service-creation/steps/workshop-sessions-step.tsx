"use client"

import { useState } from "react"
import { useServiceForm } from "@/hooks/use-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  MapPin,
  Users,
  AlertCircle,
  Sparkles,
  CalendarDays
} from "lucide-react"
import { format, addWeeks, parseISO } from "date-fns"
import type { ServiceSessionRequest } from "@/src/client/types.gen"

interface SessionForm extends Partial<ServiceSessionRequest> {
  title: string
  description?: string
  start_time: string
  duration: number
  max_participants?: number
  sequence_number: number
  address?: string
  what_youll_learn?: string
  agenda?: string
}

export function WorkshopSessionsStep() {
  const { formState, updateFormField, errors } = useServiceForm()
  const [sessions, setSessions] = useState<SessionForm[]>(formState.serviceSessions || [])
  const [isGenerating, setIsGenerating] = useState(false)

  const updateSessions = (newSessions: SessionForm[]) => {
    setSessions(newSessions)
    updateFormField("serviceSessions", newSessions)
  }

  const addSession = () => {
    const lastSession = sessions[sessions.length - 1]
    const newSession: SessionForm = {
      title: "",
      description: "",
      start_time: lastSession?.start_time || "",
      duration: formState.duration_minutes || 60,
      max_participants: formState.max_participants || 10,
      sequence_number: sessions.length + 1,
      address: lastSession?.address || "",
      what_youll_learn: "",
      agenda: ""
    }
    updateSessions([...sessions, newSession])
  }

  const updateSession = (index: number, updates: Partial<SessionForm>) => {
    const updatedSessions = [...sessions]
    updatedSessions[index] = { ...updatedSessions[index], ...updates }
    updateSessions(updatedSessions)
  }

  const removeSession = (index: number) => {
    const updatedSessions = sessions.filter((_, i) => i !== index)
    // Resequence
    updatedSessions.forEach((session, i) => {
      session.sequence_number = i + 1
    })
    updateSessions(updatedSessions)
  }

  const moveSession = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sessions.length) return

    const updatedSessions = [...sessions]
    const [movedSession] = updatedSessions.splice(index, 1)
    updatedSessions.splice(newIndex, 0, movedSession)
    
    // Resequence
    updatedSessions.forEach((session, i) => {
      session.sequence_number = i + 1
    })
    updateSessions(updatedSessions)
  }

  const duplicateSession = (index: number) => {
    const sessionToDuplicate = sessions[index]
    const newSession: SessionForm = {
      ...sessionToDuplicate,
      sequence_number: sessions.length + 1,
      title: `${sessionToDuplicate.title} (Copy)`
    }
    updateSessions([...sessions, newSession])
  }

  const generateWeeklySessions = () => {
    if (sessions.length === 0) {
      // Create first session
      addSession()
      return
    }

    setIsGenerating(true)
    const firstSession = sessions[0]
    const baseDate = parseISO(firstSession.start_time)
    const weeksToGenerate = formState.serviceType === 'course' ? 8 : 4 // 8 weeks for course, 4 for workshop series

    const newSessions: SessionForm[] = [firstSession]
    
    for (let week = 1; week < weeksToGenerate; week++) {
      const sessionDate = addWeeks(baseDate, week)
      newSessions.push({
        ...firstSession,
        title: `Week ${week + 1} - ${firstSession.title}`,
        start_time: sessionDate.toISOString().slice(0, 16),
        sequence_number: week + 1
      })
    }
    
    updateSessions(newSessions)
    setIsGenerating(false)
  }

  const isWorkshop = formState.serviceType === 'workshop'
  const isCourse = formState.serviceType === 'course'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {isWorkshop ? "Workshop Sessions" : "Course Schedule"}
        </h2>
        <p className="text-muted-foreground">
          {isWorkshop 
            ? "Define when your workshop sessions will take place. Workshops can be single or multi-session events."
            : "Create a comprehensive course schedule. Courses typically have multiple sessions over several weeks."
          }
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSession}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Session
            </Button>
            {sessions.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateWeeklySessions}
                disabled={isGenerating}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Generate Weekly Series
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session List */}
      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="font-mono">
                        Session {session.sequence_number}
                      </Badge>
                      {session.start_time && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {format(parseISO(session.start_time), "MMM d, yyyy")}
                        </Badge>
                      )}
                      {session.duration && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          {session.duration} min
                        </Badge>
                      )}
                    </div>
                    {session.title && (
                      <h4 className="font-medium text-lg">{session.title}</h4>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveSession(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveSession(index, 'down')}
                      disabled={index === sessions.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => duplicateSession(index)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeSession(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${index}`}>
                      Session Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`title-${index}`}
                      value={session.title}
                      onChange={(e) => updateSession(index, { title: e.target.value })}
                      placeholder={isCourse ? "e.g., Week 1: Introduction" : "e.g., Morning Session"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`datetime-${index}`}>
                      Date & Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`datetime-${index}`}
                      type="datetime-local"
                      value={session.start_time}
                      onChange={(e) => updateSession(index, { start_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`duration-${index}`}>Duration (minutes)</Label>
                    <Input
                      id={`duration-${index}`}
                      type="number"
                      min="15"
                      step="15"
                      value={session.duration}
                      onChange={(e) => updateSession(index, { duration: parseInt(e.target.value) || 60 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants-${index}`}>
                      <Users className="inline h-4 w-4 mr-1" />
                      Max Participants
                    </Label>
                    <Input
                      id={`participants-${index}`}
                      type="number"
                      min="1"
                      value={session.max_participants}
                      onChange={(e) => updateSession(index, { max_participants: parseInt(e.target.value) || 10 })}
                      placeholder="Inherit from service"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Session Description</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={session.description || ""}
                    onChange={(e) => updateSession(index, { description: e.target.value })}
                    placeholder="Brief overview of what this session covers..."
                    rows={2}
                  />
                </div>

                {isCourse && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`learning-${index}`}>
                        <Sparkles className="inline h-4 w-4 mr-1" />
                        What You'll Learn
                      </Label>
                      <Textarea
                        id={`learning-${index}`}
                        value={session.what_youll_learn || ""}
                        onChange={(e) => updateSession(index, { what_youll_learn: e.target.value })}
                        placeholder="Key takeaways from this session..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`agenda-${index}`}>Session Agenda</Label>
                      <Textarea
                        id={`agenda-${index}`}
                        value={session.agenda || ""}
                        onChange={(e) => updateSession(index, { agenda: e.target.value })}
                        placeholder="Detailed agenda or outline..."
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {(formState.location_type === 'in_person' || formState.location_type === 'hybrid') && (
                  <div className="space-y-2">
                    <Label htmlFor={`address-${index}`}>
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Session Location
                    </Label>
                    <Input
                      id={`address-${index}`}
                      value={session.address || ""}
                      onChange={(e) => updateSession(index, { address: e.target.value })}
                      placeholder="Specific location for this session (if different from main)"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No Sessions Scheduled</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by adding your first session
            </p>
            <Button type="button" onClick={addSession}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Validation Error */}
      {errors.serviceSessions && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.serviceSessions}</AlertDescription>
        </Alert>
      )}

      {/* Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips for scheduling:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            {isWorkshop ? (
              <>
                <li>• Workshops can be single events or short series (2-4 sessions)</li>
                <li>• Consider time zones when scheduling virtual workshops</li>
                <li>• Allow buffer time between sessions for Q&A</li>
              </>
            ) : (
              <>
                <li>• Courses typically run 4-12 weeks with regular sessions</li>
                <li>• Use "Generate Weekly Series" to quickly create a schedule</li>
                <li>• Consider homework/practice time between sessions</li>
                <li>• Include a clear progression from basics to advanced topics</li>
              </>
            )}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}