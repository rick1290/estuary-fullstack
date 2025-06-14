"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Download, Calendar, Clock, CheckCircle, MessageSquare, FileText } from "lucide-react"
import { SessionFeedbackForm } from "./session-feedback-form"

interface SessionCompletionScreenProps {
  sessionId: string
  sessionType: "one-on-one" | "workshop" | "course"
  title: string
  practitioner: {
    id: string
    name: string
    image?: string
  }
  duration: number // in minutes
  hasRecording?: boolean
  hasResources?: boolean
  isSeriesSession?: boolean
  nextSessionDate?: string
  role: "practitioner" | "client"
}

export function SessionCompletionScreen({
  sessionId,
  sessionType,
  title,
  practitioner,
  duration,
  hasRecording = false,
  hasResources = false,
  isSeriesSession = false,
  nextSessionDate,
  role,
}: SessionCompletionScreenProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("summary")
  const isPractitioner = role === "practitioner"

  const handleBookFollowUp = () => {
    router.push(`/practitioners/${practitioner.id}`)
  }

  const handleReturnToDashboard = () => {
    router.push(isPractitioner ? "/dashboard/practitioner" : "/dashboard/user")
  }

  const handleViewBookings = () => {
    router.push(isPractitioner ? "/dashboard/practitioner/bookings" : "/dashboard/user/bookings")
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="w-full shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Session Complete</CardTitle>
            <CardDescription>{title}</CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              {!isPractitioner && <TabsTrigger value="feedback">Feedback</TabsTrigger>}
              {hasResources && <TabsTrigger value="resources">Resources</TabsTrigger>}
            </TabsList>

            <TabsContent value="summary" className="px-6 py-4">
              <div className="flex items-start gap-4 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={practitioner.image || "/placeholder.svg"} alt={practitioner.name} />
                  <AvatarFallback>{practitioner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{practitioner.name}</h3>
                  <Badge variant="outline" className="mt-1">
                    {sessionType === "one-on-one"
                      ? "1-on-1 Session"
                      : sessionType === "workshop"
                        ? "Workshop"
                        : "Course"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-muted-foreground mr-2" />
                  <span>Duration: {duration} minutes</span>
                </div>

                {hasRecording && (
                  <Button variant="outline" className="flex w-full gap-2">
                    <Download className="h-4 w-4" />
                    <span>Download Recording</span>
                  </Button>
                )}
              </div>

              {isSeriesSession && nextSessionDate && (
                <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Next Session
                  </h4>
                  <p className="text-sm">{nextSessionDate}</p>
                  <Button variant="link" className="px-0 mt-1" onClick={handleViewBookings}>
                    View all scheduled sessions
                  </Button>
                </div>
              )}

              <Separator className="my-6" />

              <div className="flex flex-col gap-4">
                {!isPractitioner && !isSeriesSession && (
                  <Button onClick={handleBookFollowUp}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Follow-up Session
                  </Button>
                )}
                <Button variant="outline" onClick={handleReturnToDashboard}>
                  Return to Dashboard
                </Button>
              </div>
            </TabsContent>

            {!isPractitioner && (
              <TabsContent value="feedback">
                <SessionFeedbackForm sessionId={sessionId} practitionerId={practitioner.id} />
              </TabsContent>
            )}

            {hasResources && (
              <TabsContent value="resources" className="px-6 py-4">
                <h3 className="font-medium text-lg mb-4">Session Resources</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="flex w-full justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Session Notes.pdf</span>
                    </div>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="flex w-full justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Meditation Exercise.mp3</span>
                    </div>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="flex w-full justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Helpful Resources.pdf</span>
                    </div>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>

          <CardFooter className="flex justify-center pt-2 pb-6">
            <Button variant="link" className="text-muted-foreground text-sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message {isPractitioner ? "client" : "practitioner"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
