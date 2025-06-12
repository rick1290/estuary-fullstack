import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface WorkshopAgendaProps {
  agenda: any[]
}

export default function WorkshopAgenda({ agenda }: WorkshopAgendaProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Workshop Agenda</CardTitle>
        <p className="text-sm text-muted-foreground">Here's what you can expect during this workshop:</p>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="relative pl-6 border-l border-border">
          {agenda.map((item, index) => (
            <div key={index} className="mb-6 relative">
              <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary"></div>
              <div className="text-sm text-muted-foreground mb-1">{item.time}</div>
              <h3 className="font-medium mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
