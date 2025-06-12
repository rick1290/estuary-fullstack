import { Badge } from "@/components/ui/badge"
import { StarIcon, Clock, MapPin, Calendar, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface WorkshopHeaderProps {
  workshop: any
}

export default function WorkshopHeader({ workshop }: WorkshopHeaderProps) {
  return (
    <Card className="overflow-hidden border mb-6">
      <div className="relative">
        {/* Banner image */}
        <div className="w-full h-48 md:h-64 relative">
          <img src={workshop.image || "/placeholder.svg"} alt={workshop.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>

          {/* Categories overlay */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {workshop.categories?.map((category: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-white/90 text-foreground">
                {category}
              </Badge>
            ))}
            <Badge variant="default" className="bg-primary text-primary-foreground">
              Workshop
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{workshop.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{workshop.duration} minutes</span>
          </div>

          {workshop.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{workshop.location}</span>
            </div>
          )}

          {workshop.date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{workshop.date}</span>
            </div>
          )}

          {workshop.experienceLevel && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="capitalize">{workshop.experienceLevel.replace(/_/g, " ")} level</span>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(workshop.rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : i < workshop.rating
                        ? "text-yellow-400 fill-yellow-400 opacity-50"
                        : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span>({workshop.reviewCount} reviews)</span>
          </div>
        </div>

        <p className="text-muted-foreground">{workshop.description}</p>
      </CardContent>
    </Card>
  )
}
