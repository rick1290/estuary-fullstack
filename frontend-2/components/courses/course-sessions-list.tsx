import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"

interface CourseSessionsListProps {
  sessions: any[]
}

export default function CourseSessionsList({ sessions }: CourseSessionsListProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Course Schedule</CardTitle>
        <p className="text-sm text-muted-foreground">
          This course includes {sessions.length} sessions. Each session builds on the previous one to create a
          comprehensive learning experience.
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {sessions.map((session, index) => (
          <Accordion
            key={session.id}
            type="single"
            collapsible
            defaultValue={index === 0 ? `item-${index}` : undefined}
          >
            <AccordionItem value={`item-${index}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-col items-start text-left">
                  <div className="font-medium">
                    Session {index + 1}: {session.title}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {session.date}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {session.startTime} - {session.endTime}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-4">{session.description}</p>

                <h4 className="font-medium mb-2">Agenda:</h4>
                <ul className="pl-5 space-y-1">
                  {session.agenda.map((item: string, i: number) => (
                    <li key={i} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  )
}
