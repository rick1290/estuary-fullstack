import { Badge } from "@/components/ui/badge"
import { StarIcon, Clock, MapPin } from "lucide-react"

interface SessionHeaderProps {
  session: any
}

export default function SessionHeader({ session }: SessionHeaderProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div className="relative h-48 md:h-64 w-full bg-muted">
        <img
          src={session.image || "/placeholder.svg?height=400&width=800&query=meditation+session"}
          alt={session.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex flex-wrap gap-1 mb-2">
            {session.categories?.map((category: string, index: number) => (
              <Badge key={index} variant="secondary" className="bg-white/20 text-white border-none">
                {category}
              </Badge>
            ))}
            <Badge variant="secondary" className="bg-primary/90 text-white border-none">
              {session.type.replace("-", " ")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 bg-card">
        <h1 className="text-2xl font-bold mb-2">{session.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{session.duration} minutes</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{session.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(session.rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : i < session.rating
                        ? "text-yellow-400 fill-yellow-400 opacity-50"
                        : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span>({session.reviewCount} reviews)</span>
          </div>
        </div>

        <p className="text-muted-foreground">{session.description}</p>
      </div>
    </div>
  )
}
