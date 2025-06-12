import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Star, User, CheckCircle } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"

interface PractitionerHeaderProps {
  practitioner: Practitioner
}

export default function PractitionerHeader({ practitioner }: PractitionerHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <Avatar className="h-[124px] w-[124px] rounded-md border">
          <AvatarImage
            src={practitioner.profile_image_url || "/placeholder.svg?height=400&width=400&query=practitioner"}
            alt={practitioner.display_name}
          />
          <AvatarFallback className="rounded-md">{practitioner.display_name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{practitioner.display_name}</h1>
            {practitioner.is_verified && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          <h2 className="text-lg text-muted-foreground">{practitioner.title}</h2>

          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{practitioner.completed_sessions} Sessions</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{practitioner.years_of_experience}+ Years</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" />
              <span>
                {practitioner.average_rating_float} ({practitioner.total_reviews} reviews)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{practitioner.locations.find((loc) => loc.is_primary)?.city_name || "Multiple locations"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
