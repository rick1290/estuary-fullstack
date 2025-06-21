import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, DollarSign, Users } from "lucide-react"

interface ServicePreviewProps {
  data?: any
}

export default function ServicePreview({ data = {} }: ServicePreviewProps) {
  // Provide default empty object if data is undefined
  const serviceType = data?.serviceType || "session"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="outline" className="mb-2">
          {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
        </Badge>
        <h2 className="text-2xl font-bold">{data?.title || "Untitled Service"}</h2>
        <p className="text-muted-foreground">{data?.tagline || "No tagline provided"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-muted-foreground" />
              <div>
                <p className="font-medium">${data?.price || "0"}</p>
                <p className="text-sm text-muted-foreground">Price</p>
              </div>
            </div>

            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
              <div>
                <p className="font-medium">{data?.duration || "60"} minutes</p>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
            </div>

            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
              <div>
                <p className="font-medium">{data?.locationType || "Online"}</p>
                <p className="text-sm text-muted-foreground">Location</p>
              </div>
            </div>

            {data?.maxParticipants && (
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                <div>
                  <p className="font-medium">{data.maxParticipants} participants</p>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{data?.description || "No description provided."}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {data?.benefits && Array.isArray(data.benefits) && data.benefits.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Benefits</h3>
          <ul className="list-disc pl-5 space-y-1">
            {data.benefits.map((benefit: any, index: number) => (
              <li key={index} className="text-sm">
                {typeof benefit === 'string' ? benefit : benefit.title}
                {typeof benefit === 'object' && benefit.description && (
                  <span className="text-muted-foreground ml-1">- {benefit.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
